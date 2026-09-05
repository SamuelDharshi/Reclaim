'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Github, ArrowRight } from 'lucide-react'

export function FooterSection() {
  return (
    <footer className="relative" style={{ background: '#020617', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-5xl mx-auto px-5 py-24 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-white font-bold tracking-tight text-[32px] sm:text-[44px] leading-tight"
        >
          Stop watching revenue leak.
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300"
            style={{ background: '#0D94FB', boxShadow: '0 0 30px rgba(13,148,251,0.4)' }}
          >
            Get Started <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-5 pb-10">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#0D94FB' }} />
            <span className="text-white font-semibold text-[14px]">Reclaim</span>
          </div>

          <div className="flex items-center gap-6 text-[13px] text-slate-400">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Github size={14} /> GitHub
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              Documentation
            </a>
            <a
              href="https://razorpay.com/buildathon/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Razorpay Buildathon
            </a>
          </div>
        </div>

        <p className="text-center text-[12px] text-slate-500 mt-6">
          Built for the Razorpay AI Buildathon 2026. Test mode only — no real money moves.
        </p>
      </div>
    </footer>
  )
}
