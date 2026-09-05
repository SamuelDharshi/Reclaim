'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { getEventTypeLabel, getCategoryLabel, formatINR } from '@/lib/types'
import type { EventType, RootCauseCategory } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'

interface CaseCardEvent {
  id: string
  type: string
  amount: number
  status: string
  detectedAt: string
  rootCause: {
    category: string
    confidence: number
    proposedAction: string
  } | null
}

const CATEGORY_BADGE: Record<string, string> = {
  auth_failed: 'badge-amber',
  transient_bank: 'badge-blue',
  insufficient_funds: 'badge-amber',
  abandoned: 'badge-blue',
  mandate_retry: 'badge-blue',
  overdue: 'badge-amber',
  ambiguous: 'badge-slate',
  merchant_config: 'badge-slate',
}

const ACTION_LABELS: Record<string, string> = {
  send_payment_link: 'Send payment link',
  auto_retry_then_link: 'Auto-retry, then link',
  timed_nudge: 'Timed nudge sequence',
  compliant_retry: 'NPCI-compliant mandate retry',
  escalate_human: 'Escalate to human',
  stop_merchant_issue: 'Flag merchant config issue',
  no_action: 'No action — stopped',
}

export function CaseCard({ event, index }: { event: CaseCardEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link href={`/dashboard/cases/${event.id}`}>
        <div className="glass-card p-3.5 cursor-pointer flex flex-col gap-2.5">
          <div className="flex items-start justify-between">
            <span className="num font-bold text-[15px] text-bright">{formatINR(event.amount)}</span>
            <span className="text-muted text-[10.5px]">{formatRelativeTime(event.detectedAt)}</span>
          </div>

          <p className="text-subtle text-[11.5px]">{getEventTypeLabel(event.type as EventType)}</p>

          {event.rootCause && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`badge ${CATEGORY_BADGE[event.rootCause.category] ?? 'badge-slate'}`}>
                  {getCategoryLabel(event.rootCause.category as RootCauseCategory)}
                </span>
              </div>
              <div className="confidence-bar-track">
                <div
                  className="confidence-bar-fill"
                  style={{ width: `${Math.round(event.rootCause.confidence * 100)}%` }}
                />
              </div>
              <p className="text-muted text-[10.5px]">
                {ACTION_LABELS[event.rootCause.proposedAction] ?? event.rootCause.proposedAction}
              </p>
            </>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
