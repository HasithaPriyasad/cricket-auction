'use client'
import type { LotResult } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import { useAuctionStore } from '@/features/auction/store'
import s from './admin.module.css'

interface CaptainAuctionSummaryProps {
  results: LotResult[]
  players: PlayerData[]
  teams: TeamData[]
  onStartPlayerAuction: () => void
}

export function CaptainAuctionSummary({ results, players, teams, onStartPlayerAuction }: CaptainAuctionSummaryProps) {
  const currencySymbol = useAuctionStore((st) => st.tweaks.currencySymbol)

  const playerById = Object.fromEntries(players.map((p) => [p.id, p]))
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const soldResults = results.filter((r) => !r.unsold)
  const unsoldResults = results.filter((r) => r.unsold)

  const teamsWithCaptain = new Set(soldResults.map((r) => r.soldTo).filter(Boolean) as string[])
  const teamsMissingCaptain = teams.filter((t) => !teamsWithCaptain.has(t.id))
  const hasWarning = teamsMissingCaptain.length > 0

  return (
    <div className={s.captainSummary}>
      <div className={s.captainSummaryHeader}>
        <span>Captain Auction Complete</span>
        <span className={s.captainSummaryBadge}>{soldResults.length} sold · {unsoldResults.length} unsold</span>
      </div>

      <div className={s.captainSummaryBody}>
        {/* Sold captains */}
        {soldResults.length > 0 && (
          <div className={s.captainSummarySection}>
            <div className={s.captainSummarySectionTitle}>Sold</div>
            {soldResults.map((r) => {
              const player = playerById[r.playerId]
              const team = r.soldTo ? teamById[r.soldTo] : null
              return (
                <div key={r.playerId} className={s.captainResultRow}>
                  <span className={s.captainResultPlayer}>{player?.name ?? '—'}</span>
                  <span className={s.captainResultArrow}>→</span>
                  <span className={s.captainResultTeam} style={team ? { color: team.color } : {}}>
                    {team?.name ?? '—'}
                  </span>
                  <span className={s.captainResultPrice}>{rupees(r.price ?? 0, currencySymbol)}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Unsold captains */}
        {unsoldResults.length > 0 && (
          <div className={s.captainSummarySection}>
            <div className={s.captainSummarySectionTitle}>
              Unsold — will enter player auction
            </div>
            {unsoldResults.map((r) => {
              const player = playerById[r.playerId]
              return (
                <div key={r.playerId} className={`${s.captainResultRow} ${s.captainResultRowUnsold}`}>
                  <span className={s.captainResultPlayer}>{player?.name ?? '—'}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Team status */}
        <div className={s.captainSummarySection}>
          <div className={s.captainSummarySectionTitle}>Team Captain Status</div>
          <div className={s.captainTeamGrid}>
            {teams.map((team) => {
              const captainResult = soldResults.find((r) => r.soldTo === team.id)
              const captainPlayer = captainResult ? playerById[captainResult.playerId] : null
              const hasCaptain = !!captainResult
              return (
                <div key={team.id} className={`${s.captainTeamRow} ${hasCaptain ? s.captainTeamOk : s.captainTeamMissing}`}>
                  <span className={s.captainTeamMark}>{hasCaptain ? '✓' : '✗'}</span>
                  <span className={s.captainTeamName} style={{ color: team.color }}>{team.name}</span>
                  {captainPlayer && (
                    <span className={s.captainTeamCaptainName}>{captainPlayer.name}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Info — some teams without captain, but user can still proceed */}
      {hasWarning && (
        <div className={s.captainWarning}>
          ℹ {teamsMissingCaptain.map((t) => t.name).join(', ')}
          {' '}{teamsMissingCaptain.length === 1 ? 'has' : 'have'} no captain — you can still start the player auction.
        </div>
      )}

      {/* Footer */}
      <div className={s.captainSummaryFooter}>
        <button className={`${s.crAct} ${s.crActGo}`} onClick={onStartPlayerAuction}>
          Start Player Auction
          {unsoldResults.length > 0 && (
            <span className={s.captainSummaryFooterNote}>
              +{unsoldResults.length} unsold captain{unsoldResults.length !== 1 ? 's' : ''} added to pool
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
