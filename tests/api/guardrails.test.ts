/**
 * tests/api/guardrails.test.ts
 * 5 tests for POST /api/guardrails
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST } from '@/app/api/guardrails/route'
import {
  prisma,
  createTestMerchant,
  createTestEvent,
  createTestRootCause,
  callRoute,
  getAuditChain,
} from '../helpers'

describe('POST /api/guardrails', () => {
  it('should approve interventions for amounts below the merchant spend cap', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      amount: 50000, // ₹500 — well under ₹1,00,000 cap
      status: 'diagnosed',
    })
    await createTestRootCause(event.id, { proposedAction: 'send_payment_link' })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.approved).toBeGreaterThanOrEqual(1)

    const updatedEvent = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updatedEvent!.status).toBe('executing')

    const intervention = await prisma.intervention.findFirst({ where: { eventId: event.id } })
    expect(intervention).not.toBeNull()
    expect(intervention!.requiresHuman).toBe(false)
  })

  it('should set requiresHuman=true and status=escalated when amount exceeds spend cap', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      amount: 15000000, // ₹1,50,000 — exceeds ₹1,00,000 cap
      status: 'diagnosed',
    })
    await createTestRootCause(event.id, { proposedAction: 'send_payment_link' })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.escalated).toBeGreaterThanOrEqual(1)

    const updatedEvent = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updatedEvent!.status).toBe('escalated')

    const intervention = await prisma.intervention.findFirst({ where: { eventId: event.id } })
    expect(intervention!.requiresHuman).toBe(true)

    const guardrailResult = JSON.parse(intervention!.guardrailResult ?? '{}')
    expect(guardrailResult.blockedBy).toBe('R-GUARD-001')
  })

  it('should stop mandate events that have already reached max retry attempts', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      type: 'mandate_failed',
      amount: 10000,
      status: 'diagnosed',
    })
    await createTestRootCause(event.id, {
      category: 'mandate_retry',
      proposedAction: 'compliant_retry',
    })

    // Create 3 existing interventions — hitting maxRecoveryAttempts (default 3)
    for (let i = 0; i < 3; i++) {
      await prisma.intervention.create({
        data: {
          eventId: event.id,
          proposedAction: 'compliant_retry',
          requiresHuman: false,
          guardrailResult: JSON.stringify({ passed: true }),
        },
      })
    }

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.blocked).toBeGreaterThanOrEqual(1)

    const updatedEvent = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updatedEvent!.status).toBe('stopped')
  })

  it('should stop merchant config errors and never retry them', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      amount: 5000,
      status: 'diagnosed',
      rawError: JSON.stringify({ error_source: 'business' }),
    })
    await createTestRootCause(event.id, {
      category: 'merchant_config',
      proposedAction: 'stop_merchant_issue',
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    // stop_merchant_issue → requiresHuman=true → escalated count
    expect(body.escalated).toBeGreaterThanOrEqual(1)

    const updatedEvent = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updatedEvent!.status).toBe('escalated')
  })

  it('should create GUARDRAIL audit entries with actor=guardrail for every processed event', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      amount: 30000,
      status: 'diagnosed',
    })
    await createTestRootCause(event.id, { proposedAction: 'send_payment_link' })

    await callRoute(POST)

    const chain = await getAuditChain(event.id)
    const guardrailEntry = chain.find((e) => e.actor === 'guardrail')
    expect(guardrailEntry).toBeDefined()
    expect(guardrailEntry!.decision).toMatch(/GUARDRAIL/)
  })
})
