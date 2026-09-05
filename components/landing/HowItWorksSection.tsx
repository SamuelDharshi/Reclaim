'use client'

import { motion } from 'framer-motion'
import { Radar, ScanSearch, ShieldCheck, Zap, ScrollText } from 'lucide-react'
import { StepperLine } from './StepperLine'

const STEPS = [
  {
    icon: Radar,
    title: 'Ingest',
    body: 'Pulls failed payments, mandate events, abandoned orders, and overdue invoices from Razorpay’s APIs in real time.',
  },
  {
    icon: ScanSearch,
    title: 'Diagnose',
    body: 'Maps every failure to Razorpay’s own error taxonomy (source, step, reason). No black boxes — every diagnosis is a named rule you can read.',
  },
  {
    icon: ShieldCheck,
    title: 'Guardrail',
    body: 'Checks NPCI retry limits, DND flags, spend caps, and cooldown windows before any action. The agent stops as visibly as it starts.',
  },
  {
    icon: Zap,
    title: 'Execute',
    body: 'Creates payment links, retries mandates, and sends recovery nudges through Razorpay’s own APIs — the same tools its dashboard uses.',
  },
  {
    icon: ScrollText,
    title: 'Audit',
    body: 'Every decision is written to an append-only, hash-chained ledger. Prove compliance without asking your engineering team.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28 px-5" style={{ background: '#04091a' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-16"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#60B4FF' }}>
            The Architecture
          </p>
          <h2 className="text-white font-bold tracking-tight text-[32px] sm:text-[40px] leading-tight">
            Signal → Diagnose → Decide → Act → Audit
          </h2>
        </motion.div>

        <div className="relative">
          <StepperLine steps={STEPS.length} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-4 relative z-10">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border p-5 flex flex-col gap-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] text-white flex-shrink-0"
                    style={{ background: '#0D94FB', boxShadow: '0 0 18px rgba(13,148,251,0.45)' }}
                  >
                    {i + 1}
                  </div>
                  <step.icon size={18} color="#94A3B8" />
                </div>
                <p className="text-white font-semibold text-[15px]">{step.title}</p>
                <p className="text-slate-400 text-[12.5px] leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
