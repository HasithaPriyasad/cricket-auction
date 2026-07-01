'use client'
import type { BidEntry } from '@/features/auction/types'
import { rupees } from '@/lib/formatters'
import s from './display.module.css'

interface TeamInfo {
  id: string
  short: string
  color: string
}

interface BidFeedProps {
  feed: BidEntry[]
  teamsById: Record<string, TeamInfo>
  currencySymbol: string
}

export function BidFeed({ feed, teamsById, currencySymbol }: BidFeedProps) {
  return (
    <div className={s.feed}>
      <div className={s.feedTitle}>BID HISTORY</div>
      <div className={s.feedList}>
        {feed.length === 0 && <div className={s.feedEmpty}>Awaiting bids…</div>}
        {feed.map((entry, i) => {
          const team = teamsById[entry.team]
          if (!team) return null
          return (
            <div
              key={entry.id}
              className={`${s.feedRow} ${i === 0 ? s.feedRowNewest : ''}`}
              style={{ '--tc': team.color } as React.CSSProperties}
            >
              <span className={s.feedDot} />
              <span className={s.feedTeam}>{team.short}</span>
              <span className={s.feedAmt}>{rupees(entry.amount, currencySymbol)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
