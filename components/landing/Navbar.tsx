'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#guardrails', label: 'Guardrails' },
  { href: '#demo', label: 'Audit' },
]

function scrollTo(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: 'rgba(2,11,24,0.55)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: '#0D94FB' }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#0D94FB' }} />
          </span>
          <span className="text-white font-bold text-[16px] tracking-tight group-hover:text-blue-400 transition-colors">
            Reclaim
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-3 py-2 text-[13.5px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white transition-all hover:scale-105"
            style={{
              background: '#0D94FB',
              boxShadow: '0 0 20px rgba(13,148,251,0.35)',
            }}
          >
            Open Control Tower
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 w-72 z-50 p-6 flex flex-col gap-2"
              style={{ background: 'rgba(7,15,30,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <button onClick={() => setOpen(false)} className="self-end text-slate-400 mb-4" aria-label="Close menu">
                <X size={22} />
              </button>
              {LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    setOpen(false)
                    scrollTo(link.href)
                  }}
                  className="text-left px-3 py-3 rounded-lg text-slate-200 hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <Link
                href="/dashboard"
                className="mt-4 text-center px-4 py-3 rounded-lg font-semibold text-white"
                style={{ background: '#0D94FB' }}
              >
                Open Control Tower
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
