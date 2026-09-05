'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { FloatingOrbs } from './FloatingOrbs'
import { HeroVisual } from './HeroVisual'
import { CountUp } from './CountUp'

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function HeroSection() {
  return (
    <section
      id="product"
      className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(12,36,81,0.95) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 60%, rgba(13,148,251,0.15) 0%, transparent 60%), #020617',
      }}
    >
      <FloatingOrbs />

      <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.h1
            variants={item}
            className="font-cormorant italic text-white font-semibold tracking-tight leading-[1.05] text-5xl sm:text-7xl lg:text-[5.2rem] xl:text-[5.8rem]"
          >
            Every rupee that leaks out of your revenue{' '}
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #0D94FB 45%, #4CAF84 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 35px rgba(13,148,251,0.4))',
              }}
            >
              finds its way back.
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 text-slate-300 text-[15.5px] leading-relaxed max-w-xl">
            Reclaim is an autonomous revenue recovery agent for Razorpay merchants. It diagnoses why
            payments fail, decides the right recovery move, executes through Razorpay&rsquo;s own APIs,
            and proves every action in a tamper-evident audit ledger.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => scrollTo('#demo')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white transition-all duration-300 hover:scale-105"
              style={{ background: '#0D94FB', boxShadow: '0 0 25px rgba(13,148,251,0.4)' }}
            >
              Watch the Demo <ArrowRight size={17} />
            </button>
            <button
              onClick={() => scrollTo('#how-it-works')}
              className="px-7 py-3.5 rounded-xl font-medium text-sm sm:text-base text-white border transition-all hover:bg-white/10"
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
              }}
            >
              Read the Architecture &rarr;
            </button>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border p-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div>
              <p className="text-[18px] font-bold tabular-nums" style={{ color: '#4CAF84' }}>
                <CountUp target={2.4} decimals={1} prefix="₹" suffix="Cr+" />
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Simulated recovered</p>
            </div>
            <div>
              <p className="text-[18px] font-bold text-white tabular-nums">
                <CountUp target={4} />
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Recovery surfaces</p>
            </div>
            <div>
              <p className="text-[18px] font-bold text-white">NPCI</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Compliant retries</p>
            </div>
            <div>
              <p className="text-[18px] font-bold text-white">Hash-chained</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Audit ledger</p>
            </div>
          </motion.div>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  )
}
