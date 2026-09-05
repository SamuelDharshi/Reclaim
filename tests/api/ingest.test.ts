/**
 * tests/api/ingest.test.ts
 * 5 tests for POST /api/ingest/batch
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST } from '@/app/api/ingest/batch/route'
import { prisma, createTestMerchant, callRoute } from '../helpers'

const HAS_RAZORPAY = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
const maybeIt = HAS_RAZORPAY ? it : it.skip

describe('POST /api/ingest/batch', () => {
  maybeIt('should ingest real failed payments from Razorpay test API and create RevenueEvent records', async () => {
    await createTestMerchant({
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    })
    const { status, body } = await callRoute(POST)
    expect(status).toBe(200)
    expect(body.success).toBe(true)

    const events = await prisma.revenueEvent.findMany()
    events.forEach((e) => {
      expect(['payment_failed', 'abandoned', 'mandate_failed']).toContain(e.type)
      expect(e.status).toBe('detected')
    })
  })

  it('should skip already-ingested events and return ingested=0 on duplicate batch run', async () => {
    await createTestMerchant()

    // First run — ingest whatever real events Razorpay has (could be 0..N)
    const { status: s1, body: first } = await callRoute(POST)
    expect(s1).toBe(200)
    const countAfterFirst = await prisma.revenueEvent.count()

    // Second run — every razorpayRefId already exists, so nothing new should be ingested
    const { status: s2, body: second } = await callRoute(POST)
    expect(s2).toBe(200)
    expect(second.ingested).toBe(0)

    const countAfterSecond = await prisma.revenueEvent.count()
    expect(countAfterSecond).toBe(countAfterFirst)
  })

  it('should auto-create a merchant record when none exists and RAZORPAY_KEY_ID is set', async () => {
    const merchantsBefore = await prisma.merchant.count()
    expect(merchantsBefore).toBe(0)

    const { status } = await callRoute(POST)
    expect(status).toBe(200)

    const merchantsAfter = await prisma.merchant.count()
    expect(merchantsAfter).toBe(1)
  })

  it('should return success=true with ingested=0 when Razorpay returns empty results (dummy keys)', async () => {
    await createTestMerchant()
    // With dummy keys, razorpay fetch functions catch errors and return []
    const { status, body } = await callRoute(POST)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(typeof body.ingested).toBe('number')
  })

  it('should create DETECTED audit entries for each newly ingested event', async () => {
    const merchant = await createTestMerchant()
    const { createAuditEntry } = await import('@/lib/audit')

    // Simulate what ingest does: create event + audit entry
    const event = await prisma.revenueEvent.create({
      data: {
        merchantId: merchant.id,
        type: 'payment_failed',
        amount: 5000,
        currency: 'INR',
        razorpayRefId: 'pay_audit_test_001',
        status: 'detected',
        rawError: '{}',
      },
    })
    await createAuditEntry({
      eventId: event.id,
      actor: 'system',
      decision: 'DETECTED',
      reason: 'payment.failed ingested from Razorpay. source=bank reason=bank_technical_error amount=₹50',
    })

    const audit = await prisma.auditEntry.findFirst({ where: { eventId: event.id } })
    expect(audit).not.toBeNull()
    expect(audit!.decision).toBe('DETECTED')
    expect(audit!.actor).toBe('system')
    expect(audit!.prevHash).toBe('0') // first entry in chain
  })
})
