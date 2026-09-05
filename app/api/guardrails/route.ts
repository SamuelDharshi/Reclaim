import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runGuardrailChecks, getGuardrailConfig } from '@/lib/guardrails'
import { createAuditEntry } from '@/lib/audit'

export async function POST() {
  try {
    // Get all events in 'diagnosed' status
    const diagnosedEvents = await prisma.revenueEvent.findMany({
      where: { status: 'diagnosed' },
      include: { rootCause: true },
    })

    let approved = 0
    let blocked = 0
    let escalated = 0

    for (const event of diagnosedEvents) {
      if (!event.rootCause) continue

      const config = await getGuardrailConfig(event.merchantId)

      // Run all guardrail checks
      const result = await runGuardrailChecks({
        eventId: event.id,
        merchantId: event.merchantId,
        amount: event.amount,
        eventType: event.type,
        customerId: event.customerId,
        proposedAction: event.rootCause.proposedAction,
        config,
      })

      const guardrailResultJson = JSON.stringify(result)

      if (result.passed) {
        // Create approved intervention
        await prisma.intervention.create({
          data: {
            eventId: event.id,
            proposedAction: event.rootCause.proposedAction,
            channel: getChannelForAction(event.rootCause.proposedAction),
            requiresHuman: false,
            guardrailResult: guardrailResultJson,
          },
        })

        // Update event status to executing
        await prisma.revenueEvent.update({
          where: { id: event.id },
          data: { status: 'executing' },
        })

        await createAuditEntry({
          eventId: event.id,
          actor: 'guardrail',
          decision: 'GUARDRAIL_PASS',
          reason: `All guardrail checks passed. action=${event.rootCause.proposedAction} amount=₹${(event.amount / 100).toFixed(0)}`,
        })

        approved++
      } else if (result.requiresHuman) {
        // Escalate to human
        await prisma.intervention.create({
          data: {
            eventId: event.id,
            proposedAction: event.rootCause.proposedAction,
            requiresHuman: true,
            guardrailResult: guardrailResultJson,
          },
        })

        await prisma.revenueEvent.update({
          where: { id: event.id },
          data: { status: 'escalated' },
        })

        await createAuditEntry({
          eventId: event.id,
          actor: 'guardrail',
          decision: 'GUARDRAIL_ESCALATE',
          reason: `Rule ${result.blockedBy}: ${result.reason} → Routed to human approval queue.`,
        })

        escalated++
      } else {
        // Stop — rule fired, no action
        await prisma.intervention.create({
          data: {
            eventId: event.id,
            proposedAction: 'no_action',
            requiresHuman: false,
            guardrailResult: guardrailResultJson,
          },
        })

        await prisma.revenueEvent.update({
          where: { id: event.id },
          data: { status: 'stopped' },
        })

        await createAuditEntry({
          eventId: event.id,
          actor: 'guardrail',
          decision: 'GUARDRAIL_STOP',
          reason: `Rule ${result.blockedBy} fired: ${result.reason} — This is a correct outcome, not an error.`,
        })

        blocked++
      }
    }

    return NextResponse.json({ success: true, approved, blocked, escalated })
  } catch (err) {
    console.error('guardrails error:', err)
    return NextResponse.json(
      { error: 'Guardrail evaluation failed', details: String(err) },
      { status: 500 }
    )
  }
}

function getChannelForAction(action: string): string | null {
  const channels: Record<string, string> = {
    send_payment_link: 'sms',
    auto_retry_then_link: 'sms',
    timed_nudge: 'sms',
    compliant_retry: 'system',
    escalate_human: 'email',
  }
  return channels[action] ?? null
}
