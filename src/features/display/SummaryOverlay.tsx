'use client'
import type { AuctionState, LotResult } from '@/features/auction/types'
import type { TeamData, PlayerData } from '@/features/auction/reducer'
import { compactINR, rupees } from '@/lib/formatters'
import s from './overlays.module.css'

interface PhaseBreakdown {
  label: string
  results: LotResult[]
}

interface SummaryOverlayProps {
  teams: TeamData[]
  players: PlayerData[]
  teamsState: AuctionState['teams']
  results: LotResult[]
  phases?: PhaseBreakdown[]
  onClose: () => void
  currencySymbol: string
}

export function SummaryOverlay({ teams, players, teamsState, results, phases, onClose, currencySymbol }: SummaryOverlayProps) {
  // Deduplicate across phases: if a player was unsold in phase 1 and sold in phase 2,
  // the sold result (later in the array) wins.
  const effectiveResults: LotResult[] = []
  const seen = new Map<number, LotResult>()
  for (const r of results) {
    const existing = seen.get(r.playerId)
    if (!existing || (!r.unsold && existing.unsold)) seen.set(r.playerId, r)
  }
  seen.forEach((r) => effectiveResults.push(r))

  const sold = effectiveResults.filter((r) => !r.unsold)
  const unsold = effectiveResults.filter((r) => r.unsold)
  const prices = sold.map((r) => r.price ?? 0)
  const totalSpend = prices.reduce((a, b) => a + b, 0)
  const highestBid = prices.length ? Math.max(...prices) : 0
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]))
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const malesSold = sold.filter((r) => playerById[r.playerId]?.gender === 'male').length
  const femalesSold = sold.filter((r) => playerById[r.playerId]?.gender === 'female').length

  const topPurchases = [...sold]
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, 5)

  const teamStats = teams.map((t) => {
    const ts = teamsState[t.id] ?? { spent: 0, players: [] }
    const teamSold = sold.filter((r) => r.soldTo === t.id)
    const maleCount = teamSold.filter((r) => playerById[r.playerId]?.gender === 'male').length
    const femaleCount = teamSold.filter((r) => playerById[r.playerId]?.gender === 'female').length
    return { team: t, spent: ts.spent, count: ts.players.length, remaining: t.budget - ts.spent, maleCount, femaleCount }
  }).sort((a, b) => b.spent - a.spent)

  return (
    <div className={`${s.overlay} ${s.summary}`}>
      <div className={s.sumHead}>
        <div>
          <div className={s.sumKicker}>AUCTION COMPLETE</div>
          <div className={s.sumTitle}>Final Summary</div>
        </div>
        <button className={s.sumClose} onClick={onClose}>Close ✕</button>
      </div>

      <div className={s.sumStats}>
        {[
          { v: String(results.length), k: 'Total Lots' },
          { v: String(sold.length), k: 'Sold' },
          { v: String(unsold.length), k: 'Unsold' },
          { v: `${malesSold}M · ${femalesSold}F`, k: 'Gender Split' },
          { v: compactINR(totalSpend, currencySymbol), k: 'Total Spend' },
          { v: compactINR(highestBid, currencySymbol), k: 'Highest Bid' },
          { v: prices.length ? compactINR(Math.round(totalSpend / prices.length), currencySymbol) : '—', k: 'Avg. Price' },
        ].map((x) => (
          <div key={x.k} className={s.sumStat}>
            <div className={s.sumStatV}>{x.v}</div>
            <div className={s.sumStatK}>{x.k}</div>
          </div>
        ))}
      </div>

      <div className={s.sumCols}>
        {/* Top purchases */}
        <div className={s.sumPanel}>
          <div className={s.sumPanelT}>TOP PURCHASES</div>
          <div className={s.sumTop}>
            {topPurchases.map((r, i) => {
              const player = playerById[r.playerId]
              const team = r.soldTo ? teamById[r.soldTo] : null
              if (!player || !team) return null
              return (
                <div key={r.playerId} className={s.sumTopRow} style={{ '--tc': team.color } as React.CSSProperties}>
                  <div className={s.sumRank}>#{i + 1}</div>
                  <div>
                    <div className={s.sumTopName}>{player.name}</div>
                    <div className={s.sumTopTeam}>{team.short} · {player.gender === 'male' ? 'M' : 'F'}</div>
                  </div>
                  <div className={s.sumTopPrice}>{rupees(r.price ?? 0, currencySymbol)}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Team spending */}
        <div className={s.sumPanel}>
          <div className={s.sumPanelT}>TEAM SPENDING</div>
          <div className={s.sumTeams}>
            {teamStats.map(({ team, spent, count, remaining, maleCount, femaleCount }) => (
              <div key={team.id} className={s.sumTeamRow} style={{ '--tc': team.color } as React.CSSProperties}>
                <div style={{ width: 12, height: 36, borderRadius: 3, background: team.color }} />
                <div className={s.sumTeamName}>{team.short}</div>
                <div className={s.sumTeamCount}>{count}p · {maleCount}M {femaleCount}F</div>
                <div className={s.sumTeamSpent}>{compactINR(spent, currencySymbol)}</div>
                <div className={s.sumTeamLeft}>{compactINR(remaining, currencySymbol)} left</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase breakdown */}
      {phases && phases.length > 1 && (
        <div className={s.sumPhaseDivider}>
          <div className={s.sumPanelT}>PHASE BREAKDOWN</div>
          {phases.map(({ label, results: pr }) => {
            const pSold = pr.filter((r) => !r.unsold)
            const pUnsold = pr.filter((r) => r.unsold)
            const pSpend = pSold.reduce((a, r) => a + (r.price ?? 0), 0)
            const pHigh = pSold.length ? Math.max(...pSold.map((r) => r.price ?? 0)) : 0
            return (
              <div key={label} className={s.sumPhaseSection}>
                <div className={s.sumPhaseLabel}>{label}</div>
                <div className={s.sumPhaseMeta}>
                  {[
                    { k: 'Lots', v: pr.length },
                    { k: 'Sold', v: pSold.length },
                    { k: 'Unsold', v: pUnsold.length },
                    { k: 'Spend', v: compactINR(pSpend, currencySymbol), accent: true },
                    { k: 'Highest', v: pHigh ? compactINR(pHigh, currencySymbol) : '—' },
                  ].map(({ k, v, accent }) => (
                    <span key={k} className={s.sumPhaseMetaStat}>
                      <span className={`${s.sumPhaseMetaV} ${accent ? s.sumPhaseMetaAccent : ''}`}>{v}</span>
                      {k}
                    </span>
                  ))}
                </div>
                <div className={s.sumPhasePlayerList}>
                  {pr.map((r) => {
                    const player = playerById[r.playerId]
                    const team = r.soldTo ? teamById[r.soldTo] : null
                    return (
                      <div key={r.playerId} className={s.sumPhasePlayerRow}>
                        <span className={s.sumPhasePlayerName}>
                          {player?.name ?? `Player #${r.playerId}`}
                        </span>
                        <span className={s.sumPhasePlayerTeam}>
                          {team ? team.short : ''}
                        </span>
                        {r.unsold
                          ? <span className={s.sumPhasePlayerUnsold}>UNSOLD</span>
                          : <span className={s.sumPhasePlayerSold}>{rupees(r.price ?? 0, currencySymbol)}</span>
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
