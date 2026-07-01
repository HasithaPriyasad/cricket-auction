'use client'
import { useEffect, useState } from 'react'
import { useAuctionStore } from '@/features/auction/store'
import type { TeamData, PlayerData } from '@/features/auction/reducer'
import { compactINR, rupees } from '@/lib/formatters'
import { ReportView } from '@/features/report/ReportView'
import s from './admin.module.css'

interface ResultsPanelProps {
  teams: TeamData[]
  players: PlayerData[]
  lotPlayers: PlayerData[]
}

interface SummaryData {
  auction: { id: string; name: string; status: string }
  stats: {
    totalAuctioned: number
    sold: number
    unsold: number
    totalSpend: number
    totalSpendFormatted: string
    highestBid: number
    highestBidFormatted: string
    averagePrice: number
  }
  teamStats: Array<{
    team: TeamData
    playersBought: number
    totalSpent: number
    totalSpentFormatted: string
    remainingBudget: number
    remainingBudgetFormatted: string
    mostExpensivePlayer: { name: string; price: number | null; priceFormatted: string } | null
  }>
  topPurchases: Array<{
    player: PlayerData
    soldTo: string | null
    price: number | null
    priceFormatted: string
  }>
}

export function ResultsPanel({ teams, players, lotPlayers }: ResultsPanelProps) {
  const auction = useAuctionStore((s) => s.auction)
  const currencySymbol = useAuctionStore((s) => s.tweaks.currencySymbol)
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]))

  // Captain results: in captain mode they're in results; after player auction starts, in captainResults
  const captainResults = auction.auctionMode === 'captain' ? auction.results : auction.captainResults
  // Player results: only relevant in player mode
  const results = auction.auctionMode === 'captain' ? [] : auction.results

  // Phase breakdown: one entry per distinct phase
  const phases: { label: string; results: typeof results }[] = [
    ...(captainResults.length > 0 ? [{ label: 'Captain Auction', results: captainResults }] : []),
    ...(auction.phaseResults ?? []).map((pr, i) => ({ label: `Phase ${i + 1}`, results: pr })),
    ...(results.length > 0
      ? [{ label: `Phase ${auction.auctionPhase ?? 1}`, results }]
      : []),
  ]

  // Players in lot pool not yet resolved — shown as upcoming rows in the table
  const auctionedIds = new Set(results.map((r) => r.playerId))
  const upcomingPlayers = lotPlayers.filter((p) => !auctionedIds.has(p.id))
  // Player currently being walked in / bid on (phase not yet resolved to a result)
  const currentPlayerId = (auction.phase === 'walkin' || auction.phase === 'bidding')
    ? lotPlayers[auction.lotIndex]?.id ?? null
    : null

  const sold = results.filter((r) => !r.unsold)
  const unsold = results.filter((r) => r.unsold)
  const prices = sold.map((r) => r.price ?? 0)
  const totalSpend = prices.reduce((a, b) => a + b, 0)
  const highestBid = prices.length ? Math.max(...prices) : 0
  const avgPrice = prices.length ? Math.round(totalSpend / prices.length) : 0

  // All sold results across every phase — used for biggest purchase lookup
  const allPhaseSold = [
    ...captainResults,
    ...(auction.phaseResults ?? []).flat(),
    ...results,
  ].filter((r) => !r.unsold)

  // All phases in order: captain → phase 1 → phase 2 → … → current
  const allPhaseRows: { phase: string; result: typeof results[number] }[] = [
    ...captainResults.map((r) => ({ phase: 'Captain Auction', result: r })),
    ...(auction.phaseResults ?? []).flatMap((pr, i) =>
      pr.map((r) => ({ phase: `Phase ${i + 1}`, result: r }))
    ),
    ...results.map((r) => ({ phase: `Phase ${auction.auctionPhase ?? 1}`, result: r })),
  ]

  function exportJSON() {
    const data = allPhaseRows.map(({ phase, result: r }, i) => {
      const p = playersById[r.playerId]
      return {
        phase,
        '#': i + 1,
        player: p?.name ?? r.playerId,
        role: p?.role ?? '',
        country: p?.country ?? '',
        category: p?.category ?? '',
        basePrice: p?.basePrice ?? '',
        status: r.unsold ? 'Unsold' : 'Sold',
        team: r.soldTo ? teamsById[r.soldTo]?.name ?? null : null,
        teamShort: r.soldTo ? teamsById[r.soldTo]?.short ?? null : null,
        finalPrice: r.price ?? null,
      }
    })
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'auction-results.json')
  }

  function exportCSV() {
    const rows = [
      ['Phase', '#', 'Player', 'Role', 'Country', 'Category', 'Base Price', 'Status', 'Team', 'Final Price'],
      ...allPhaseRows.map(({ phase, result: r }, i) => {
        const p = playersById[r.playerId]
        return [
          phase,
          i + 1,
          p?.name ?? r.playerId,
          p?.role ?? '',
          p?.country ?? '',
          p?.category ?? '',
          p?.basePrice ?? '',
          r.unsold ? 'Unsold' : 'Sold',
          r.soldTo ? teamsById[r.soldTo]?.short ?? '' : '',
          r.price ?? '',
        ]
      }),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    download(new Blob([csv], { type: 'text/csv' }), 'auction-results.csv')
  }

  function exportTeamCSV() {
    const rows: (string | number)[][] = [
      ['Team', 'Abbreviation', 'Type', 'Player', 'Role', 'Country', 'Price Paid', 'Budget', 'Spent', 'Remaining'],
    ]
    for (const team of teams) {
      const ts = auction.teams[team.id] ?? { spent: 0, players: [] }
      const captainResult = allPhaseRows.find(
        ({ phase, result: r }) => phase === 'Captain Auction' && r.soldTo === team.id && !r.unsold
      )
      const playersSold = allPhaseRows.filter(
        ({ phase, result: r }) => phase !== 'Captain Auction' && r.soldTo === team.id && !r.unsold
      ).sort((a, b) => (b.result.price ?? 0) - (a.result.price ?? 0))

      const members = [
        ...(captainResult ? [{ type: 'Captain', row: captainResult }] : []),
        ...playersSold.map((row) => ({ type: 'Player', row })),
      ]

      if (members.length === 0) {
        rows.push([team.name, team.abbreviation, '', 'No players', '', '', '', team.budget, ts.spent, team.budget - ts.spent])
      } else {
        members.forEach(({ type, row }, idx) => {
          const p = playersById[row.result.playerId]
          rows.push([
            idx === 0 ? team.name : '',
            idx === 0 ? team.abbreviation : '',
            type,
            p?.name ?? row.result.playerId,
            p?.role ?? '',
            p?.country ?? '',
            row.result.price ?? '',
            idx === 0 ? team.budget : '',
            idx === 0 ? ts.spent : '',
            idx === 0 ? team.budget - ts.spent : '',
          ])
        })
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    download(new Blob([csv], { type: 'text/csv' }), 'team-composition.csv')
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const captainSold = captainResults.filter((r) => !r.unsold)
  const captainUnsold = captainResults.filter((r) => r.unsold)
  const teamsWithCaptain = new Set(captainSold.map((r) => r.soldTo).filter(Boolean) as string[])

  return (
    <div className={s.resultsPanel}>

      {/* Captain Auction Results — shown whenever captain results exist */}
      {captainResults.length > 0 && (
        <>
          <div className={s.resultsHeader} style={{ marginBottom: 0 }}>
            <div className={s.resultsTitle}>Captain Auction Results</div>
          </div>

          <div className={s.statsGrid} style={{ marginTop: 12 }}>
            {[
              { v: captainResults.length, k: 'Captains' },
              { v: captainSold.length, k: 'Sold' },
              { v: captainUnsold.length, k: 'Unsold' },
              { v: compactINR(captainSold.reduce((a, r) => a + (r.price ?? 0), 0), currencySymbol), k: 'Total Spend' },
              { v: `${teamsWithCaptain.size}/${teams.length}`, k: 'Teams w/ Captain' },
            ].map((x) => (
              <div key={x.k} className={s.statCard}>
                <div className={s.statCardV}>{x.v}</div>
                <div className={s.statCardK}>{x.k}</div>
              </div>
            ))}
          </div>

          {/* Team captain status */}
          <div className={s.captainResultsAdminGrid}>
            {teams.map((team) => {
              const soldResult = captainSold.find((r) => r.soldTo === team.id)
              const captainPlayer = soldResult ? playersById[soldResult.playerId] : null
              const hasCaptain = !!soldResult
              return (
                <div key={team.id} className={`${s.captainResultsAdminTeam} ${hasCaptain ? s.captainResultsAdminTeamOk : s.captainResultsAdminTeamMissing}`}>
                  <span className={s.captainResultsAdminMark}>{hasCaptain ? '✓' : '✗'}</span>
                  <span className={s.resultTeamDot} style={{ background: team.color }} />
                  <span style={{ fontWeight: 700 }}>{team.name}</span>
                  {captainPlayer && (
                    <span style={{ color: 'var(--cr-dim)', marginLeft: 'auto' }}>
                      {captainPlayer.name} · {rupees(soldResult!.price ?? 0, currencySymbol)}
                    </span>
                  )}
                  {!hasCaptain && captainUnsold.find((r) => players.find((p) => p.id === r.playerId)) === undefined && (
                    <span style={{ color: 'var(--cr-dim)', marginLeft: 'auto' }}>No captain auctioned</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Captain results table */}
          <table className={s.resultsTable} style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>#</th><th>Captain</th><th>Status</th><th>Team</th><th>Price</th>
              </tr>
            </thead>
            <tbody>
              {captainResults.map((r, idx) => {
                const p = playersById[r.playerId]
                const team = r.soldTo ? teamsById[r.soldTo] : null
                return (
                  <tr key={r.playerId}>
                    <td style={{ color: 'var(--cr-dim)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700 }}>{p?.name ?? `Player #${r.playerId}`}</td>
                    <td>
                      {r.unsold
                        ? <span className={s.resultUnsoldBadge}>UNSOLD</span>
                        : <span className={s.resultSoldBadge}>SOLD</span>}
                    </td>
                    <td>
                      {team && (
                        <><span className={s.resultTeamDot} style={{ background: team.color }} />{team.short}</>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {r.price ? rupees(r.price, currencySymbol) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ borderTop: '1px solid var(--cr-brd)', margin: '20px 0' }} />
        </>
      )}

      {auction.auctionMode !== 'captain' && <>
      <div className={s.resultsHeader}>
        <div className={s.resultsTitle}>{captainResults.length > 0 ? 'Player Auction Results' : 'Auction Results'}</div>
        <div className={s.exportBtns}>
          <a className={s.exportBtn} href="/report" target="_blank" rel="noopener noreferrer">
            View Report ↗
          </a>
          <button className={s.exportBtn} onClick={exportCSV}>All Results CSV</button>
          <button className={s.exportBtn} onClick={exportJSON}>All Results JSON</button>
          <button className={s.exportBtn} onClick={exportTeamCSV}>Team Report CSV</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className={s.statsGrid}>
        {[
          { v: results.length, k: 'Total Lots' },
          { v: sold.length, k: 'Sold' },
          { v: unsold.length, k: 'Unsold' },
          { v: compactINR(totalSpend, currencySymbol), k: 'Total Spend' },
          { v: compactINR(highestBid, currencySymbol), k: 'Highest Bid' },
          { v: prices.length ? compactINR(avgPrice, currencySymbol) : '—', k: 'Average' },
        ].map((x) => (
          <div key={x.k} className={s.statCard}>
            <div className={s.statCardV}>{x.v}</div>
            <div className={s.statCardK}>{x.k}</div>
          </div>
        ))}
      </div>

      {/* Results + upcoming table */}
      {results.length === 0 && upcomingPlayers.length === 0 ? (
        <div style={{ color: 'var(--cr-dim)', fontSize: 15, padding: '24px 0' }}>
          No results yet — run the auction to see results here.
        </div>
      ) : (
        <table className={s.resultsTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Role</th>
              <th>Country</th>
              <th>Base Price</th>
              <th>Status</th>
              <th>Team</th>
              <th>Final Price</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const p = playersById[r.playerId]
              const team = r.soldTo ? teamsById[r.soldTo] : null
              return (
                <tr key={r.playerId}>
                  <td style={{ color: 'var(--cr-dim)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 700 }}>
                    {p?.name ?? `Player #${r.playerId}`}
                    {p?.tag === 'MARQUEE' && ' ★'}
                  </td>
                  <td style={{ color: 'var(--cr-dim)' }}>{p?.role}</td>
                  <td style={{ color: 'var(--cr-dim)' }}>{p?.country}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p ? compactINR(p.basePrice, currencySymbol) : '—'}</td>
                  <td>
                    {r.unsold
                      ? <span className={s.resultUnsoldBadge}>UNSOLD</span>
                      : <span className={s.resultSoldBadge}>SOLD</span>}
                  </td>
                  <td>
                    {team && (
                      <>
                        <span className={s.resultTeamDot} style={{ background: team.color }} />
                        {team.short}
                      </>
                    )}
                  </td>
                  <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {r.price ? rupees(r.price, currencySymbol) : '—'}
                  </td>
                </tr>
              )
            })}

            {/* Separator between completed and upcoming */}
            {results.length > 0 && upcomingPlayers.length > 0 && (
              <tr>
                <td colSpan={8} className={s.resultUpcomingDivider}>
                  Upcoming · {upcomingPlayers.length} remaining
                </td>
              </tr>
            )}

            {/* Upcoming players */}
            {upcomingPlayers.map((p) => {
              const isLive = p.id === currentPlayerId
              return (
                <tr key={`up-${p.id}`} style={{ opacity: isLive ? 1 : 0.55 }}>
                  <td style={{ color: 'var(--cr-dim)' }}>—</td>
                  <td style={{ fontWeight: 700 }}>
                    {p.name}
                    {p.tag === 'MARQUEE' && ' ★'}
                  </td>
                  <td style={{ color: 'var(--cr-dim)' }}>{p.role}</td>
                  <td style={{ color: 'var(--cr-dim)' }}>{p.country}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{compactINR(p.basePrice, currencySymbol)}</td>
                  <td>
                    {isLive
                      ? <span className={s.resultLiveBadge}>LIVE</span>
                      : <span className={s.resultUpcomingBadge}>UPCOMING</span>}
                  </td>
                  <td />
                  <td />
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Team spending breakdown */}
      {sold.length > 0 && (
        <>
          <div style={{ fontFamily: 'Saira Condensed', fontWeight: 800, fontSize: 20, marginTop: 8 }}>
            Team Spending
          </div>
          <table className={s.resultsTable}>
            <thead>
              <tr>
                <th>Team</th>
                <th>Players</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Biggest Purchase</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const ts = auction.teams[team.id] ?? { spent: 0, players: [] }
                const teamSold = allPhaseSold.filter((r) => r.soldTo === team.id)
                const biggest = [...teamSold].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0]
                return (
                  <tr key={team.id}>
                    <td>
                      <span className={s.resultTeamDot} style={{ background: team.color }} />
                      <strong>{team.name}</strong>
                    </td>
                    <td>{ts.players.length}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{compactINR(ts.spent, currencySymbol)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: team.budget - ts.spent < 2000000 ? '#ff8c8c' : undefined }}>
                      {compactINR(team.budget - ts.spent, currencySymbol)}
                    </td>
                    <td>
                      {biggest
                        ? `${playersById[biggest.playerId]?.name ?? '—'} · ${rupees(biggest.price ?? 0, currencySymbol)}`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      </>}

      {/* Phase breakdown */}
      {phases.length > 1 && (
        <>
          <div style={{ borderTop: '1px solid var(--cr-brd)', margin: '24px 0' }} />
          <div style={{ fontFamily: 'Saira Condensed', fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
            Phase Breakdown
          </div>
          <div className={s.phaseBreakdown}>
            {phases.map(({ label, results: pr }) => {
              const pSold = pr.filter((r) => !r.unsold)
              const pUnsold = pr.filter((r) => r.unsold)
              const pSpend = pSold.reduce((a, r) => a + (r.price ?? 0), 0)
              const pHigh = pSold.length ? Math.max(...pSold.map((r) => r.price ?? 0)) : 0
              return (
                <div key={label} className={s.phaseGroup}>
                  <div className={s.phaseGroupLabel}>{label}</div>
                  <div className={s.phaseStatsGrid}>
                    {[
                      { v: pr.length, k: 'Lots' },
                      { v: pSold.length, k: 'Sold' },
                      { v: pUnsold.length, k: 'Unsold' },
                      { v: pSpend > 0 ? compactINR(pSpend, currencySymbol) : '—', k: 'Total Spend' },
                      { v: pHigh > 0 ? compactINR(pHigh, currencySymbol) : '—', k: 'Highest Bid' },
                    ].map((x) => (
                      <div key={x.k} className={s.statCard}>
                        <div className={s.statCardV}>{x.v}</div>
                        <div className={s.statCardK}>{x.k}</div>
                      </div>
                    ))}
                  </div>
                  <table className={s.resultsTable} style={{ marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th>#</th><th>Player</th><th>Role</th><th>Status</th><th>Team</th><th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pr.map((r, idx) => {
                        const p = playersById[r.playerId]
                        const team = r.soldTo ? teamsById[r.soldTo] : null
                        return (
                          <tr key={r.playerId}>
                            <td style={{ color: 'var(--cr-dim)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700 }}>{p?.name ?? `Player #${r.playerId}`}</td>
                            <td style={{ color: 'var(--cr-dim)' }}>{p?.role ?? '—'}</td>
                            <td>
                              {r.unsold
                                ? <span className={s.resultUnsoldBadge}>UNSOLD</span>
                                : <span className={s.resultSoldBadge}>SOLD</span>}
                            </td>
                            <td>
                              {team && (
                                <><span className={s.resultTeamDot} style={{ background: team.color }} />{team.short}</>
                              )}
                            </td>
                            <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {r.price ? rupees(r.price, currencySymbol) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Full report — squad sheets + spend chart */}
      {(results.length > 0 || captainResults.length > 0) && (
        <>
          <div style={{ borderTop: '1px solid var(--cr-brd)', margin: '24px 0' }} />
          <ReportView
            teams={teams}
            players={players}
            auction={auction}
            currencySymbol={currencySymbol}
          />
        </>
      )}
    </div>
  )
}
