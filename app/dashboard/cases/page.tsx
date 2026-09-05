'use client'

import { useEffect, useMemo, useState } from 'react'
import { useReclaimStore } from '@/lib/store'
import { CaseCard } from '@/components/CaseCard'
import { getCategoryLabel } from '@/lib/types'
import type { RootCauseCategory } from '@/lib/types'

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'detected', label: 'Detected', statuses: ['detected'] },
  { key: 'diagnosed', label: 'Diagnosed', statuses: ['diagnosed'] },
  { key: 'executing', label: 'Executing', statuses: ['executing'] },
  { key: 'recovered', label: 'Recovered', statuses: ['recovered'] },
  { key: 'stopped', label: 'Stopped / Escalated', statuses: ['stopped', 'escalated'] },
]

const ALL_CATEGORIES: RootCauseCategory[] = [
  'auth_failed',
  'transient_bank',
  'insufficient_funds',
  'abandoned',
  'mandate_retry',
  'overdue',
  'ambiguous',
  'merchant_config',
]

export default function CaseQueuePage() {
  const { events, fetchEvents, eventsLoading } = useReclaimStore()
  const [category, setCategory] = useState<string>('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (category !== 'all' && e.rootCause?.category !== category) return false
      const rupees = e.amount / 100
      if (minAmount && rupees < Number(minAmount)) return false
      if (maxAmount && rupees > Number(maxAmount)) return false
      return true
    })
  }, [events, category, minAmount, maxAmount])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-bright font-semibold text-[16px]">Case Queue</p>
          <p className="text-muted text-[12px]" title="States are agent-reported, not editable.">
            States are agent-reported, not editable — this board mirrors the backend state machine.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-glass-input"
            style={{ width: 'auto' }}
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {getCategoryLabel(c)}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min ₹"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="bg-glass-input"
            style={{ width: 90 }}
          />
          <input
            type="number"
            placeholder="Max ₹"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="bg-glass-input"
            style={{ width: 90 }}
          />
        </div>
      </div>

      {eventsLoading && events.length === 0 ? (
        <div className="glass-panel p-10 text-center text-muted text-[13px]">Loading cases...</div>
      ) : events.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <p className="text-bright font-medium mb-1">No events detected</p>
          <p className="text-muted text-[13px]">
            Run a batch from the Control Tower to ingest events from Razorpay.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colEvents = filtered.filter((e) => col.statuses.includes(e.status))
            return (
              <div key={col.key} className="kanban-column p-3 flex flex-col gap-2.5 min-w-0">
                <div className="flex items-center justify-between px-1 mb-1">
                  <p className="text-subtle font-semibold text-[12px] uppercase tracking-wide">{col.label}</p>
                  <span className="badge badge-slate">{colEvents.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {colEvents.map((e, i) => (
                    <CaseCard key={e.id} event={e} index={i} />
                  ))}
                  {colEvents.length === 0 && (
                    <p className="text-muted text-[11px] px-1 py-4 text-center">No cases</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
