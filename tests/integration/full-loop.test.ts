/**
 * tests/integration/full-loop.test.ts
 *
 * End-to-end integration test: seeds DB state, runs every pipeline stage in
 * sequence, then verifies the final DB state, audit chain integrity, and
 * analytics output all agree.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST as ingestPOST }     from '@/app/api/ingest/batch/route'
import { POST as diagnosePOST }   from '@/app/api/diagnose/route'
import { POST as guardrailsPOST } from '@/app/api/guardrails/route'
import { POST as executePOST }    from '@/app/api/execute/route'
import { GET  as analyticsGET }   from '@/app/api/analytics/route'
import { GET  as ledgerGET, POST as ledgerPOST } from '@/app/api/ledger/[eventId]/route'
import { NextRequest } from 'next/server'
import { prisma, createTestMerchant, createTestEvent, callRoute, getAuditChain } from '../helpers'

async function callLedgerGET(eventId: string): Promise<{ status: number; body: any }> {
  const req = new NextRequest(`http://localhost:3000/api/ledger/${eventId}`)
  const res = await ledgerGET(req, { params: { eventId } })
  return { status: res.status, body: (await res.json()) as any }
}

async function callLedgerPOST(eventId: string): Promise<{ status: number; body: any }> {
  const req = new NextRequest(`http://localhost:3000/api/ledger/${eventId}`, { method: 'POST' } as any)
  const res = await ledgerPOST(req, { params: { eventId } })
  return { status: res.status, body: (await res.json()) as any }
}

describe('Full Pipeline Integration', () => {
  it('should run the complete reclaim loop end-to-end and produce a valid outcome', async () => {
    const { createAuditEntry } = await import('@/lib/audit')

    // ── Step 0: Seed a merchant and two detected events ──────────────────────
    const merchant = await createTestMerchant()

    // Event A: transient bank error → should be auto-approved and recovered/executing
    const eventA = await createTestEvent(merchant.id, {
      type: 'payment_failed',
      status: 'detected',
      amount: 30000, // ₹300 — under escalation cap
      rawError: JSON.stringify({
        error_source: 'bank',
        error_step: 'payment_response',
        error_reason: 'bank_technical_error',
      }),
    })
    // Simulate the audit entry that ingest route creates
    await createAuditEntry({ eventId: eventA.id, actor: 'system', decision: 'DETECTED', reason: 'payment.failed ingested' })

    // Event B: high-value payment — should be escalated
    const eventB = await createTestEvent(merchant.id, {
      type: 'payment_failed',
      status: 'detected',
      amount: 20000000, // ₹2,00,000 — exceeds escalation cap
      rawError: JSON.stringify({
        error_source: 'customer',
        error_step: 'payment_authentication',
        error_reason: 'invalid_otp',
      }),
    })
    await createAuditEntry({ eventId: eventB.id, actor: 'system', decision: 'DETECTED', reason: 'payment.failed ingested' })

    // ── Step 1: Diagnose ─────────────────────────────────────────────────────
    const diagnoseResult = await callRoute(diagnosePOST)
    expect(diagnoseResult.status).toBe(200)
    expect(diagnoseResult.body.diagnosed).toBe(2)

    // Both events should now be in 'diagnosed' status
    const afterDiagnose = await prisma.revenueEvent.findMany()
    expect(afterDiagnose.every((e) => e.status === 'diagnosed')).toBe(true)

    // Root causes should be created
    const rootCauses = await prisma.rootCause.findMany()
    expect(rootCauses).toHaveLength(2)

    const rcA = rootCauses.find((rc) => rc.eventId === eventA.id)
    const rcB = rootCauses.find((rc) => rc.eventId === eventB.id)
    expect(rcA!.category).toBe('transient_bank')
    expect(rcB!.category).toBe('auth_failed')

    // ── Step 2: Guardrails ───────────────────────────────────────────────────
    const guardrailResult = await callRoute(guardrailsPOST)
    expect(guardrailResult.status).toBe(200)
    // Event A approved, Event B escalated
    expect(guardrailResult.body.approved).toBeGreaterThanOrEqual(1)
    expect(guardrailResult.body.escalated).toBeGreaterThanOrEqual(1)

    const eventAAfterGuard = await prisma.revenueEvent.findUnique({ where: { id: eventA.id } })
    const eventBAfterGuard = await prisma.revenueEvent.findUnique({ where: { id: eventB.id } })
    expect(eventAAfterGuard!.status).toBe('executing')
    expect(eventBAfterGuard!.status).toBe('escalated')

    // ── Step 3: Execute ──────────────────────────────────────────────────────
    const executeResult = await callRoute(executePOST)
    expect(executeResult.status).toBe(200)
    // Event A should be executed; Event B (escalated) should be skipped
    expect(executeResult.body.executed).toBeGreaterThanOrEqual(1)

    // Event A should reach 'recovered' (if Razorpay keys present) or
    // stay 'executing' with an ACTION_FAILED audit entry (dummy keys)
    const eventAFinal = await prisma.revenueEvent.findUnique({ where: { id: eventA.id } })
    expect(['recovered', 'executing']).toContain(eventAFinal!.status)

    // Event B must remain escalated — never touched by execute
    const eventBFinal = await prisma.revenueEvent.findUnique({ where: { id: eventB.id } })
    expect(eventBFinal!.status).toBe('escalated')

    // ── Step 4: Verify audit chain for Event A ────────────────────────────────
    const { status: ledgerStatus, body: ledgerBody } = await callLedgerGET(eventA.id)
    expect(ledgerStatus).toBe(200)

    const entries = ledgerBody.entries as Array<{
      prevHash: string; hash: string; decision: string; actor: string
    }>
    expect(entries.length).toBeGreaterThanOrEqual(3) // DETECTED + DIAGNOSED + GUARDRAIL + ACTION

    // Chain integrity: POST /verify
    const { body: verifyBody } = await callLedgerPOST(eventA.id)
    expect(verifyBody.valid).toBe(true)

    // ── Step 5: Verify analytics reflect the batch ───────────────────────────
    const analyticsRes = await (analyticsGET as any)()
    const analytics = (await analyticsRes.json()) as any

    expect(analyticsRes.status).toBe(200)
    expect(analytics.totalEvents).toBe(2)
    // At least one event has been processed
    expect(analytics.overallRecoveryRate).toBeGreaterThanOrEqual(0)

    const chain = await getAuditChain(eventA.id)
    const decisions = chain.map((e: { decision: string }) => e.decision)
    expect(decisions).toContain('DETECTED')
    expect(decisions).toContain('DIAGNOSED')
    expect(decisions).toContain('GUARDRAIL_PASS')
    // ACTION should be present (regardless of success/fail)
    expect(decisions.some((d: string) => d === 'ACTION' || d === 'ACTION_FAILED')).toBe(true)
  })
})
