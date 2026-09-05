'use client'

import { useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useReclaimStore } from '@/lib/store'
import { formatINRCompact } from '@/lib/types'

const PIE_COLORS = ['#F5A524', '#0D94FB', '#64748B', '#1F9D55', '#F87171']

export default function AnalyticsPage() {
  const { analytics, fetchAnalytics } = useReclaimStore()

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (!analytics) {
    return <div className="glass-panel p-10 text-center text-muted text-[13px]">Loading analytics...</div>
  }

  if (analytics.totalEvents === 0) {
    return (
      <div className="glass-panel p-10 text-center">
        <p className="text-bright font-medium mb-1">No data yet</p>
        <p className="text-muted text-[13px]">Run a batch to generate real analytics from your Razorpay data.</p>
      </div>
    )
  }

  const recoveryData = analytics.categories.map((c) => ({
    label: c.label,
    recoveryRate: c.recoveryRate,
  }))

  const timeData = analytics.categories
    .filter((c) => c.avgTimeToRecovery !== null)
    .map((c) => ({ label: c.label, minutes: c.avgTimeToRecovery }))

  const blockReasonData = Object.entries(analytics.guardrailBlockReasons).map(([rule, count]) => ({
    name: rule,
    value: count,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-bright font-semibold text-[16px]">Analytics</p>
        <p className="text-muted text-[12px]">Derived entirely from the events in your database — no estimates.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-muted text-[10.5px] uppercase tracking-widest mb-1">Overall Recovery Rate</p>
          <p className="num font-bold text-[22px] glow-blue">{analytics.overallRecoveryRate}%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-muted text-[10.5px] uppercase tracking-widest mb-1">Guardrail Block Rate</p>
          <p className="num font-bold text-[22px] text-bright">{analytics.guardrailBlockRate}%</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-muted text-[10.5px] uppercase tracking-widest mb-1">Total Recovered</p>
          <p className="num font-bold text-[22px] glow-green">{formatINRCompact(analytics.totalRecovered)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-muted text-[10.5px] uppercase tracking-widest mb-1">Total Events</p>
          <p className="num font-bold text-[22px] text-bright">{analytics.totalEvents}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5">
          <p className="text-bright font-semibold text-[13.5px] mb-4">Recovery Rate by Category</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recoveryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="recoveryRate" fill="#0D94FB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-5">
          <p className="text-bright font-semibold text-[13.5px] mb-4">Avg Time to Recovery (minutes)</p>
          {timeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="minutes" fill="#1F9D55" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted text-[13px]">
              No recoveries yet — this fills in once cases resolve.
            </div>
          )}
        </div>

        <div className="glass-panel p-5">
          <p className="text-bright font-semibold text-[13.5px] mb-4">Guardrail Block Reasons</p>
          {blockReasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={blockReasonData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {blockReasonData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted text-[13px]">
              No stopped cases yet — a non-zero block rate is a sign of real guardrails, not their absence.
            </div>
          )}
        </div>

        <div className="glass-panel p-5">
          <p className="text-bright font-semibold text-[13.5px] mb-4">Category Breakdown</p>
          <div className="flex flex-col gap-3">
            {analytics.categories.map((c) => (
              <div key={c.type} className="flex items-center justify-between">
                <span className="text-subtle text-[12.5px]">{c.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted text-[11.5px]">{c.totalEvents} events</span>
                  <span className="num text-[12.5px] font-medium" style={{ color: '#4CAF84' }}>
                    {formatINRCompact(c.totalRecovered)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
