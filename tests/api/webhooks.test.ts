/**
 * tests/api/webhooks.test.ts
 * 5 tests for POST /api/webhooks/razorpay
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { POST } from '@/app/api/webhooks/razorpay/route'
import { NextRequest } from 'next/server'
import { prisma, createTestMerchant, createTestEvent, buildWebhookRequest, computeWebhookSignature } from '../helpers'

const WEBHOOK_SECRET = 'test_webhook_secret'

async function callWebhook(payload: unknown, overrideSignature?: string) {
  const req = buildWebhookRequest(payload, WEBHOOK_SECRET, overrideSignature)
  const res = await POST(req)
  return { status: res.status, body: (await res.json()) as any }
}

describe('POST /api/webhooks/razorpay', () => {
  it('should create a RevenueEvent on valid payment.failed webhook with correct signature', async () => {
    await createTestMerchant()

    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test_001',
            amount: 50000,
            currency: 'INR',
            email: 'customer@test.com',
            contact: '+919999999999',
            error_code: 'BAD_REQUEST_ERROR',
            error_source: 'customer',
            error_step: 'payment_authentication',
            error_reason: 'invalid_otp',
          },
        },
      },
    }

    const { status, body } = await callWebhook(payload)

    expect(status).toBe(200)
    expect(body.received).toBe(true)

    const event = await prisma.revenueEvent.findFirst({
      where: { razorpayRefId: 'pay_webhook_test_001' },
    })
    expect(event).not.toBeNull()
    expect(event!.type).toBe('payment_failed')
    expect(event!.status).toBe('detected')
    expect(event!.amount).toBe(50000)

    const audit = await prisma.auditEntry.findFirst({ where: { eventId: event!.id } })
    expect(audit).not.toBeNull()
    expect(audit!.decision).toBe('DETECTED')
  })

  it('should return 400 when the signature does not match the payload', async () => {
    await createTestMerchant()

    const payload = {
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_bad_sig_001', amount: 10000 } } },
    }

    const { status, body } = await callWebhook(payload, 'wrong_signature_abc123')

    expect(status).toBe(400)
    expect(body.error).toMatch(/invalid signature/i)

    const events = await prisma.revenueEvent.findMany()
    expect(events).toHaveLength(0)
  })

  it('should return 400 when the X-Razorpay-Signature header is missing entirely', async () => {
    await createTestMerchant()

    const bodyStr = JSON.stringify({ event: 'payment.failed', payload: {} })
    const req = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
      method: 'POST',
      body: bodyStr,
      headers: { 'Content-Type': 'application/json' },
    } as any)

    const res = await POST(req)
    expect(res.status).toBe(400)
    const respBody = (await res.json()) as any
    expect(respBody.error).toMatch(/missing signature/i)
  })

  it('should mark a matching RevenueEvent as recovered on payment.captured webhook', async () => {
    const merchant = await createTestMerchant()
    const event = await createTestEvent(merchant.id, {
      razorpayRefId: 'pay_to_capture_001',
      status: 'executing',
      amount: 20000,
    })

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: 'pay_to_capture_001', amount: 20000, currency: 'INR' },
        },
      },
    }

    const { status, body } = await callWebhook(payload)

    expect(status).toBe(200)
    expect(body.received).toBe(true)

    const updated = await prisma.revenueEvent.findUnique({ where: { id: event.id } })
    expect(updated!.status).toBe('recovered')
    expect(updated!.resolvedAt).not.toBeNull()

    const audit = await prisma.auditEntry.findFirst({
      where: { eventId: event.id, decision: 'RECOVERED' },
    })
    expect(audit).not.toBeNull()
  })

  it('should create a mandate_failed event on subscription.charged.failed webhook', async () => {
    await createTestMerchant()

    const payload = {
      event: 'subscription.charged.failed',
      payload: {
        subscription: {
          entity: { id: 'sub_mandate_fail_001', status: 'halted' },
        },
        payment: { entity: { amount: 15000 } },
      },
    }

    const { status, body } = await callWebhook(payload)

    expect(status).toBe(200)
    expect(body.received).toBe(true)

    const event = await prisma.revenueEvent.findFirst({
      where: { razorpayRefId: 'sub_mandate_fail_001' },
    })
    expect(event).not.toBeNull()
    expect(event!.type).toBe('mandate_failed')
    expect(event!.status).toBe('detected')
  })

  it('should not duplicate events when the same webhook is received twice (idempotency)', async () => {
    await createTestMerchant()

    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_idempotent_001',
            amount: 10000,
            currency: 'INR',
            error_source: 'bank',
            error_step: 'payment_response',
            error_reason: 'bank_technical_error',
          },
        },
      },
    }

    await callWebhook(payload)
    await callWebhook(payload)

    const events = await prisma.revenueEvent.findMany({
      where: { razorpayRefId: 'pay_idempotent_001' },
    })
    expect(events).toHaveLength(1)
  })
})
