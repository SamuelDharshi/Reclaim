/**
 * tests/api/analytics.test.ts
 * 5 tests for GET /api/analytics
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GET } from '@/app/api/analytics/route'
import { prisma, createTestMerchant, createTestEvent } from '../helpers'

async function callAnalytics() {
  // analytics GET takes no arguments (Next.js App Router route with no params)
  const res = await (GET as any)()
  return { status: res.status, body: await res.json() as any }
}

describe('GET /api/analytics', () => {
  it('should return recovery rate = recovered / total per category', async () => {
    const merchant = await createTestMerchant()

    // 5 payment_failed: 3 recovered, 2 detected
    for (let i = 0; i < 3; i++) {
      await createTestEvent(merchant.id, {
        type: 'payment_failed',
        status: 'recovered',
        amount: 10000,
        razorpayRefId: `pay_rec_${i}_${Date.now()}`,
      })
    }
    for (let i = 0; i < 2; i++) {
      await createTestEvent(merchant.id, {
        type: 'payment_failed',
        status: 'detected',
        amount: 10000,
        razorpayRefId: `pay_det_${i}_${Date.now()}`,
      })
    }

    const { status, body } = await callAnalytics()

    expect(status).toBe(200)
    const cat = body.categories.find((c: any) => c.type === 'payment_failed')
    expect(cat).toBeDefined()
    expect(cat.totalEvents).toBe(5)
    expect(cat.recoveryRate).toBe(60) // 3/5 = 60%
  })

  it('should calculate avgTimeToRecovery in minutes for recovered events only', async () => {
    const merchant = await createTestMerchant()

    const detectedAt = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    const resolvedAt = new Date()                              // now → 60 min delta

    await prisma.revenueEvent.create({
      data: {
        merchantId: merchant.id,
        type: 'payment_failed',
        amount: 5000,
        currency: 'INR',
        razorpayRefId: `pay_ttr_1_${Date.now()}`,
        status: 'recovered',
        detectedAt,
        resolvedAt,
        rawError: '{}',
      },
    })

    const { status, body } = await callAnalytics()

    expect(status).toBe(200)
    const cat = body.categories.find((c: any) => c.type === 'payment_failed')
    expect(cat.avgTimeToRecovery).not.toBeNull()
    // Should be ~60 minutes (allow ±2 min for timing)
    expect(cat.avgTimeToRecovery).toBeGreaterThanOrEqual(58)
    expect(cat.avgTimeToRecovery).toBeLessThanOrEqual(62)
  })

  it('should report non-zero guardrail block rate when stopped events exist', async () => {
    const merchant = await createTestMerchant()

    // 3 stopped, 7 recovered
    for (let i = 0; i < 3; i++) {
      await createTestEvent(merchant.id, {
        status: 'stopped',
        amount: 5000,
        razorpayRefId: `pay_stop_${i}_${Date.now()}`,
      })
    }
    for (let i = 0; i < 7; i++) {
      await createTestEvent(merchant.id, {
        status: 'recovered',
        amount: 5000,
        razorpayRefId: `pay_recov_${i}_${Date.now()}`,
      })
    }

    const { status, body } = await callAnalytics()

    expect(status).toBe(200)
    expect(body.guardrailBlockRate).toBe(30) // 3/10 = 30%
    expect(body.totalEvents).toBe(10)
  })

  it('should return zero-filled metrics when no events exist in the database', async () => {
    const { status, body } = await callAnalytics()

    expect(status).toBe(200)
    expect(body.totalEvents).toBe(0)
    expect(body.totalAtRisk).toBe(0)
    expect(body.totalRecovered).toBe(0)
    expect(body.overallRecoveryRate).toBe(0)
    expect(body.guardrailBlockRate).toBe(0)
    expect(Array.isArray(body.categories)).toBe(true)
    for (const cat of body.categories) {
      expect(cat.totalEvents).toBe(0)
      expect(cat.recoveryRate).toBe(0)
    }
  })

  it('should separate payment_failed, mandate_failed, and abandoned into distinct category buckets', async () => {
    const merchant = await createTestMerchant()

    await createTestEvent(merchant.id, {
      type: 'payment_failed',
      status: 'recovered',
      amount: 5000,
      razorpayRefId: `pay_pf_${Date.now()}`,
    })
    await createTestEvent(merchant.id, {
      type: 'mandate_failed',
      status: 'detected',
      amount: 3000,
      razorpayRefId: `pay_mf_${Date.now()}`,
    })
    await createTestEvent(merchant.id, {
      type: 'abandoned',
      status: 'stopped',
      amount: 8000,
      razorpayRefId: `pay_ab_${Date.now()}`,
    })

    const { status, body } = await callAnalytics()

    expect(status).toBe(200)

    const types = body.categories.map((c: any) => c.type)
    expect(types).toContain('payment_failed')
    expect(types).toContain('mandate_failed')
    expect(types).toContain('abandoned')

    const pf = body.categories.find((c: any) => c.type === 'payment_failed')
    const mf = body.categories.find((c: any) => c.type === 'mandate_failed')
    const ab = body.categories.find((c: any) => c.type === 'abandoned')

    expect(pf.totalEvents).toBe(1)
    expect(mf.totalEvents).toBe(1)
    expect(ab.totalEvents).toBe(1)
  })
})
