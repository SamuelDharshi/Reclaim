import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { diagnose } from '@/lib/diagnosis'
import { createAuditEntry } from '@/lib/audit'
import type { RawEventData } from '@/lib/types'

export async function POST() {
  try {
    // Get all events in 'detected' status
    const detectedEvents = await prisma.revenueEvent.findMany({
      where: { status: 'detected' },
    })

    let diagnosed = 0

    for (const event of detectedEvents) {
      // Parse raw error if available
      let rawError: Record<string, unknown> = {}
      try {
        rawError = event.rawError ? JSON.parse(event.rawError) : {}
      } catch {
        rawError = {}
      }

      const rawEventData: RawEventData = {
        type: event.type as RawEventData['type'],
        errorSource: (rawError.error_source as string) ?? null,
        errorStep: (rawError.error_step as string) ?? null,
        errorReason: (rawError.error_reason as string) ?? null,
        errorCode: (rawError.error_code as string) ?? null,
        amount: event.amount,
      }

      // Run diagnosis rules
      const { rule } = diagnose(rawEventData)

      // Create RootCause record
      await prisma.rootCause.upsert({
        where: { eventId: event.id },
        create: {
          eventId: event.id,
          category: rule.category,
          confidence: rule.confidence,
          ruleFired: rule.id,
          proposedAction: rule.proposedAction,
          classifiedAt: new Date(),
        },
        update: {
          category: rule.category,
          confidence: rule.confidence,
          ruleFired: rule.id,
          proposedAction: rule.proposedAction,
        },
      })

      // Update event status
      await prisma.revenueEvent.update({
        where: { id: event.id },
        data: { status: 'diagnosed' },
      })

      // Create audit entry
      await createAuditEntry({
        eventId: event.id,
        actor: 'agent',
        decision: 'DIAGNOSED',
        reason: `category=${rule.category} confidence=${rule.confidence.toFixed(2)} rule=${rule.id} proposedAction=${rule.proposedAction}`,
      })

      diagnosed++
    }

    return NextResponse.json({ success: true, diagnosed })
  } catch (err) {
    console.error('diagnose error:', err)
    return NextResponse.json(
      { error: 'Diagnosis failed', details: String(err) },
      { status: 500 }
    )
  }
}
