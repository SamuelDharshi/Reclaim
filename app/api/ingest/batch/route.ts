import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchFailedPayments, fetchOrders, fetchPaymentsForOrder, fetchSubscriptions } from '@/lib/razorpay'
import { createAuditEntry } from '@/lib/audit'

export async function POST() {
  try {
    // Get or create the default merchant
    let merchant = await prisma.merchant.findFirst()
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          name: 'Reclaim Demo Merchant',
          razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
          razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET!,
          guardrailConfig: '{}',
        },
      })
    }

    const merchantId = merchant.id
    let ingested = 0

    // ---- 1. Failed Payments ----
    const fromTimestamp = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000) // last 7 days
    const failedPayments = await fetchFailedPayments(fromTimestamp)

    for (const payment of failedPayments) {
      // Check if already ingested
      const existing = await prisma.revenueEvent.findFirst({
        where: { razorpayRefId: payment.id, merchantId },
      })
      if (existing) continue

      const rawError = JSON.stringify({
        error_code: payment.error_code,
        error_description: payment.error_description,
        error_source: payment.error_source,
        error_step: payment.error_step,
        error_reason: payment.error_reason,
        error_metadata: payment.error_metadata,
      })

      const event = await prisma.revenueEvent.create({
        data: {
          merchantId,
          type: 'payment_failed',
          amount: payment.amount,
          currency: payment.currency,
          razorpayRefId: payment.id,
          customerEmail: payment.email,
          customerPhone: payment.contact,
          rawError,
          status: 'detected',
          detectedAt: new Date(payment.created_at * 1000),
        },
      })

      await createAuditEntry({
        eventId: event.id,
        actor: 'system',
        decision: 'DETECTED',
        reason: `payment.failed ingested from Razorpay. source=${payment.error_source ?? 'unknown'} reason=${payment.error_reason ?? 'unknown'} amount=₹${(payment.amount / 100).toFixed(0)}`,
      })

      ingested++
    }

    // ---- 2. Abandoned Checkouts ----
    const thirtyMinutesAgo = Math.floor((Date.now() - 30 * 60 * 1000) / 1000)
    const orders = await fetchOrders(100)

    for (const order of orders) {
      // Only consider orders created > 30 min ago with no payments
      if (order.created_at > thirtyMinutesAgo) continue
      if (order.status !== 'created') continue
      if (order.amount_paid > 0) continue

      // Check if already ingested
      const existing = await prisma.revenueEvent.findFirst({
        where: { razorpayRefId: order.id, merchantId },
      })
      if (existing) continue

      // Verify no successful payments for this order
      const payments = await fetchPaymentsForOrder(order.id)
      const hasSuccessfulPayment = payments.some((p) => p.status === 'captured')
      if (hasSuccessfulPayment) continue

      const event = await prisma.revenueEvent.create({
        data: {
          merchantId,
          type: 'abandoned',
          amount: order.amount,
          currency: order.currency,
          razorpayRefId: order.id,
          status: 'detected',
          detectedAt: new Date(),
        },
      })

      await createAuditEntry({
        eventId: event.id,
        actor: 'system',
        decision: 'DETECTED',
        reason: `Abandoned checkout detected. Order ${order.id} created ${Math.round((Date.now() / 1000 - order.created_at) / 60)} minutes ago with no payment. amount=₹${(order.amount / 100).toFixed(0)}`,
      })

      ingested++
    }

    // ---- 3. Failed Subscriptions / Mandates ----
    const subscriptions = await fetchSubscriptions(100)
    const failedSubs = subscriptions.filter(
      (s) => s.status === 'halted' || s.status === 'cancelled'
    )

    for (const sub of failedSubs) {
      const existing = await prisma.revenueEvent.findFirst({
        where: { razorpayRefId: sub.id, merchantId },
      })
      if (existing) continue

      // Estimate amount from plan (we don't always have it, use 0 if unknown)
      const event = await prisma.revenueEvent.create({
        data: {
          merchantId,
          type: 'mandate_failed',
          amount: 0, // Will be updated if payment data available
          razorpayRefId: sub.id,
          rawError: JSON.stringify({ subscription_status: sub.status }),
          status: 'detected',
          detectedAt: new Date(),
        },
      })

      await createAuditEntry({
        eventId: event.id,
        actor: 'system',
        decision: 'DETECTED',
        reason: `mandate_failed ingested. Subscription ${sub.id} status=${sub.status}. paid=${sub.paid_count}/${sub.total_count}`,
      })

      ingested++
    }

    return NextResponse.json({ success: true, ingested })
  } catch (err) {
    console.error('ingest/batch error:', err)
    return NextResponse.json(
      { error: 'Ingestion failed', details: String(err) },
      { status: 500 }
    )
  }
}
