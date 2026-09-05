/**
 * tests/api/ledger.test.ts
 * 5 tests for GET+POST /api/ledger/[eventId]
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GET, POST } from '@/app/api/ledger/[eventId]/route'
import { computeHash } from '@/lib/audit'
import { NextRequest } from 'next/server'
import { prisma, createTestMerchant, createTestEvent, getAuditChain } from '../helpers'

async function callLedgerGET(eventId: string) {
  const req = new NextRequest(`http://localhost:3000/api/ledger/${eventId}`)
  const res = await GET(req, { params: { eventId } })
  return { status: res.status, body: (await res.json()) as any }
}

async function callLedgerPOST(eventId: string) {
  const req = new NextRequest(`http://localhost:3000/api/ledger/${eventId}`, { method: 'POST' } as any)
  const res = await POST(req, { params: { eventId } })
  return { status: res.status, body: (await res.json()) as any }
}

describe('Audit Ledger /api/ledger/[eventId]', () => {
  it('should produce a valid hash chain where each hash depends on the previous', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, { status: 'detected' })
    const { createAuditEntry } = await import('@/lib/audit')

    await createAuditEntry({ eventId: event.id, actor: 'system',    decision: 'DETECTED',      reason: 'ingested' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',     decision: 'DIAGNOSED',     reason: 'rule R-002' })
    await createAuditEntry({ eventId: event.id, actor: 'guardrail', decision: 'GUARDRAIL_PASS',reason: 'all passed' })

    const { status, body } = await callLedgerGET(event.id)
    expect(status).toBe(200)

    const entries: any[] = body.entries
    expect(entries.length).toBe(3)

    // First entry prevHash must be '0'
    expect(entries[0].prevHash).toBe('0')

    // Each entry's prevHash must match the previous entry's stored hash
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].prevHash).toBe(entries[i - 1].hash)
    }

    // Every stored hash must match what we recompute from the fields
    for (const entry of entries) {
      const recomputed = computeHash({
        prevHash: entry.prevHash,
        eventId: event.id,
        actor: entry.actor,
        decision: entry.decision,
        createdAt: new Date(entry.createdAt),
      })
      expect(recomputed).toBe(entry.hash)
    }
  })

  it('should return valid=false when an audit entry is tampered with directly in DB', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id)
    const { createAuditEntry } = await import('@/lib/audit')

    await createAuditEntry({ eventId: event.id, actor: 'system', decision: 'DETECTED',  reason: 'original' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',  decision: 'DIAGNOSED', reason: 'original' })

    // Tamper: overwrite the first entry's decision field
    const firstEntry = await prisma.auditEntry.findFirst({
      where: { eventId: event.id },
      orderBy: { createdAt: 'asc' },
    })
    await prisma.auditEntry.update({
      where: { id: firstEntry!.id },
      data: { decision: 'TAMPERED' },
    })

    const { status, body } = await callLedgerPOST(event.id)
    expect(status).toBe(200)
    expect(body.valid).toBe(false)

    const invalidEntry = body.entries.find((e: any) => !e.valid)
    expect(invalidEntry).toBeDefined()
  })

  it('should return audit entries for all actor types in chronological order', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id)
    const { createAuditEntry } = await import('@/lib/audit')

    await createAuditEntry({ eventId: event.id, actor: 'system',    decision: 'DETECTED',      reason: 'step 1' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',     decision: 'DIAGNOSED',     reason: 'step 2' })
    await createAuditEntry({ eventId: event.id, actor: 'guardrail', decision: 'GUARDRAIL_PASS',reason: 'step 3' })
    await createAuditEntry({ eventId: event.id, actor: 'human',     decision: 'HUMAN_APPROVED',reason: 'step 4' })

    const { status, body } = await callLedgerGET(event.id)
    expect(status).toBe(200)

    const entries: any[] = body.entries
    expect(entries.length).toBe(4)

    const actors = entries.map((e: any) => e.actor)
    expect(actors).toContain('system')
    expect(actors).toContain('agent')
    expect(actors).toContain('guardrail')
    expect(actors).toContain('human')

    // Verify chronological order
    for (let i = 1; i < entries.length; i++) {
      const prev = new Date(entries[i - 1].createdAt).getTime()
      const curr = new Date(entries[i].createdAt).getTime()
      expect(curr).toBeGreaterThanOrEqual(prev)
    }
  })

  it('should return 404 when requesting ledger for a non-existent event ID', async () => {
    const { status, body } = await callLedgerGET('non-existent-event-id-xyz')
    expect(status).toBe(404)
    expect(body.error).toMatch(/not found/i)
  })

  it('should have at least one audit entry per state change in the full event lifecycle', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, { status: 'detected' })
    const { createAuditEntry } = await import('@/lib/audit')

    await createAuditEntry({ eventId: event.id, actor: 'system',    decision: 'DETECTED',      reason: 'ingested' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',     decision: 'DIAGNOSED',     reason: 'R-002' })
    await createAuditEntry({ eventId: event.id, actor: 'guardrail', decision: 'GUARDRAIL_PASS',reason: 'passed' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',     decision: 'ACTION',        reason: 'mcp.create_payment_link' })
    await createAuditEntry({ eventId: event.id, actor: 'agent',     decision: 'RESULT',        reason: 'recovered' })

    const chain = await getAuditChain(event.id)
    const decisions = chain.map((e) => e.decision)

    expect(decisions).toContain('DETECTED')
    expect(decisions).toContain('DIAGNOSED')
    expect(decisions).toContain('GUARDRAIL_PASS')
    expect(decisions).toContain('ACTION')
    expect(decisions).toContain('RESULT')
    expect(chain.length).toBeGreaterThanOrEqual(5)
  })
})
