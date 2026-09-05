import { prisma } from './prisma'
import type { GuardrailConfig, GuardrailCheckResult } from './types'
import { DEFAULT_GUARDRAIL_CONFIG } from './types'

/**
 * Load guardrail config for a merchant
 */
export async function getGuardrailConfig(merchantId: string): Promise<GuardrailConfig> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  })

  if (!merchant) return DEFAULT_GUARDRAIL_CONFIG

  try {
    const config = JSON.parse(merchant.guardrailConfig)
    return { ...DEFAULT_GUARDRAIL_CONFIG, ...config }
  } catch {
    return DEFAULT_GUARDRAIL_CONFIG
  }
}

/**
 * Check all guardrail rules for a given event
 * Returns a combined result — first failing rule wins
 */
export async function runGuardrailChecks(params: {
  eventId: string
  merchantId: string
  amount: number
  eventType: string
  customerId: string | null
  proposedAction: string
  config: GuardrailConfig
}): Promise<GuardrailCheckResult> {
  const { eventId, merchantId, amount, eventType, customerId, proposedAction, config } = params

  // Rule 1: Amount cap — escalate to human if above threshold
  if (amount > config.escalateAbovePaise) {
    return {
      passed: false,
      blockedBy: 'R-GUARD-001',
      reason: `Amount ₹${(amount / 100).toFixed(0)} exceeds escalation threshold ₹${(config.escalateAbovePaise / 100).toFixed(0)}. Routing to human approval.`,
      requiresHuman: true,
    }
  }

  // Rule 2: Max recovery attempts per event
  const existingInterventions = await prisma.intervention.count({
    where: { eventId },
  })
  if (existingInterventions >= config.maxRecoveryAttempts) {
    return {
      passed: false,
      blockedBy: 'R-GUARD-002',
      reason: `Max recovery attempts (${config.maxRecoveryAttempts}) reached for this event. Stopping to prevent customer harassment.`,
      requiresHuman: false,
    }
  }

  // Rule 3: Customer cooldown — max 1 retry per cooldownHours per customer
  if (customerId) {
    const recentThreshold = new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000)
    const recentCustomerInterventions = await prisma.intervention.count({
      where: {
        event: {
          merchantId,
          customerId,
        },
        decidedAt: { gte: recentThreshold },
      },
    })
    if (recentCustomerInterventions >= 1) {
      return {
        passed: false,
        blockedBy: 'R-GUARD-003',
        reason: `Customer cooldown: already contacted within last ${config.cooldownHours}h. Waiting before next attempt.`,
        requiresHuman: false,
      }
    }
  }

  // Rule 4: Mandate retry — NPCI compliance
  if (eventType === 'mandate_failed') {
    const mandateRetries = await prisma.action.count({
      where: {
        intervention: { eventId },
        mcpToolCalled: 'retry_mandate',
      },
    })
    if (mandateRetries >= config.mandateMaxRetries) {
      return {
        passed: false,
        blockedBy: 'R-GUARD-004',
        reason: `NPCI compliance: max ${config.mandateMaxRetries} mandate retries reached. Cannot exceed NPCI limit of 3 retries.`,
        requiresHuman: false,
      }
    }
  }

  // Rule 5: Merchant config error — never retry
  if (proposedAction === 'stop_merchant_issue') {
    return {
      passed: false,
      blockedBy: 'R-GUARD-005',
      reason: 'Root cause is merchant configuration error. Automated recovery not applicable — requires merchant action.',
      requiresHuman: true,
    }
  }

  // All rules passed
  return { passed: true }
}
