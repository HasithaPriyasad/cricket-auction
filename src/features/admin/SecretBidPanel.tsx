'use client'
import { useState } from 'react'
import type { AuctionState } from '@/features/auction/types'
import type { TeamData } from '@/features/auction/reducer'
import { rupees, compactINR } from '@/lib/formatters'
import s from './admin.module.css'

interface SecretBidPanelProps {
  state: AuctionState
  teams: TeamData[]
  onAward: (teamId: string, price: number) => void
  onExit: () => void
  currencySymbol?: string
}

export function SecretBidPanel({ state, teams, onAward, onExit, currencySymbol = '₹' }: SecretBidPanelProps) {
  const [bids, setBids] = useState<Record<string, string>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, String(state.currentBid)]))
  )

  const eligible = teams.filter((t) => {
    const remaining = t.budget - (state.teams[t.id]?.spent ?? 0)
    return remaining >= state.currentBid
  })

  function setBid(teamId: string, value: string) {
    setBids((prev) => ({ ...prev, [teamId]: value }))
  }

  function award(teamId: string) {
    const price = Number(bids[teamId])
    if (!price || price < state.currentBid) return
    onAward(teamId, price)
  }

  return (
    <div className={s.secretPanel}>
      <div className={s.secretHeader}>
        <div className={s.secretBadge}>SECRET BID</div>
        <div className={s.secretFloor}>
          Floor: <strong>{rupees(state.currentBid, currencySymbol)}</strong>
        </div>
        <button className={s.secretExitBtn} onClick={onExit}>
          ← Return to Open Bidding
        </button>
      </div>

      <div className={s.crSectionKey} style={{ marginTop: 12 }}>
        Enter each team's secret bid, then award to the winner
      </div>

      <div className={s.secretGrid}>
        {eligible.map((team) => {
          const remaining = team.budget - (state.teams[team.id]?.spent ?? 0)
          const bidVal = Number(bids[team.id]) || 0
          const valid = bidVal >= state.currentBid
          return (
            <div
              key={team.id}
              className={s.secretTeamRow}
              style={{ '--tc': team.color } as React.CSSProperties}
            >
              <div className={s.secretTeamInfo}>
                <div
                  className={s.secretTeamDot}
                  style={{ background: team.color }}
                />
                <div>
                  <div className={s.secretTeamName}>{team.short}</div>
                  <div className={s.secretTeamRem}>{compactINR(remaining, currencySymbol)} left</div>
                </div>
              </div>
              <input
                className={`${s.secretInput} ${bids[team.id] && !valid ? s.secretInputInvalid : ''}`}
                type="number"
                min={state.currentBid}
                step={100000}
                value={bids[team.id]}
                onChange={(e) => setBid(team.id, e.target.value)}
                placeholder={String(state.currentBid)}
              />
              <button
                className={`${s.crAct} ${s.crActSold} ${s.secretAwardBtn}`}
                disabled={!valid}
                onClick={() => award(team.id)}
              >
                Award
              </button>
            </div>
          )
        })}

        {eligible.length === 0 && (
          <div style={{ color: 'var(--cr-dim)', fontSize: 14, padding: '12px 0' }}>
            No teams can cover the current floor price.
          </div>
        )}
      </div>
    </div>
  )
}
