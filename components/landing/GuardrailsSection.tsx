'use client'

import { motion } from 'framer-motion'

const RULES = [
  {
    title: 'Max Attempts',
    body: '3 nudges max, 4 hours apart, never the same channel twice.',
  },
  {
    title: 'Spend Caps',
    body: 'Invoices above ₹1,00,000 route to human approval before the first message is sent.',
  },
  {
    title: 'NPCI Compliance',
    body: 'Mandate retries respect the 1+3 attempt cap, non-peak windows, and pre-debit notice rules.',
  },
]

function GuardrailSwitch({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-4 rounded-2xl border p-5"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <motion.div
        className="relative flex-shrink-0 rounded-full p-0.5"
        style={{ width: 44, height: 24, background: 'rgba(255,255,255,0.08)' }}
        initial={false}
        whileInView={{ background: 'rgba(13,148,251,0.35)' }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ delay: index * 0.12 + 0.2, duration: 0.4 }}
      >
        <motion.div
          className="w-5 h-5 rounded-full"
          style={{ background: '#0D94FB', boxShadow: '0 0 10px rgba(13,148,251,0.7)' }}
          initial={{ x: 0 }}
          whileInView={{ x: 20 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: index * 0.12 + 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
      <div>
        <p className="text-white font-semibold text-[14.5px]">{title}</p>
        <p className="text-slate-400 text-[13px] leading-relaxed mt-0.5">{body}</p>
      </div>
    </motion.div>
  )
}

export function GuardrailsSection() {
  return (
    <section id="guardrails" className="relative py-28 px-5" style={{ background: '#020617' }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-14"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: '#60B4FF' }}>
            Bounded &amp; Gated
          </p>
          <h2 className="text-white font-bold tracking-tight text-[32px] sm:text-[40px] leading-tight">
            The agent acts by default. You set the boundaries.
          </h2>
        </motion.div>

        <div
          className="rounded-3xl border p-6 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)' }}
        >
          <div className="grid grid-cols-1 gap-4">
            {RULES.map((rule, i) => (
              <GuardrailSwitch key={rule.title} {...rule} index={i} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 rounded-2xl border-l-4 p-6"
          style={{
            background: 'rgba(100,116,139,0.08)',
            borderColor: '#64748B',
            borderTop: '1px solid rgba(100,116,139,0.2)',
            borderRight: '1px solid rgba(100,116,139,0.2)',
            borderBottom: '1px solid rgba(100,116,139,0.2)',
          }}
        >
          <p className="text-slate-200 text-[15px] leading-relaxed italic">
            &ldquo;Stopping rules are first-class UI events. A case that correctly stops is styled with the
            same weight as a case that recovers.&rdquo;
          </p>
        </motion.div>
      </div>
    </section>
  )
}
