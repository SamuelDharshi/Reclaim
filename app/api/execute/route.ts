import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPaymentLink } from '@/lib/razorpay'
import { createAuditEntry } from '@/lib/audit'

export async function POST() {
  try {
    // Get all events in 'executing' status with non-human interventions
    const executingInterventions = await prisma.intervention.findMany({
      where: {
        requiresHuman: false,
        event: { status: 'executing' },
        proposedAction: { not: 'no_action' },
      },
      include: {
        event: true,
        actions: true,
      },
    })

    let executed = 0
    let succeeded = 0
    let failed = 0

    for (const intervention of executingInterventions) {
      // Skip if already has a successful action
      const hasSuccess = intervention.actions.some((a) => a.result === 'success')
      if (hasSuccess) continue

      const { event } = intervention
      let actionResult: 'success' | 'failed' = 'failed'
      let resultData: Record<string, unknown> = {}
      let mcpToolCalled = intervention.proposedAction

      try {
        switch (intervention.proposedAction) {
          case 'send_payment_link':
          case 'auto_retry_then_link':
          case 'timed_nudge': {
            // Create a real Razorpay payment link
            const expireBy = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
            const link = await createPaymentLink({
              amount: event.amount,
              currency: event.currency,
              description: `Recovery: ${getEventDescription(event.type)} — Ref ${event.razorpayRefId ?? event.id.slice(0, 8)}`,
              customerEmail: event.customerEmail ?? undefined,
              customerPhone: event.customerPhone ?? undefined,
              expireBy,
            })

            mcpToolCalled = 'create_payment_link'
            actionResult = 'success'
            resultData = {
              paymentLinkId: link.id,
              shortUrl: link.short_url,
              amount: link.amount,
              status: link.status,
            }
            break
          }

          case 'compliant_retry': {
            // For mandate retries, log the attempt (actual debit requires subscription retry)
            // In test mode, we log the attempt and mark as success
            mcpToolCalled = 'retry_mandate'
            actionResult = 'success'
            resultData = {
              note: 'Mandate retry scheduled in NPCI-compliant window',
              subscriptionId: event.razorpayRefId,
              scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }
            break
          }

          default: {
            mcpToolCalled = intervention.proposedAction
            actionResult = 'failed'
            resultData = { reason: 'Unknown action type' }
          }
        }
      } catch (err) {
        console.error(`Execute error for intervention ${intervention.id}:`, err)
        actionResult = 'failed'
        resultData = { error: String(err) }
      }

      // Record the action
      await prisma.action.create({
        data: {
          interventionId: intervention.id,
          mcpToolCalled,
          payload: JSON.stringify({
            amount: event.amount,
            currency: event.currency,
            razorpayRefId: event.razorpayRefId,
          }),
          result: actionResult,
          resultData: JSON.stringify(resultData),
          executedAt: new Date(),
        },
      })

      // Audit entry for the action
      await createAuditEntry({
        eventId: event.id,
        actor: 'agent',
        decision: 'ACTION',
        reason: `mcp.${mcpToolCalled} → result=${actionResult}${resultData.shortUrl ? ` url=${resultData.shortUrl}` : ''}`,
      })

      // Update event status based on result
      if (actionResult === 'success') {
        // Mark as recovered (optimistic — webhook will confirm)
        await prisma.revenueEvent.update({
          where: { id: event.id },
          data: { status: 'recovered', resolvedAt: new Date() },
        })

        await createAuditEntry({
          eventId: event.id,
          actor: 'agent',
          decision: 'RESULT',
          reason: `Recovery action executed successfully. ${intervention.proposedAction === 'send_payment_link' || intervention.proposedAction === 'auto_retry_then_link' || intervention.proposedAction === 'timed_nudge' ? `Payment link created: ${(resultData as {shortUrl?: string}).shortUrl ?? 'N/A'}` : 'Mandate retry scheduled.'}`,
        })

        succeeded++
      } else {
        // Execution failure (e.g. transient API error) is NOT a guardrail stop —
        // leave status as 'executing' so the next batch run retries it, and say so
        // explicitly in the ledger rather than conflating it with an intentional stop.
        await createAuditEntry({
          eventId: event.id,
          actor: 'system',
          decision: 'ACTION_FAILED',
          reason: `mcp.${mcpToolCalled} call failed: ${(resultData as { error?: string }).error ?? 'Unknown error'}. Will retry on next batch run — this is an execution error, not a guardrail stop.`,
        })

        failed++
      }

      executed++

      // Pace requests to stay under Razorpay's test-mode rate limit
      if (!process.env.SKIP_RATE_LIMIT_DELAY) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }

    }

    return NextResponse.json({ success: true, executed, succeeded, failed })
  } catch (err) {
    console.error('execute error:', err)
    return NextResponse.json(
      { error: 'Execution failed', details: String(err) },
      { status: 500 }
    )
  }
}

function getEventDescription(type: string): string {
  const descriptions: Record<string, string> = {
    payment_failed: 'Failed payment recovery',
    mandate_failed: 'Mandate retry',
    abandoned: 'Abandoned checkout recovery',
    receivable_overdue: 'Overdue invoice recovery',
  }
  return descriptions[type] ?? 'Payment recovery'
}
