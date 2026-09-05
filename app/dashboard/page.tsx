'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useReclaimStore } from '@/lib/store'
import { formatINR } from '@/lib/types'
import { BatchRunButton } from '@/components/BatchRunButton'
import { SankeyDiagram } from '@/components/SankeyDiagram'
import { CategoryTile } from '@/components/CategoryTile'

export default function ControlTowerHome() {
  const { analytics, fetchAnalytics, fetchMerchant } = useReclaimStore()

  useEffect(() => {
    fetchMerchant()
    fetchAnalytics()
  }, [fetchAnalytics, fetchMerchant])

  const hasData = (analytics?.totalEvents ?? 0) > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <motion.div
        className="glass-panel p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row gap-10">
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-2">Revenue at Risk Right Now</p>
            <p className="hero-number" style={{ color: '#FFB940' }}>
              {formatINR(analytics?.totalAtRisk ?? 0)}
            </p>
          </div>
          <div className="hidden md:block w-px self-stretch" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <p className="text-muted text-[11px] uppercase tracking-widest mb-2">Recovered Today</p>
            <p className="hero-number glow-green">{formatINR(analytics?.totalRecovered ?? 0)}</p>
          </div>
        </div>

        <BatchRunButton />
      </motion.div>

      {/* Sankey flow */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-bright font-semibold text-[14px]">Money Flow</p>
            <p className="text-muted text-[11px]">
              Total at risk → recovery surface → outcome, aggregated from real revenue events
            </p>
          </div>
        </div>
        <SankeyDiagram categories={analytics?.categories ?? []} />
      </div>

      {/* Category tiles */}
      <div>
        <p className="text-bright font-semibold text-[14px] mb-3">Recovery Surfaces</p>
        {hasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(analytics?.categories ?? []).map((c, i) => (
              <CategoryTile key={c.type} metrics={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-10 text-center">
            <p className="text-bright font-medium mb-1">No events detected</p>
            <p className="text-muted text-[13px]">
              Click &ldquo;Run Batch&rdquo; above to ingest failed payments, abandoned checkouts, and mandate
              failures from your Razorpay test account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
