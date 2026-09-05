// Shared TypeScript types for Reclaim

export type EventType = 'payment_failed' | 'mandate_failed' | 'abandoned' | 'receivable_overdue'

export type EventStatus =
  | 'detected'
  | 'diagnosed'
  | 'action_proposed'
  | 'executing'
  | 'recovered'
  | 'stopped'
  | 'escalated'

export type RootCauseCategory =
  | 'auth_failed'
  | 'transient_bank'
  | 'insufficient_funds'
  | 'abandoned'
  | 'mandate_retry'
  | 'overdue'
  | 'ambiguous'
  | 'merchant_config'

export type ProposedAction =
  | 'send_payment_link'
  | 'auto_retry_then_link'
  | 'timed_nudge'
  | 'compliant_retry'
  | 'escalate_human'
  | 'stop_merchant_issue'

export type AuditActor = 'agent' | 'human' | 'system' | 'guardrail'

export interface DiagnosisRule {
  id: string
  description: string
  condition: (event: RawEventData) => boolean
  category: RootCauseCategory
  proposedAction: ProposedAction
  confidence: number
}

export interface RawEventData {
  type: EventType
  errorSource?: string | null
  errorStep?: string | null
  errorReason?: string | null
  errorCode?: string | null
  amount: number
}

export interface GuardrailConfig {
  maxRecoveryAttempts: number
  cooldownHours: number
  spendCapPaise: number
  mandateMaxRetries: number
  respectDnd: boolean
  mandateRetryWindows: number[] // hours: [24, 72, 168]
  escalateAbovePaise: number
}

export const DEFAULT_GUARDRAIL_CONFIG: GuardrailConfig = {
  maxRecoveryAttempts: 3,
  cooldownHours: 4,
  spendCapPaise: 10000000, // ₹1,00,000
  mandateMaxRetries: 3,
  respectDnd: true,
  mandateRetryWindows: [24, 72, 168],
  escalateAbovePaise: 10000000, // ₹1,00,000
}

export interface GuardrailCheckResult {
  passed: boolean
  blockedBy?: string
  reason?: string
  requiresHuman?: boolean
}

export interface BatchProgress {
  step: string
  count?: number
  timestamp: string
}

// Analytics types
export interface CategoryMetrics {
  type: EventType
  label: string
  totalEvents: number
  totalAtRisk: number // paise — active (not yet resolved)
  totalRecovered: number // paise
  totalStopped: number // paise — blocked/stopped, not recoverable
  recoveryRate: number // 0-100%
  avgTimeToRecovery: number | null // minutes
}

export interface AnalyticsSummary {
  totalAtRisk: number // paise
  totalRecovered: number // paise
  overallRecoveryRate: number
  categories: CategoryMetrics[]
  guardrailBlockRate: number
  guardrailBlockReasons: Record<string, number>
  recentActivity: RecentActivityItem[]
  totalEvents: number
}

export interface RecentActivityItem {
  eventId: string
  type: EventType
  amount: number
  status: EventStatus
  timestamp: string
}

// Sankey data types
export interface SankeyNode {
  name: string
  value?: number
  fill?: string
}

export interface SankeyLink {
  source: number
  target: number
  value: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

// Formatting utils (shared)
export function formatINR(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees)
}

export function formatINRCompact(paise: number): string {
  const rupees = paise / 100
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`
  return `₹${rupees.toFixed(0)}`
}

export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    payment_failed: 'Card/UPI Failure',
    mandate_failed: 'Mandate Failure',
    abandoned: 'Checkout Abandonment',
    receivable_overdue: 'B2B Receivable',
  }
  return labels[type]
}

export function getCategoryLabel(category: RootCauseCategory): string {
  const labels: Record<RootCauseCategory, string> = {
    auth_failed: 'Auth Failed',
    transient_bank: 'Bank Timeout',
    insufficient_funds: 'Insufficient Funds',
    abandoned: 'Abandoned',
    mandate_retry: 'Mandate Retry',
    overdue: 'Overdue',
    ambiguous: 'Ambiguous',
    merchant_config: 'Merchant Config',
  }
  return labels[category]
}

export function getStatusColor(status: EventStatus): string {
  const colors: Record<EventStatus, string> = {
    detected: '#64748B',
    diagnosed: '#F5A524',
    action_proposed: '#F5A524',
    executing: '#0D94FB',
    recovered: '#1F9D55',
    stopped: '#64748B',
    escalated: '#F5A524',
  }
  return colors[status]
}
