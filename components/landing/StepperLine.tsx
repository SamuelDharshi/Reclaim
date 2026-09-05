'use client'

import { motion } from 'framer-motion'

export function StepperLine({ steps }: { steps: number }) {
  // A horizontal connector line spanning `steps` evenly-spaced nodes, drawn on scroll.
  const width = 1000
  const y = 1
  return (
    <svg
      viewBox={`0 0 ${width} 2`}
      preserveAspectRatio="none"
      className="hidden lg:block absolute left-0 right-0 w-full"
      style={{ top: 34, height: 2 }}
      aria-hidden
    >
      <motion.line
        x1={width / (steps * 2)}
        y1={y}
        x2={width - width / (steps * 2)}
        y2={y}
        stroke="url(#stepper-gradient)"
        strokeWidth={2}
        strokeDasharray="6 6"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <defs>
        <linearGradient id="stepper-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0D94FB" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#0D94FB" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1F9D55" stopOpacity="0.5" />
        </linearGradient>
      </defs>
    </svg>
  )
}
