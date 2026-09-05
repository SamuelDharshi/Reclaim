// Root-cause diagnosis rules — grounded in Razorpay's real error taxonomy
// Reference: razorpay.com/docs/payment-gateway/rainy-day/errors/
// Each rule maps error.source/step/reason → category → proposedAction

import type { DiagnosisRule, RawEventData } from './types'

export const DIAGNOSIS_RULES: DiagnosisRule[] = [
  {
    id: 'R-001',
    description: 'Customer auth failed during payment authentication (bad OTP, 3DS drop)',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' &&
      e.errorSource === 'customer' &&
      e.errorStep === 'payment_authentication',
    category: 'auth_failed',
    proposedAction: 'send_payment_link',
    confidence: 0.92,
  },
  {
    id: 'R-002',
    description: 'Bank technical error / timeout during payment response',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' &&
      e.errorSource === 'bank' &&
      (e.errorReason === 'bank_technical_error' ||
        e.errorReason === 'bank_not_available' ||
        e.errorReason === 'payment_timeout'),
    category: 'transient_bank',
    proposedAction: 'auto_retry_then_link',
    confidence: 0.91,
  },
  {
    id: 'R-003',
    description: 'Insufficient funds in customer account',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' &&
      (e.errorReason === 'insufficient_funds' ||
        e.errorReason === 'low_balance' ||
        e.errorCode === 'BAD_REQUEST_ERROR'),
    category: 'insufficient_funds',
    proposedAction: 'send_payment_link',
    confidence: 0.88,
  },
  {
    id: 'R-004',
    description: 'Gateway-level generic failure — ambiguous root cause',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' && e.errorSource === 'gateway',
    category: 'ambiguous',
    proposedAction: 'send_payment_link',
    confidence: 0.65,
  },
  {
    id: 'R-005',
    description: 'Payment failed at payment_response step from bank',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' &&
      e.errorSource === 'bank' &&
      e.errorStep === 'payment_response',
    category: 'transient_bank',
    proposedAction: 'auto_retry_then_link',
    confidence: 0.87,
  },
  {
    id: 'R-006',
    description: 'Abandoned checkout — order created, no payment attempted',
    condition: (e: RawEventData) => e.type === 'abandoned',
    category: 'abandoned',
    proposedAction: 'timed_nudge',
    confidence: 0.95,
  },
  {
    id: 'R-007',
    description: 'Mandate/subscription debit failed — needs compliant NPCI retry',
    condition: (e: RawEventData) => e.type === 'mandate_failed',
    category: 'mandate_retry',
    proposedAction: 'compliant_retry',
    confidence: 0.93,
  },
  {
    id: 'R-008',
    description: 'B2B receivable overdue — needs promise-to-pay chaser',
    condition: (e: RawEventData) => e.type === 'receivable_overdue',
    category: 'overdue',
    proposedAction: 'send_payment_link',
    confidence: 0.90,
  },
  {
    id: 'R-009',
    description: 'Merchant-side configuration error — not customer recoverable',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' && e.errorSource === 'business',
    category: 'merchant_config',
    proposedAction: 'stop_merchant_issue',
    confidence: 0.95,
  },
  {
    id: 'R-010',
    description: 'Customer cancelled payment explicitly',
    condition: (e: RawEventData) =>
      e.type === 'payment_failed' &&
      e.errorSource === 'customer' &&
      (e.errorReason === 'payment_cancelled' || e.errorStep === 'payment_initiation'),
    category: 'auth_failed',
    proposedAction: 'send_payment_link',
    confidence: 0.82,
  },
]

/**
 * Run diagnosis rules on a raw event data object
 * Returns the first matching rule, or a fallback ambiguous result
 */
export function diagnose(event: RawEventData): {
  rule: DiagnosisRule
  matched: boolean
} {
  for (const rule of DIAGNOSIS_RULES) {
    if (rule.condition(event)) {
      return { rule, matched: true }
    }
  }

  // Fallback: no rule matched — ambiguous
  return {
    rule: {
      id: 'R-FALLBACK',
      description: 'No rule matched — defaulting to ambiguous classification',
      condition: () => true,
      category: 'ambiguous',
      proposedAction: 'send_payment_link',
      confidence: 0.5,
    },
    matched: false,
  }
}
