'use client'

import { motion } from 'framer-motion'

const ORBS = [
  { size: 380, top: '5%', left: '8%', color: 'rgba(13,148,251,0.16)', duration: 9, delay: 0 },
  { size: 320, top: '55%', left: '78%', color: 'rgba(31,157,85,0.10)', duration: 11, delay: 1.2 },
  { size: 260, top: '68%', left: '18%', color: 'rgba(245,165,36,0.08)', duration: 8, delay: 2.4 },
]

export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: orb.color,
            filter: 'blur(80px)',
          }}
          animate={{ y: [0, -24, 0], x: [0, 14, 0] }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
        />
      ))}
    </div>
  )
}
