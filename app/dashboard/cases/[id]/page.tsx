'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, UserCheck } from 'lucide-react'
import { AuditLedger } from '@/components/AuditLedger'
import { formatINR, getEventTypeLabel, getCategoryLabel } from '@/lib/types'
import type { EventType, RootCauseCategory } from '@/lib/types'
import { formatDateIST, formatRelativeTime } from '@/lib/utils'

interface EventDetail {
  id: string
  type: string
  amount: number
  status: string
  razorpayRefId: string | null
  customerEmail: string | null
  customerPhone: string | null
  detectedAt: string
  resolvedAt: string | null
  rootCause: {
    category: string
    confidence: number
    ruleFired: string
    proposedAction: string
  } | null
  interventions: {
    id: string
    proposedAction: string
    channel: string | null
    requiresHuman: boolean
    guardrailResult: string | null
    decidedAt: string
    actions: { id: string; mcpToolCalled: string; result: string | null; resultData: string | null; executedAt: string }[]
  }[]
  auditEntries: {
    id: string
    actor: string
    decision: string
    reason: string
    prevHash: string
    hash: string
    createdAt: string
  }[]
}

const STATUS_BADGE: Record<string, string> = {
  detected: 'badge-slate',
  diagnosed: 'badge-amber',
  executing: 'badge-blue',
  recovered: 'badge-green',
  stopped: 'badge-slate',
  escalated: 'badge-amber',
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/events/${params.id}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data = await res.json()
        if (!cancelled) setEvent(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return <div className="glass-panel p-10 text-center text-muted text-[13px]">Loading case...</div>
  }

  if (notFound || !event) {
    return (
      <div className="glass-panel p-10 text-center">
        <p className="text-bright font-medium mb-1">Case not found</p>
        <Link href="/dashboard/cases" className="text-[13px]" style={{ color: '#60B4FF' }}>
          ← Back to Case Queue
        </Link>
      </div>
    )
  }

  const stoppedIntervention = event.interventions.find((i) => !i.requiresHuman && event.status === 'stopped')
  const escalatedIntervention = event.interventions.find((i) => i.requiresHuman)
  let guardrailReason: { blockedBy?: string; reason?: string } = {}
  const bannerIntervention = event.status === 'stopped' ? stoppedIntervention : escalatedIntervention
  if (bannerIntervention?.guardrailResult) {
    try {
      guardrailReason = JSON.parse(bannerIntervention.guardrailResult)
    } catch {
      guardrailReason = {}
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/cases" className="flex items-center gap-1.5 text-muted text-[12.5px] hover:text-white transition-colors w-fit">
        <ArrowLeft size={14} />
        Back to Case Queue
      </Link>

      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Amount</p>
            <p className="num font-bold text-[28px] text-bright">{formatINR(event.amount)}</p>
          </div>
          <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Status</p>
            <span className={`badge ${STATUS_BADGE[event.status] ?? 'badge-slate'}`}>{event.status}</span>
          </div>
          <div className="w-px h-10 hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="hidden sm:block">
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Type</p>
            <p className="text-subtle text-[13px]">{getEventTypeLabel(event.type as EventType)}</p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-0.5">
          <p className="text-muted text-[11px]">
            Customer: {event.customerEmail ?? event.customerPhone ?? '—'}
          </p>
          <p className="text-muted text-[11px]">Ref: {event.razorpayRefId ?? event.id.slice(0, 12)}</p>
          <p className="text-muted text-[11px]" title={formatDateIST(event.detectedAt)}>
            Detected {formatRelativeTime(event.detectedAt)}
          </p>
        </div>
      </div>

      {event.rootCause && (
        <div className="glass-panel p-5 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Root Cause</p>
            <p className="text-bright font-medium text-[14px]">
              {getCategoryLabel(event.rootCause.category as RootCauseCategory)}
            </p>
          </div>
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Confidence</p>
            <p className="num font-medium text-[14px]" style={{ color: '#60B4FF' }}>
              {Math.round(event.rootCause.confidence * 100)}%
            </p>
          </div>
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Rule Fired</p>
            <p className="font-mono text-[13px] text-subtle">{event.rootCause.ruleFired}</p>
          </div>
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Proposed Action</p>
            <p className="text-subtle text-[13px]">{event.rootCause.proposedAction}</p>
          </div>
        </div>
      )}

      {event.status === 'stopped' && (
        <div className="stopped-banner flex items-start gap-3">
          <AlertTriangle size={18} color="#94A3B8" className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-bright font-medium text-[13.5px]">
              Stopped by rule {guardrailReason.blockedBy ?? '—'}
            </p>
            <p className="text-subtle text-[12.5px] mt-0.5">
              {guardrailReason.reason ?? 'A guardrail rule halted further automated action.'} This is the
              correct outcome, not an error.
            </p>
          </div>
        </div>
      )}

      {event.status === 'escalated' && (
        <div className="escalated-banner flex items-start gap-3">
          <UserCheck size={18} color="#F5A524" className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-bright font-medium text-[13.5px]">
              Escalated to human — rule {guardrailReason.blockedBy ?? '—'}
            </p>
            <p className="text-subtle text-[12.5px] mt-0.5">
              {guardrailReason.reason ?? 'This case exceeds the agent\'s bounded authority and awaits human sign-off.'}
            </p>
          </div>
        </div>
      )}

      <AuditLedger eventId={event.id} entries={event.auditEntries} />
    </div>
  )
}
