'use client'
import type { PlayerData } from '@/features/auction/reducer'
import s from './display.module.css'

interface IdleScreenProps {
  done: number
  total: number
  nextPlayer: PlayerData | null
  eventName: string
  logoUrl?: string
}

export function IdleScreen({ done, total, nextPlayer, eventName, logoUrl }: IdleScreenProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className={s.idle}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" style={{ width: 74, height: 74, objectFit: 'contain', borderRadius: 10, marginBottom: 14 }} />
      ) : (
        <div className={s.idleMark} />
      )}
      <div className={s.idleKicker}>{eventName.toUpperCase()}</div>
      <div className={s.idleTitle}>
        {done === 0 ? 'READY TO BEGIN' : done === total ? 'AUCTION COMPLETE' : 'AUCTION PAUSED'}
      </div>

      <div className={s.idleProgress}>
        <span>{done} of {total} lots completed</span>
        <div className={s.idleBar}>
          <div className={s.idleBarFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

    </div>
  )
}
