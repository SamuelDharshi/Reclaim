'use client'

import { useEffect, useState } from 'react'

interface Merchant {
  id: string
  name: string
  razorpayKeyId: string
  createdAt: string
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null)

  useEffect(() => {
    fetch('/api/merchant')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMerchant)
      .catch(() => setMerchant(null))
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-bright font-semibold text-[16px]">Settings</p>
        <p className="text-muted text-[12px]">Merchant identity and connection details.</p>
      </div>

      <div className="glass-panel p-6 flex flex-col gap-4 max-w-xl">
        <div>
          <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Merchant Name</p>
          <p className="text-bright text-[14px] font-medium">{merchant?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Razorpay Key ID (Test Mode)</p>
          <p className="font-mono text-[13px] text-subtle">{merchant?.razorpayKeyId ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted text-[11px] uppercase tracking-widest mb-1">Connection Status</p>
          <div className="flex items-center gap-2">
            <div className="live-dot" />
            <span className="text-subtle text-[13px]">Connected to Razorpay test mode</span>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 max-w-xl">
        <p className="text-bright font-medium text-[13.5px] mb-2">About Reclaim</p>
        <p className="text-muted text-[12.5px] leading-relaxed">
          Reclaim watches failed payments, abandoned checkouts, failed mandates, and overdue invoices,
          diagnoses root causes against Razorpay&rsquo;s real error taxonomy, checks every proposed action
          against a guardrail engine, executes recovery via Razorpay&rsquo;s APIs, and writes a
          tamper-evident, hash-chained audit entry for every decision — pass or fail.
        </p>
      </div>
    </div>
  )
}
