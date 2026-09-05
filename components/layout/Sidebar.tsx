'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Control Tower', icon: LayoutDashboard },
  { href: '/dashboard/cases', label: 'Case Queue', icon: ListChecks },
  { href: '/dashboard/guardrails', label: 'Guardrails', icon: ShieldCheck },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="glass-sidebar flex flex-col w-[240px] flex-shrink-0 p-4 z-20"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 py-3 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0D94FB 0%, #0B5FA5 100%)',
            boxShadow: '0 0 16px rgba(13, 148, 251, 0.4)',
          }}
        >
          <Zap size={16} color="white" fill="white" />
        </div>
        <div>
          <p className="text-bright font-bold text-[15px] leading-tight">Reclaim</p>
          <p className="text-muted text-[10px] leading-tight">Revenue Control Tower</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Connection status */}
      <div className="separator" />
      <div className="flex items-center gap-2 px-2 pb-2">
        <div className="live-dot" />
        <div>
          <p className="text-subtle text-[11px] font-medium">Razorpay Test Mode</p>
          <p className="text-muted text-[10px]">Connected</p>
        </div>
      </div>
    </aside>
  )
}
