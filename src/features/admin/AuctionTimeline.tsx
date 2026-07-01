'use client'
import type { HistoryEntry } from '@/features/auction/types'
import type { TeamData } from '@/features/auction/reducer'
import s from './admin.module.css'

function simTime(min: number): string {
  const total = 19 * 60 + (min || 0)
  let h = Math.floor(total / 60) % 24
  const m = total % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

const KIND_CLASS: Record<string, string> = {
  bid: s.crTlRowBid,
  sold: s.crTlRowSold,
  unsold: s.crTlRowUnsold,
}

interface AuctionTimelineProps {
  history: HistoryEntry[]
  teams: TeamData[]
}

export function AuctionTimeline({ history, teams }: AuctionTimelineProps) {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  return (
    <div className={s.crTimeline}>
      <div className={s.crTlKey}>Auction Timeline</div>
      <div className={s.crTlList}>
        {history.length === 0 && (
          <div className={s.crTlEmpty}>Timeline will appear as the auction runs.</div>
        )}
        {[...history].reverse().map((h) => {
          const team = h.team ? teamById[h.team] : null
          return (
            <div
              key={h.id}
              className={`${s.crTlRow} ${KIND_CLASS[h.kind] ?? ''}`}
              style={team ? ({ '--tc': team.color } as React.CSSProperties) : {}}
            >
              <span className={s.crTlTime}>{simTime(h.t)}</span>
              <span className={s.crTlDot} />
              <span className={s.crTlText}>{h.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
