/**
 * tests/helpers.ts
 *
 * Shared test utilities: DB seeders, route caller, webhook signer.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// Use the same test DB as setup.ts
export const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./test.db' } },
})

// ─────────────────────────────────────────
// DB Helpers
// ─────────────────────────────────────────

export async function createTestMerchant(overrides: Record<string, any> = {}) {
  return prisma.merchant.create({
    data: {
      name: 'Test Merchant',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_dummy_key',
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? 'dummy_secret',
      guardrailConfig: '{}',
      ...overrides,
    },
  })
}

export async function createTestEvent(
  merchantId: string,
  overrides: Record<string, any> = {}
) {
  return prisma.revenueEvent.create({
    data: {
      merchantId,
      type: 'payment_failed',
      amount: 50000, // ₹500 in paise
      currency: 'INR',
      razorpayRefId: `pay_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'detected',
      rawError: JSON.stringify({
        error_source: 'bank',
        error_step: 'payment_response',
        error_reason: 'bank_technical_error',
      }),
      ...overrides,
    },
  })
}

export async function createTestRootCause(
  eventId: string,
  overrides: Record<string, any> = {}
) {
  return prisma.rootCause.create({
    data: {
      eventId,
      category: 'transient_bank',
      confidence: 0.91,
      ruleFired: 'R-002',
      proposedAction: 'send_payment_link',
      ...overrides,
    },
  })
}

export async function createTestIntervention(
  eventId: string,
  overrides: Record<string, any> = {}
) {
  return prisma.intervention.create({
    data: {
      eventId,
      proposedAction: 'send_payment_link',
      requiresHuman: false,
      guardrailResult: JSON.stringify({ passed: true }),
      ...overrides,
    },
  })
}

export async function seedTestEvents(
  merchantId: string,
  count: number,
  type = 'payment_failed',
  overrides: Record<string, any> = {}
) {
  const events = []
  for (let i = 0; i < count; i++) {
    const event = await createTestEvent(merchantId, {
      type,
      razorpayRefId: `pay_seed_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      ...overrides,
    })
    events.push(event)
  }
  return events
}

// ─────────────────────────────────────────
// Route Caller
// ─────────────────────────────────────────

type RouteHandler = (req: NextRequest, ctx?: { params: Record<string, string> }) => Promise<Response>

export async function callRoute(
  handler: RouteHandler,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: unknown,
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  const url = 'http://localhost:3000/api/test'
  const reqInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }
  if (body !== undefined) {
    reqInit.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const req = new NextRequest(url, reqInit)
  const ctx = Object.keys(params).length > 0 ? { params } : undefined
  const res = await handler(req, ctx)
  const responseBody: any = await res.json()
  return { status: res.status, body: responseBody }
}

/** Build a NextRequest with a raw string body (for webhook tests) */
export function buildWebhookRequest(
  payload: unknown,
  secret: string,
  overrideSignature?: string
): NextRequest {
  const bodyStr = JSON.stringify(payload)
  const sig = overrideSignature ?? computeWebhookSignature(secret, bodyStr)
  return new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': sig,
    },
    body: bodyStr,
  } as any)
}

export function computeWebhookSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// ─────────────────────────────────────────
// Audit Helper
// ─────────────────────────────────────────

export async function getAuditChain(eventId: string) {
  return prisma.auditEntry.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  })
}
