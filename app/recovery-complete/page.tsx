import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function RecoveryCompletePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="glass-panel p-10 max-w-md flex flex-col items-center gap-3">
        <CheckCircle2 size={40} color="#4CAF84" />
        <p className="text-bright font-semibold text-[16px]">Payment received</p>
        <p className="text-muted text-[13px]">
          Thank you — your payment has been recorded. Razorpay will notify Reclaim via webhook, and this
          case will move to <span className="text-subtle font-medium">Recovered</span> in the control tower.
        </p>
        <Link href="/dashboard/cases" className="btn-glass mt-2">
          View Case Queue
        </Link>
      </div>
    </div>
  )
}
