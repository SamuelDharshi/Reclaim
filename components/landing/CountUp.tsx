'use client'

import { useCountUp } from '@/hooks/useCountUp'

function formatIndian(n: number, decimals: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function CountUp({
  target,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 2000,
  className,
}: {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}) {
  const { ref, value } = useCountUp(target * 10 ** decimals, duration)
  const displayed = value / 10 ** decimals

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {prefix}
      {formatIndian(displayed, decimals)}
      {suffix}
    </span>
  )
}
