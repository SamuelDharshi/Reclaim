'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { formatTimestamp, formatDateIST } from '@/lib/utils'

interface AuditEntryRow {
  id: string
  actor: string
  decision: string
  reason: string
  prevHash: string
  hash: string
  createdAt: string
}

const ACTOR_BADGE: Record<string, string> = {
  agent: 'badge-blue',
  guardrail: 'badge-amber',
  system: 'badge-slate',
  human: 'badge-green',
}

function shortHash(hash: string) {
  return hash === '0' ? 'genesis' : hash.slice(0, 8)
}

export function AuditLedger({ eventId, entries }: { eventId: string; entries: AuditEntryRow[] }) {
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean } | null>(null)

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await fetch(`/api/ledger/${eventId}`, { method: 'POST' })
      const data = await res.json()
      setVerifyResult({ valid: data.valid })
    } catch {
      setVerifyResult({ valid: false })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="glass-panel p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-bright font-semibold text-[14px]">Audit Ledger</p>
          <p className="text-muted text-[11px]">Append-only, hash-chained — one row per decision</p>
        </div>
        <button onClick={handleVerify} disabled={verifying} className="btn-glass flex items-center gap-1.5">
          {verifying ? (
            <Loader2 size={13} className="animate-spin" />
          ) : verifyResult ? (
            verifyResult.valid ? (
              <ShieldCheck size={13} color="#4CAF84" />
            ) : (
              <ShieldAlert size={13} color="#F87171" />
            )
          ) : (
            <ShieldCheck size={13} />
          )}
          <span>
            {verifying
              ? 'Verifying...'
              : verifyResult
              ? verifyResult.valid
                ? 'Chain Verified ✓'
                : 'Tampered ✗'
              : 'Verify Chain'}
          </span>
        </button>
      </div>

      <div
        className="ledger-row"
        style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span>Time</span>
        <span>Actor</span>
        <span>Decision</span>
        <span>Reason</span>
        <span>Hash</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            className="ledger-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <span className="text-subtle" title={formatDateIST(entry.createdAt)}>
              {formatTimestamp(entry.createdAt)}
            </span>
            <span>
              <span className={`badge ${ACTOR_BADGE[entry.actor] ?? 'badge-slate'}`}>{entry.actor}</span>
            </span>
            <span className="text-bright font-medium">{entry.decision}</span>
            <span className="text-subtle" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {entry.reason}
            </span>
            <span className="text-muted" title={entry.hash}>
              {shortHash(entry.hash)}
            </span>
          </motion.div>
        ))}
        {entries.length === 0 && (
          <div className="py-8 text-center text-muted text-[13px]">No audit entries yet.</div>
        )}
      </div>
    </div>
  )
}
