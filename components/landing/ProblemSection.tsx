'use client'

import { motion } from 'framer-motion'
import { CreditCard, ShoppingCart, RefreshCw, FileText } from 'lucide-react'

const PROBLEMS = [
  {
    icon: CreditCard,
    color: '#0D94FB',
    title: 'Card Declines',
    body: "Card failures, bank timeouts, 3DS drop-offs. You see “payment failed.” Reclaim sees “bank technical error at authentication step — retry in 4 hours.”",
  },
  {
    icon: ShoppingCart,
    color: '#F5A524',
    title: 'Abandoned Carts',
    body: 'Customers start checkout, get distracted, never return. No error is fired. Reclaim detects silence and sends a timed nudge.',
  },
  {
    icon: RefreshCw,
    color: '#1F9D55',
    title: 'Failed Mandates',
    body: 'UPI Autopay debits fail for insufficient funds. NPCI allows 3 retries in specific windows. Reclaim sequences them compliantly.',
  },
  {
    icon: FileText,
    color: '#64748B',
    title: 'Overdue Invoices',
    body: 'B2B receivables go overdue because someone forgot, not because they refused. Reclaim chases with an escalation ladder.',
  },
]

export function ProblemSection() {
  return (
    <section className="relative py-28 px-5" style={{ background: '#020617' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mb-14"
        >
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
            style={{ color: '#60B4FF' }}
          >
            The Revenue Leak
          </p>
          <h2 className="text-white font-bold tracking-tight text-[32px] sm:text-[40px] leading-tight">
            Money disappears in four places. You&rsquo;re only watching one.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${p.color}`,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${p.color}1A` }}
              >
                <p.icon size={19} color={p.color} />
              </div>
              <p className="text-white font-semibold text-[16px] mb-2">{p.title}</p>
              <p className="text-slate-400 text-[13.5px] leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
