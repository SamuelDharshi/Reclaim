'use client'

import { motion } from 'framer-motion'
import type { CategoryMetrics } from '@/lib/types'
import { formatINRCompact } from '@/lib/types'

const CATEGORY_ICONS: Record<string, string> = {
  payment_failed: '💳',
  mandate_failed: '🔄',
  abandoned: '🛒',
  receivable_overdue: '📄',
}

export function CategoryTile({ metrics, index }: { metrics: CategoryMetrics; index: number }) {
  const isLive = metrics.totalAtRisk > 0
  const hasData = metrics.totalEvents > 0

  return (
    <motion.div
      className="glass-card p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{CATEGORY_ICONS[metrics.type] ?? '💠'}</span>
          <p className="text-subtle text-[12.5px] font-semibold">{metrics.label}</p>
        </div>
        {isLive && <div className="live-dot amber" title="Cases processing" />}
      </div>

      <div>
        <p className="text-muted text-[10px] uppercase tracking-wider mb-1">At Risk</p>
        <p className="num font-bold text-[22px] text-bright">
          {formatINRCompact(metrics.totalAtRisk)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Recovered</p>
          <p className="num font-semibold text-[14px] glow-green">
            {formatINRCompact(metrics.totalRecovered)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted text-[10px] uppercase tracking-wider mb-1">Recovery Rate</p>
          <p className="num font-semibold text-[14px]" style={{ color: '#60B4FF' }}>
            {metrics.recoveryRate}%
          </p>
        </div>
      </div>

      <div className="confidence-bar-track">
        <motion.div
          className="confidence-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${metrics.recoveryRate}%` }}
          transition={{ duration: 0.6, delay: index * 0.06 + 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-muted text-[11px]">{metrics.totalEvents} cases</span>
        {metrics.avgTimeToRecovery !== null ? (
          <span className="text-muted text-[11px]">
            avg {metrics.avgTimeToRecovery}m to recover
          </span>
        ) : hasData ? (
          <span className="text-muted text-[11px]">no recoveries yet</span>
        ) : null}
      </div>
    </motion.div>
  )
}
