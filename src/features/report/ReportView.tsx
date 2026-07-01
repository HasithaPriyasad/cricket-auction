'use client'
import type { TeamData, PlayerData } from '@/features/auction/reducer'
import type { AuctionState } from '@/features/auction/types'
import { compactINR, rupees } from '@/lib/formatters'
import s from './report.module.css'

interface ReportViewProps {
  teams: TeamData[]
  players: PlayerData[]
  auction: AuctionState
  currencySymbol?: string
}

export function ReportView({ teams, players, auction, currencySymbol = '₹' }: ReportViewProps) {
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]))

  const captainResults = auction.auctionMode === 'captain' ? auction.results : (auction.captainResults ?? [])
  const playerResults = auction.auctionMode === 'captain'
    ? []
    : [...(auction.phaseResults ?? []).flat(), ...auction.results]

  const allResults = [...captainResults, ...playerResults]
  if (allResults.length === 0) {
    return <div className={s.emptyState}>No auction results yet.</div>
  }

  const allSold = allResults.filter((r) => !r.unsold)
  const unsoldCount = allResults.filter((r) => r.unsold).length
  const prices = allSold.map((r) => r.price ?? 0)
  const totalSpend = prices.reduce((a, b) => a + b, 0)
  const highestBid = prices.length ? Math.max(...prices) : 0
  const avgPrice = prices.length ? Math.round(totalSpend / prices.length) : 0

  // Team spend data sorted highest to lowest
  const teamSpendData = teams
    .map((team) => ({ team, spent: auction.teams[team.id]?.spent ?? 0 }))
    .sort((a, b) => b.spent - a.spent)
  const maxSpend = teamSpendData[0]?.spent || 1

  // Squad data per team
  const squadData = teams.map((team) => {
    const captains = captainResults
      .filter((r) => !r.unsold && r.soldTo === team.id)
      .map((r) => ({ player: playersById[r.playerId], price: r.price ?? 0, isCaptain: true }))
      .filter((x) => x.player != null)

    const regulars = playerResults
      .filter((r) => !r.unsold && r.soldTo === team.id)
      .map((r) => ({ player: playersById[r.playerId], price: r.price ?? 0, isCaptain: false }))
      .filter((x) => x.player != null)
      .sort((a, b) => b.price - a.price)

    const spent = auction.teams[team.id]?.spent ?? 0
    return {
      team,
      members: [...captains, ...regulars],
      spent,
      remaining: team.budget - spent,
    }
  })

  return (
    <>
      {/* Summary */}
      <div className={s.section}>Summary</div>
      <div className={s.statsGrid}>
        {[
          { v: allResults.length, k: 'Total Lots' },
          { v: allSold.length, k: 'Sold' },
          { v: unsoldCount, k: 'Unsold' },
          { v: compactINR(totalSpend, currencySymbol), k: 'Total Spend' },
          { v: prices.length ? compactINR(highestBid, currencySymbol) : '—', k: 'Highest Bid' },
          { v: prices.length ? compactINR(avgPrice, currencySymbol) : '—', k: 'Avg Price' },
        ].map((x) => (
          <div key={x.k} className={s.statCard}>
            <div className={s.statCardV}>{x.v}</div>
            <div className={s.statCardK}>{x.k}</div>
          </div>
        ))}
      </div>

      {/* Spend chart */}
      {totalSpend > 0 && (
        <>
          <div className={s.section}>Team Spending</div>
          <div className={s.chartWrap}>
            {teamSpendData.map(({ team, spent }) => (
              <div key={team.id} className={s.chartRow}>
                <div className={s.chartLabel}>
                  <span className={s.chartDot} style={{ background: team.color }} />
                  {team.short}
                </div>
                <div className={s.chartBarWrap}>
                  <div
                    className={s.chartBar}
                    style={{ width: `${(spent / maxSpend) * 100}%`, background: team.color }}
                  />
                </div>
                <div className={s.chartAmount}>
                  {spent > 0 ? compactINR(spent, currencySymbol) : '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Squad sheets */}
      <div className={s.section}>Team Squads</div>
      <div className={s.squadGrid}>
        {squadData.map(({ team, members, spent, remaining }) => (
          <div key={team.id} className={s.squadCard}>
            <div className={s.squadHeader} style={{ background: team.color }}>
              <span className={s.squadTeamName}>{team.name}</span>
              <span className={s.squadBudgetLeft}>{compactINR(remaining, currencySymbol)} left</span>
            </div>

            <div className={s.squadPlayers}>
              {members.length === 0 ? (
                <div className={s.squadEmpty}>No players acquired</div>
              ) : (
                members.map(({ player, price, isCaptain }) => (
                  <div key={player.id} className={`${s.squadRow} ${isCaptain ? s.squadCaptainRow : ''}`}>
                    {isCaptain && <span className={s.captainBadge}>C</span>}
                    <span className={s.squadName}>{player.name}</span>
                    <span className={s.squadRole}>{player.role}</span>
                    <span className={s.squadPrice}>{rupees(price, currencySymbol)}</span>
                  </div>
                ))
              )}
            </div>

            <div className={s.squadFooter}>
              <span>{members.length} player{members.length !== 1 ? 's' : ''}</span>
              <span className={s.squadSpent}>{compactINR(spent, currencySymbol)} spent</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
