import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EVENT_TYPES = ['payment_failed', 'mandate_failed', 'abandoned', 'receivable_overdue'] as const

const TYPE_LABELS: Record<string, string> = {
  payment_failed: 'Card/UPI Failure',
  mandate_failed: 'Mandate Failure',
  abandoned: 'Checkout Abandonment',
  receivable_overdue: 'B2B Receivable',
}

export async function GET() {
  try {
    const allEvents = await prisma.revenueEvent.findMany({
      include: {
        rootCause: true,
        interventions: {
          include: { actions: true },
        },
        auditEntries: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    // Total at risk = all non-recovered, non-stopped events
    const activeEvents = allEvents.filter(
      (e) => !['recovered', 'stopped'].includes(e.status)
    )
    const totalAtRisk = activeEvents.reduce((sum, e) => sum + e.amount, 0)

    // Total recovered
    const recoveredEvents = allEvents.filter((e) => e.status === 'recovered')
    const totalRecovered = recoveredEvents.reduce((sum, e) => sum + e.amount, 0)

    const overallRecoveryRate =
      allEvents.length > 0
        ? Math.round((recoveredEvents.length / allEvents.length) * 100)
        : 0

    // Per-category metrics
    const categories = EVENT_TYPES.map((type) => {
      const typeEvents = allEvents.filter((e) => e.type === type)
      const typeAtRisk = typeEvents
        .filter((e) => !['recovered', 'stopped'].includes(e.status))
        .reduce((sum, e) => sum + e.amount, 0)
      const typeRecovered = typeEvents
        .filter((e) => e.status === 'recovered')
        .reduce((sum, e) => sum + e.amount, 0)
      const typeStopped = typeEvents
        .filter((e) => e.status === 'stopped')
        .reduce((sum, e) => sum + e.amount, 0)

      const recoveredCount = typeEvents.filter((e) => e.status === 'recovered').length

      // Average time to recovery (in minutes)
      const recoveredWithTime = typeEvents.filter(
        (e) => e.status === 'recovered' && e.resolvedAt
      )
      const avgTimeMinutes =
        recoveredWithTime.length > 0
          ? recoveredWithTime.reduce((sum, e) => {
              const detectedMs = new Date(e.detectedAt).getTime()
              const resolvedMs = new Date(e.resolvedAt!).getTime()
              return sum + (resolvedMs - detectedMs) / 1000 / 60
            }, 0) / recoveredWithTime.length
          : null

      return {
        type,
        label: TYPE_LABELS[type],
        totalEvents: typeEvents.length,
        totalAtRisk: typeAtRisk,
        totalRecovered: typeRecovered,
        totalStopped: typeStopped,
        recoveryRate:
          typeEvents.length > 0
            ? Math.round((recoveredCount / typeEvents.length) * 100)
            : 0,
        avgTimeToRecovery: avgTimeMinutes ? Math.round(avgTimeMinutes) : null,
      }
    })

    // Guardrail block rate
    const stoppedEvents = allEvents.filter((e) => e.status === 'stopped')
    const guardrailBlockRate =
      allEvents.length > 0
        ? Math.round((stoppedEvents.length / allEvents.length) * 100)
        : 0

    // Guardrail block reasons — from intervention guardrail results
    const guardrailBlockReasons: Record<string, number> = {}
    for (const event of stoppedEvents) {
      for (const intervention of event.interventions) {
        try {
          const result = JSON.parse(intervention.guardrailResult ?? '{}')
          const blockedBy = result.blockedBy ?? 'Unknown'
          guardrailBlockReasons[blockedBy] = (guardrailBlockReasons[blockedBy] ?? 0) + 1
        } catch {
          // ignore
        }
      }
    }

    // Recent activity (last 20 events by detectedAt)
    const recentActivity = allEvents
      .slice()
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, 20)
      .map((e) => ({
        eventId: e.id,
        type: e.type,
        amount: e.amount,
        status: e.status,
        timestamp: e.detectedAt.toISOString(),
      }))

    return NextResponse.json({
      totalAtRisk,
      totalRecovered,
      overallRecoveryRate,
      categories,
      guardrailBlockRate,
      guardrailBlockReasons,
      recentActivity,
      totalEvents: allEvents.length,
    })
  } catch (err) {
    console.error('analytics error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
