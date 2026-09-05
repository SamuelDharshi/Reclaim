'use client'

import { useEffect, useState } from 'react'
import { useReclaimStore } from '@/lib/store'
import { formatINRCompact } from '@/lib/types'

export function TopBar() {
  const { analytics, fetchAnalytics, merchantName, fetchMerchant } = useReclaimStore()
  const [displayAtRisk, setDisplayAtRisk] = useState(0)
  const [displayRecovered, setDisplayRecovered] = useState(0)

  useEffect(() => {
    fetchMerchant()
    fetchAnalytics()
    
    // Refresh analytics every 30s
    const interval = setInterval(() => fetchAnalytics(), 30000)
    return () => clearInterval(interval)
  }, [fetchAnalytics, fetchMerchant])

  // Animate number on change
  useEffect(() => {
    if (!analytics) return
    const targetAtRisk = analytics.totalAtRisk
    const targetRecovered = analytics.totalRecovered
    const steps = 20
    const duration = 600
    const stepTime = duration / steps

    let step = 0
    const startAtRisk = displayAtRisk
    const startRecovered = displayRecovered

    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      setDisplayAtRisk(Math.round(startAtRisk + (targetAtRisk - startAtRisk) * eased))
      setDisplayRecovered(Math.round(startRecovered + (targetRecovered - startRecovered) * eased))

      if (step >= steps) clearInterval(timer)
    }, stepTime)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics?.totalAtRisk, analytics?.totalRecovered])

  return (
    <header
      className="glass-topbar flex items-center justify-between px-6 py-3 z-10 flex-shrink-0"
      style={{ height: '56px' }}
    >
      {/* Left: Merchant name */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-subtle text-[11px] leading-none mb-0.5">Merchant</p>
          <p className="text-bright font-semibold text-[13px] leading-none">
            {merchantName ?? 'Reclaim Demo Merchant'}
          </p>
        </div>
      </div>

      {/* Center: Live metrics */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-muted text-[10px] uppercase tracking-widest mb-0.5">At Risk</p>
          <p className="num font-bold text-[16px]" style={{ color: '#FFB940' }}>
            {formatINRCompact(displayAtRisk)}
          </p>
        </div>
        <div
          className="w-px h-6"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div className="text-center">
          <p className="text-muted text-[10px] uppercase tracking-widest mb-0.5">Recovered</p>
          <p className="num font-bold text-[16px] glow-green">
            {formatINRCompact(displayRecovered)}
          </p>
        </div>
        <div
          className="w-px h-6"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        <div className="text-center">
          <p className="text-muted text-[10px] uppercase tracking-widest mb-0.5">Recovery Rate</p>
          <p className="num font-bold text-[16px] glow-blue">
            {analytics?.overallRecoveryRate ?? 0}%
          </p>
        </div>
      </div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-2.5">
        <div className="live-dot" />
        <div>
          <p className="text-subtle text-[12px] font-medium">Test Mode</p>
          <p className="text-muted text-[10px]">rzp_test_TXR...</p>
        </div>
      </div>
    </header>
  )
}
