/**
 * tests/api/diagnose.test.ts
 * 5 tests for POST /api/diagnose
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST } from '@/app/api/diagnose/route'
import {
  prisma,
  createTestMerchant,
  createTestEvent,
  callRoute,
  getAuditChain,
} from '../helpers'

describe('POST /api/diagnose', () => {
  it('should diagnose bank technical errors as transient_bank with high confidence', async () => {
    const merchant = await createTestMerchant()
    await createTestEvent(merchant.id, {
      status: 'detected',
      rawError: JSON.stringify({
        error_source: 'bank',
        error_step: 'payment_response',
        error_reason: 'bank_technical_error',
      }),
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.diagnosed).toBeGreaterThanOrEqual(1)

    const rootCause = await prisma.rootCause.findFirst()
    expect(rootCause).not.toBeNull()
    expect(rootCause!.category).toBe('transient_bank')
    expect(rootCause!.confidence).toBeGreaterThanOrEqual(0.87)
    expect(['R-002', 'R-005']).toContain(rootCause!.ruleFired)
  })

  it('should diagnose customer auth failures as auth_failed and propose send_payment_link', async () => {
    const merchant = await createTestMerchant()
    await createTestEvent(merchant.id, {
      status: 'detected',
      rawError: JSON.stringify({
        error_source: 'customer',
        error_step: 'payment_authentication',
        error_reason: 'invalid_otp',
      }),
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.diagnosed).toBeGreaterThanOrEqual(1)

    const rootCause = await prisma.rootCause.findFirst()
    expect(rootCause!.category).toBe('auth_failed')
    expect(rootCause!.proposedAction).toBe('send_payment_link')
    expect(rootCause!.ruleFired).toBe('R-001')
    expect(rootCause!.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('should diagnose gateway errors as ambiguous with confidence ~0.65', async () => {
    const merchant = await createTestMerchant()
    await createTestEvent(merchant.id, {
      status: 'detected',
      rawError: JSON.stringify({
        error_source: 'gateway',
        error_step: 'payment_response',
        error_reason: 'payment_failed',
      }),
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)

    const rootCause = await prisma.rootCause.findFirst()
    expect(rootCause!.category).toBe('ambiguous')
    expect(rootCause!.confidence).toBeCloseTo(0.65, 1)
    expect(rootCause!.ruleFired).toBe('R-004')
  })

  it('should skip events with status !== detected and return diagnosed=0', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, { status: 'diagnosed' })
    await prisma.rootCause.create({
      data: {
        eventId: event.id,
        category: 'transient_bank',
        confidence: 0.9,
        ruleFired: 'R-002',
        proposedAction: 'send_payment_link',
      },
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.diagnosed).toBe(0)

    // Original root cause should be unchanged
    const rootCauses = await prisma.rootCause.findMany()
    expect(rootCauses).toHaveLength(1)
  })

  it('should append a DIAGNOSED audit entry with correct actor and rule reference', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      status: 'detected',
      rawError: JSON.stringify({
        error_source: 'customer',
        error_step: 'payment_authentication',
        error_reason: 'invalid_otp',
      }),
    })

    await callRoute(POST)

    const chain = await getAuditChain(event.id)
    const diagEntry = chain.find((e) => e.decision === 'DIAGNOSED')
    expect(diagEntry).toBeDefined()
    expect(diagEntry!.actor).toBe('agent')
    expect(diagEntry!.reason).toMatch(/category=auth_failed/)
    expect(diagEntry!.reason).toMatch(/rule=R-001/)
  })
})
