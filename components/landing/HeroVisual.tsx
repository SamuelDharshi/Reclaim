'use client'

import { motion } from 'framer-motion'

export function HeroVisual() {
  return (
    <motion.div
      className="relative w-full max-w-md mx-auto"
      style={{ perspective: 1200 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="rounded-3xl border p-5"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(255,255,255,0.10)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
          transformStyle: 'preserve-3d',
        }}
        animate={{
          rotateY: [-6, -3, -6],
          rotateX: [4, 6, 4],
          y: [0, -10, 0],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F87171' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5A524' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4CAF84' }} />
          <span className="ml-3 text-[11px] text-slate-400 font-mono">reclaim / control-tower</span>
        </div>

        {/* mini sankey */}
        <svg viewBox="0 0 280 140" className="w-full h-auto">
          <rect x="8" y="10" width="10" height="120" rx="3" fill="#0D94FB" />
          <path d="M18,20 C90,20 90,35 160,35 L160,55 C90,55 90,30 18,30 Z" fill="rgba(31,157,85,0.35)" />
          <path d="M18,50 C90,50 90,75 160,75 L160,100 C90,100 90,60 18,60 Z" fill="rgba(245,165,36,0.3)" />
          <path d="M18,110 C90,110 90,118 160,118 L160,132 C90,132 90,120 18,120 Z" fill="rgba(100,116,139,0.3)" />

          <rect x="160" y="30" width="10" height="30" rx="3" fill="#1F9D55" />
          <rect x="160" y="65" width="10" height="35" rx="3" fill="#F5A524" />
          <rect x="160" y="112" width="10" height="20" rx="3" fill="#64748B" />

          <text x="180" y="48" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">
            Recovered
          </text>
          <text x="180" y="86" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">
            Pending
          </text>
          <text x="180" y="126" fill="#94A3B8" fontSize="10" fontFamily="Inter, sans-serif">
            Stopped
          </text>
        </svg>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">At Risk</p>
            <p className="text-[15px] font-bold text-white tabular-nums">₹18.2L</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Recovered</p>
            <p className="text-[15px] font-bold tabular-nums" style={{ color: '#4CAF84' }}>
              ₹6.4L
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
