'use client'
import type { AuctionState } from '@/features/auction/types'
import type { TeamData } from '@/features/auction/reducer'
import { compactINR } from '@/lib/formatters'
import s from './display.module.css'

interface PurseRowProps {
  teams: TeamData[]
  teamsState: AuctionState['teams']
  leaderId: string | null
  justBoughtId: string | null
  currencySymbol: string
}

export function PurseRow({ teams, teamsState, leaderId, justBoughtId, currencySymbol }: PurseRowProps) {
  return (
    <div className={s.purses}>
      {teams.map((team) => {
        const ts = teamsState[team.id] ?? { spent: 0, players: [] }
        const remaining = team.budget - ts.spent
        const pct = Math.round((ts.spent / team.budget) * 100)
        const isLeader = leaderId === team.id
        const justBought = justBoughtId === team.id

        return (
          <div
            key={team.id}
            className={`${s.teamCard} ${isLeader ? s.teamCardLeader : ''} ${justBought ? s.teamCardBought : ''}`}
            style={{ '--tc': team.color } as React.CSSProperties}
          >
            <div className={s.tcHead}>
              <div
                className={s.badge}
                style={{ '--tc': team.color, width: 42, height: 42, fontSize: 13 } as React.CSSProperties}
              >
                {team.abbreviation}
              </div>
              <div className={s.tcId}>
                <div className={s.tcName}>{team.short}</div>
                <div className={s.tcSlots}>{ts.players.length} players</div>
              </div>
            </div>

            <div className={s.tcBar}>
              <div className={s.tcBarFill} style={{ width: `${pct}%` }} />
            </div>

            <div className={s.tcFoot}>
              <span className={s.tcRem}>{compactINR(remaining, currencySymbol)}</span>
              <span className={s.tcOf}>left</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
