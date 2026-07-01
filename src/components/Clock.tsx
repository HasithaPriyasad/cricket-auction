'use client'
import { useClock } from '@/hooks/useClock'

interface Props {
  className?: string
}

export function Clock({ className }: Props) {
  const now = useClock()
  if (!now) return <div className={className} />
  let h = now.getHours()
  const m = now.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return (
    <div className={className}>
      {h}:{String(m).padStart(2, '0')}{' '}
      <span style={{ fontSize: '0.65em', opacity: 0.7 }}>{ap}</span>
    </div>
  )
}
