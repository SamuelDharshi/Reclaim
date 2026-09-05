import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { createAuditEntry } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!

    // Verify webhook signature — always required
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const { event: eventType, payload } = event

    let merchant = await prisma.merchant.findFirst()
    if (!merchant) {
      return NextResponse.json({ error: 'No merchant configured' }, { status: 404 })
    }

    switch (eventType) {
      case 'payment.failed': {
        const payment = payload.payment?.entity
        if (!payment) break

        const existing = await prisma.revenueEvent.findFirst({
          where: { razorpayRefId: payment.id },
        })
        if (existing) break

        const rawError = JSON.stringify({
          error_code: payment.error_code,
          error_source: payment.error_source,
          error_step: payment.error_step,
          error_reason: payment.error_reason,
        })

        const revenueEvent = await prisma.revenueEvent.create({
          data: {
            merchantId: merchant.id,
            type: 'payment_failed',
            amount: payment.amount,
            currency: payment.currency ?? 'INR',
            razorpayRefId: payment.id,
            customerEmail: payment.email,
            customerPhone: payment.contact,
            rawError,
            status: 'detected',
          },
        })

        await createAuditEntry({
          eventId: revenueEvent.id,
          actor: 'system',
          decision: 'DETECTED',
          reason: `payment.failed webhook received. source=${payment.error_source} reason=${payment.error_reason}`,
        })
        break
      }

      case 'payment.captured': {
        const payment = payload.payment?.entity
        if (!payment) break

        // Find matching revenue event and mark as recovered
        const revenueEvent = await prisma.revenueEvent.findFirst({
          where: { razorpayRefId: payment.id },
        })

        if (revenueEvent && revenueEvent.status !== 'recovered') {
          await prisma.revenueEvent.update({
            where: { id: revenueEvent.id },
            data: { status: 'recovered', resolvedAt: new Date() },
          })

          await createAuditEntry({
            eventId: revenueEvent.id,
            actor: 'system',
            decision: 'RECOVERED',
            reason: `payment.captured webhook received. Payment ${payment.id} captured successfully. amount=₹${(payment.amount / 100).toFixed(0)}`,
          })
        }
        break
      }

      case 'subscription.charged': {
        const subscription = payload.subscription?.entity
        if (!subscription) break

        // Find matching mandate event
        const revenueEvent = await prisma.revenueEvent.findFirst({
          where: { razorpayRefId: subscription.id, type: 'mandate_failed' },
        })

        if (revenueEvent && revenueEvent.status !== 'recovered') {
          await prisma.revenueEvent.update({
            where: { id: revenueEvent.id },
            data: { status: 'recovered', resolvedAt: new Date() },
          })

          await createAuditEntry({
            eventId: revenueEvent.id,
            actor: 'system',
            decision: 'RECOVERED',
            reason: `subscription.charged webhook received. Mandate debit successful.`,
          })
        }
        break
      }

      case 'subscription.charged.failed': {
        // Mandate debit failed — create a new mandate_failed RevenueEvent
        const subscription = payload.subscription?.entity
        if (!subscription) break

        const existing = await prisma.revenueEvent.findFirst({
          where: { razorpayRefId: subscription.id, type: 'mandate_failed' },
        })
        if (existing) break

        const revenueEvent = await prisma.revenueEvent.create({
          data: {
            merchantId: merchant.id,
            type: 'mandate_failed',
            amount: payload.payment?.entity?.amount ?? 0,
            currency: 'INR',
            razorpayRefId: subscription.id,
            rawError: JSON.stringify({ subscription_status: subscription.status ?? 'halted' }),
            status: 'detected',
          },
        })

        await createAuditEntry({
          eventId: revenueEvent.id,
          actor: 'system',
          decision: 'DETECTED',
          reason: `subscription.charged.failed webhook received. Subscription ${subscription.id} debit failed.`,
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
