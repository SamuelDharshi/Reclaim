'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const SLIDES = ['flow', 'kanban', 'ledger'] as const
type Slide = (typeof SLIDES)[number]

function FlowSlide() {
  return (
    <div className="flex items-center justify-center h-full px-8">
      <svg viewBox="0 0 320 140" className="w-full max-w-sm">
        <rect x="10" y="10" width="10" height="120" rx="3" fill="#0D94FB" />
        <path d="M20,20 C120,20 120,40 220,40 L220,60 C120,60 120,30 20,30 Z" fill="rgba(31,157,85,0.35)" />
        <path d="M20,55 C120,55 120,80 220,80 L220,105 C120,105 120,65 20,65 Z" fill="rgba(245,165,36,0.3)" />
        <path d="M20,115 C120,115 120,122 220,122 L220,132 C120,132 120,120 20,120 Z" fill="rgba(100,116,139,0.3)" />
        <rect x="220" y="35" width="10" height="30" rx="3" fill="#1F9D55" />
        <rect x="220" y="70" width="10" height="35" rx="3" fill="#F5A524" />
        <rect x="220" y="115" width="10" height="20" rx="3" fill="#64748B" />
        <text x="240" y="53" fill="#94A3B8" fontSize="11">Recovered</text>
        <text x="240" y="91" fill="#94A3B8" fontSize="11">Pending</text>
        <text x="240" y="128" fill="#94A3B8" fontSize="11">Stopped</text>
      </svg>
    </div>
  )
}

function KanbanSlide() {
  const cols = [
    { label: 'Diagnosed', color: '#F5A524', n: 2 },
    { label: 'Executing', color: '#0D94FB', n: 3 },
    { label: 'Recovered', color: '#1F9D55', n: 4 },
  ]
  return (
    <div className="flex gap-4 h-full px-8 py-6">
      {cols.map((col) => (
        <div key={col.label} className="flex-1 rounded-xl border p-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: col.color }}>{col.label}</p>
          <div className="flex flex-col gap-2">
            {Array.from({ length: col.n }).map((_, i) => (
              <div key={i} className="h-8 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function LedgerSlide() {
  const rows = [
    ['14:02:11', 'DETECTED', 'payment.failed  ₹2,400'],
    ['14:02:12', 'DIAGNOSED', 'category=transient_bank confidence=0.91'],
    ['14:02:12', 'GUARDRAIL', 'cooldown: PASS  spend_cap: PASS'],
    ['14:02:13', 'ACTION', 'mcp.create_payment_link → sms'],
    ['14:47:56', 'RECOVERED', 'payment.captured  ₹2,400'],
  ]
  return (
    <div className="h-full px-8 py-6 flex flex-col justify-center gap-2 font-mono text-[11px]">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-4 text-slate-400">
          <span className="text-slate-600 w-16">{r[0]}</span>
          <span style={{ color: '#60B4FF' }} className="w-24">{r[1]}</span>
          <span>{r[2]}</span>
        </div>
      ))}
    </div>
  )
}

const SLIDE_MAP: Record<Slide, React.ComponentType> = {
  flow: FlowSlide,
  kanban: KanbanSlide,
  ledger: LedgerSlide,
}

export function DemoSection() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setActive((a) => (a + 1) % SLIDES.length), 3200)
    return () => clearInterval(interval)
  }, [])

  const Current = SLIDE_MAP[SLIDES[active]]

  return (
    <section id="demo" className="relative py-28 px-5" style={{ background: '#04091a' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-12"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#60B4FF' }}>
            See It Work
          </p>
          <h2 className="text-white font-bold tracking-tight text-[32px] sm:text-[40px] leading-tight">
            The control tower is a window into an agent that is already acting.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-1.5 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F87171' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5A524' }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4CAF84' }} />
            <span className="ml-3 text-[11px] text-slate-500 font-mono">reclaim.app/dashboard</span>
          </div>
          <div className="h-[260px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Current />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {SLIDES.map((s, i) => (
              <span
                key={s}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ background: i === active ? '#0D94FB' : 'rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
        </motion.div>

        <div className="flex justify-center mt-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300"
            style={{ background: '#0D94FB', boxShadow: '0 0 30px rgba(13,148,251,0.4)' }}
          >
            Open Control Tower <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
