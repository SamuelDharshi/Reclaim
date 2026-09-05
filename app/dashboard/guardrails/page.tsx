'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, ShieldCheck, Info } from 'lucide-react'
import { useReclaimStore } from '@/lib/store'
import type { GuardrailConfig } from '@/lib/types'

export default function GuardrailsPage() {
  const { guardrailConfig, fetchGuardrailConfig, updateGuardrailConfig, events, fetchEvents } = useReclaimStore()
  const [draft, setDraft] = useState<GuardrailConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetchGuardrailConfig()
    fetchEvents()
  }, [fetchGuardrailConfig, fetchEvents])

  useEffect(() => {
    if (guardrailConfig && !draft) setDraft(guardrailConfig)
  }, [guardrailConfig, draft])

  const wouldEscalate = useMemo(() => {
    if (!draft) return 0
    return events.filter(
      (e) =>
        ['detected', 'diagnosed', 'executing'].includes(e.status) &&
        e.amount > draft.escalateAbovePaise
    ).length
  }, [draft, events])

  if (!draft) {
    return <div className="glass-panel p-10 text-center text-muted text-[13px]">Loading guardrail config...</div>
  }

  const update = (patch: Partial<GuardrailConfig>) => setDraft({ ...draft, ...patch })

  const handleSave = async () => {
    setSaving(true)
    await updateGuardrailConfig(draft)
    setSaving(false)
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 2500)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-bright font-semibold text-[16px]">Guardrails & Policy</p>
          <p className="text-muted text-[12px]">Every rule below is checked, pass or fail, before any action fires.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={14} />
          {saving ? 'Saving...' : savedAt ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-bright font-semibold text-[13.5px]">Recovery Attempts</p>
          <p className="text-muted text-[11.5px]">Max number of recovery interventions per revenue event.</p>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.maxRecoveryAttempts}
            onChange={(e) => update({ maxRecoveryAttempts: Number(e.target.value) })}
            className="bg-glass-input"
          />
        </motion.div>

        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <p className="text-bright font-semibold text-[13.5px]">Customer Cooldown</p>
          <p className="text-muted text-[11.5px]">Minimum hours between recovery attempts for the same customer.</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={48}
              value={draft.cooldownHours}
              onChange={(e) => update({ cooldownHours: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span className="num font-semibold text-[13px]" style={{ color: '#60B4FF', minWidth: 44 }}>
              {draft.cooldownHours}h
            </span>
          </div>
        </motion.div>

        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-bright font-semibold text-[13.5px]">Human Escalation Threshold</p>
          <p className="text-muted text-[11.5px]">
            Any event above this amount routes to a human before any action fires.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-subtle">₹</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={draft.escalateAbovePaise / 100}
              onChange={(e) => update({ escalateAbovePaise: Number(e.target.value) * 100 })}
              className="bg-glass-input"
            />
          </div>
        </motion.div>

        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className="text-bright font-semibold text-[13.5px]">Spend Cap</p>
          <p className="text-muted text-[11.5px]">Ceiling on the value of any single automated recovery action.</p>
          <div className="flex items-center gap-2">
            <span className="text-subtle">₹</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={draft.spendCapPaise / 100}
              onChange={(e) => update({ spendCapPaise: Number(e.target.value) * 100 })}
              className="bg-glass-input"
            />
          </div>
        </motion.div>

        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-1.5">
            <p className="text-bright font-semibold text-[13.5px]">Mandate Retry Windows</p>
            <Info size={12} className="text-muted" />
          </div>
          <p className="text-muted text-[11.5px]">
            NPCI-compliant — max {draft.mandateMaxRetries} retries, spaced at fixed non-peak windows. Not editable.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {draft.mandateRetryWindows.map((h) => (
              <span key={h} className="badge badge-blue">
                +{h}h
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div className="glass-card p-5 flex flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <p className="text-bright font-semibold text-[13.5px]">Respect DND</p>
          <p className="text-muted text-[11.5px]">Never contact a customer flagged Do-Not-Disturb via SMS.</p>
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={draft.respectDnd}
              onChange={(e) => update({ respectDnd: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <span className="text-subtle text-[12.5px]">{draft.respectDnd ? 'Enabled' : 'Disabled'}</span>
          </label>
        </motion.div>
      </div>

      <div className="glass-panel p-5 flex items-center gap-3">
        <ShieldCheck size={18} color="#60B4FF" className="flex-shrink-0" />
        <p className="text-subtle text-[13px]">
          With these settings,{' '}
          <span className="text-bright font-semibold">
            {wouldEscalate} of your current pending case{wouldEscalate === 1 ? '' : 's'}
          </span>{' '}
          would be escalated to human approval.
        </p>
      </div>
    </div>
  )
}
