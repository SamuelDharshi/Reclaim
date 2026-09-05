/**
 * tests/api/execute.test.ts
 * 5 tests for POST /api/execute
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST } from '@/app/api/execute/route'
import {
  prisma,
  createTestMerchant,
  createTestEvent,
  createTestIntervention,
  callRoute,
  getAuditChain,
} from '../helpers'

const HAS_RAZORPAY = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

describe('POST /api/execute', () => {
  it(
    'should call Razorpay payment_links API and store the link ID on success',
    async () => {
      if (!HAS_RAZORPAY) {
        console.log('SKIP: no Razorpay keys — skipping live payment link test')
        return
      }
      const merchant = await createTestMerchant({
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
      })
      const event = await createTestEvent(merchant.id, {
        status: 'executing',
        amount: 50000,
        customerEmail: 'test@reclaim.dev',
      })
      await createTestIntervention(event.id, {
        proposedAction: 'send_payment_link',
        requiresHuman: false,
      })

      const { status, body } = await callRoute(POST)

      expect(status).toBe(200)
      expect(body.succeeded).toBeGreaterThanOrEqual(1)

      const action = await prisma.action.findFirst()
      expect(action).not.toBeNull()
      expect(action!.result).toBe('success')
      const resultData = JSON.parse(action!.resultData ?? '{}')
      expect(resultData.paymentLinkId).toBeDefined()
      expect(resultData.shortUrl).toMatch(/^https?:\/\//)
    }
  )

  it('should skip escalated (requiresHuman=true) interventions and not create any Action', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, { status: 'escalated' })
    await createTestIntervention(event.id, {
      proposedAction: 'send_payment_link',
      requiresHuman: true,
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.executed).toBe(0)

    const actions = await prisma.action.findMany()
    expect(actions).toHaveLength(0)

    // Event status unchanged
    const updatedEvent = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updatedEvent!.status).toBe('escalated')
  })

  it('should return executed=0 when no events are in executing status', async () => {
    const merchant = await createTestMerchant()
    // Create event in 'diagnosed' (not 'executing') — should be ignored
    await createTestEvent(merchant.id, { status: 'diagnosed' })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.executed).toBe(0)
    expect(body.succeeded).toBe(0)
    expect(body.failed).toBe(0)
  })

  it('should create an ACTION audit entry with mcp tool name in reason', async () => {
    if (!HAS_RAZORPAY) {
      // Manually seed an action to test the audit shape
      const merchant = await createTestMerchant()
      const event = await createTestEvent(merchant.id, { status: 'executing', amount: 10000 })
      const intervention = await createTestIntervention(event.id, {
        proposedAction: 'compliant_retry',
        requiresHuman: false,
      })
      await prisma.action.create({
        data: {
          interventionId: intervention.id,
          mcpToolCalled: 'retry_mandate',
          payload: JSON.stringify({ amount: 10000 }),
          result: 'success',
          resultData: JSON.stringify({ note: 'scheduled' }),
        },
      })
      const { createAuditEntry } = await import('@/lib/audit')
      await createAuditEntry({
        eventId: event.id,
        actor: 'agent',
        decision: 'ACTION',
        reason: 'mcp.retry_mandate → result=success',
      })
      const chain = await getAuditChain(event.id)
      const actionEntry = chain.find((e) => e.decision === 'ACTION')
      expect(actionEntry).toBeDefined()
      expect(actionEntry!.actor).toBe('agent')
      expect(actionEntry!.reason).toMatch(/mcp\./)
      return
    }

    const merchant = await createTestMerchant({
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    })
    const event = await createTestEvent(merchant.id, {
      status: 'executing',
      amount: 50000,
    })
    await createTestIntervention(event.id, {
      proposedAction: 'send_payment_link',
      requiresHuman: false,
    })

    await callRoute(POST)

    const chain = await getAuditChain(event.id)
    const actionEntry = chain.find((e) => e.decision === 'ACTION')
    expect(actionEntry).toBeDefined()
    expect(actionEntry!.actor).toBe('agent')
    expect(actionEntry!.reason).toMatch(/mcp\./)
  })

  it('should not re-execute an intervention that already has a successful action', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, { status: 'executing', amount: 10000 })
    const intervention = await createTestIntervention(event.id, {
      proposedAction: 'compliant_retry',
      requiresHuman: false,
    })
    // Pre-seed a successful action
    await prisma.action.create({
      data: {
        interventionId: intervention.id,
        mcpToolCalled: 'retry_mandate',
        payload: JSON.stringify({ amount: 10000 }),
        result: 'success',
        resultData: JSON.stringify({ note: 'already done' }),
      },
    })

    const { status, body } = await callRoute(POST)

    expect(status).toBe(200)
    // Should skip the already-successful intervention
    expect(body.executed).toBe(0)

    // Only one action should exist (the pre-seeded one)
    const actions = await prisma.action.findMany()
    expect(actions).toHaveLength(1)
  })
})
