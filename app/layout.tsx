import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reclaim — Revenue Recovery Control Tower',
  description:
    'Autonomous revenue recovery for Razorpay merchants. Watches failed payments, abandoned checkouts, broken mandates, and overdue invoices — diagnoses, decides, and acts.',
  keywords: ['razorpay', 'revenue recovery', 'failed payments', 'mandate retry', 'fintech'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
