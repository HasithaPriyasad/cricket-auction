'use client'
import type { AuctionState, LotResult } from '@/features/auction/types'
import type { TeamData, PlayerData } from '@/features/auction/reducer'
import { compactINR } from '@/lib/formatters'
import s from './views.module.css'

interface TeamsViewProps {
  teams: TeamData[]
  players: PlayerData[]
  teamsState: AuctionState['teams']
  results: LotResult[]
  animOn: boolean
  currencySymbol: string
  captainAuction?: boolean
}

export function TeamsView({ teams, players, teamsState, results, animOn, currencySymbol, captainAuction = true }: TeamsViewProps) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]))
  const soldResults = results.filter((r) => !r.unsold && r.soldTo)

  return (
    <div className={`${s.view} ${animOn ? s.viewAnim : ''}`}>
      <div className={s.viewHead}>
        <div>
          <div className={s.viewKicker}>SQUAD OVERVIEW</div>
          <div className={s.viewTitle}>Team Rosters</div>
        </div>
        <div className={s.viewCounts}>
          <div className={s.vc}>
            <b className={`${s.vcNum} ${s.vcNumSold}`}>{soldResults.length}</b>
            <span className={s.vcLabel}>Allocated</span>
          </div>
        </div>
      </div>

      <div className={s.teamsGrid}>
        {teams.map((team) => {
          const ts = teamsState[team.id] ?? { spent: 0, players: [] }
          const remaining = team.budget - ts.spent
          const pct = Math.round((ts.spent / team.budget) * 100)
          const roster = soldResults
            .filter((r) => r.soldTo === team.id)
            .map((r) => ({ player: playerById[r.playerId], price: r.price ?? 0 }))
            .filter((x) => x.player)
            // Captains at the top (only when captain auction is enabled)
            .sort((a, b) => {
              if (!captainAuction) return 0
              const aCap = (a.player as any).category === 'captain' ? 0 : 1
              const bCap = (b.player as any).category === 'captain' ? 0 : 1
              return aCap - bCap
            })

          return (
            <div key={team.id} className={s.tvCard} style={{ '--tc': team.color } as React.CSSProperties}>
              <div className={s.tvHead}>
                <div className={s.tvId}>
                  <div className={s.tvName}>{team.name}</div>
                  <div className={s.tvMeta}>{roster.length} players · {team.abbreviation}</div>
                </div>
                <div className={s.tvPurse}>
                  <div className={s.tvRem}>{compactINR(remaining, currencySymbol)}</div>
                  <div className={s.tvRemKey}>REMAINING</div>
                </div>
              </div>

              <div className={s.tvBar}>
                <div className={s.tvBarFill} style={{ width: `${pct}%` }} />
              </div>

              <div className={s.tvRoster}>
                {roster.length === 0 && (
                  <div className={s.tvEmpty}>No players yet</div>
                )}
                {roster.map(({ player, price }) => {
                  const isCaptain = captainAuction && (player as any).category === 'captain'
                  return (
                    <div key={player!.id} className={`${s.tvProw} ${isCaptain ? s.tvProwCaptain : ''}`}>
                      <span className={s.tvPj}>#{player!.jerseyNum}</span>
                      <span className={s.tvPn}>
                        {player!.name}
                        {isCaptain
                          ? <><em className={s.tvPcBadge}>C</em><em className={s.tvPnRole}>{player!.gender === 'male' ? 'M' : 'F'}</em></>
                          : <em className={s.tvPnRole}>{player!.role} · {player!.gender === 'male' ? 'M' : 'F'}</em>
                        }
                      </span>
                      <span className={s.tvPp}>{compactINR(price, currencySymbol)}</span>
                    </div>
                  )
                })}
              </div>

              <div className={s.tvFoot}>
                <span className={s.tvFootLabel}>Spent: <b className={s.tvFootVal}>{compactINR(ts.spent, currencySymbol)}</b></span>
                <span className={s.tvFootLabel}>Budget: <b className={s.tvFootVal}>{compactINR(team.budget, currencySymbol)}</b></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
