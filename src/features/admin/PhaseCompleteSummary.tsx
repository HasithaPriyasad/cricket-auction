'use client'
import type { LotResult } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import { useAuctionStore } from '@/features/auction/store'
import s from './admin.module.css'

interface PhaseCompleteSummaryProps {
  phase: number
  results: LotResult[]
  players: PlayerData[]
  teams: TeamData[]
  currencySymbol: string
  onStartNextPhase: () => void
  onFinish: () => void
}

export function PhaseCompleteSummary({ phase, results, players, teams, currencySymbol, onStartNextPhase, onFinish }: PhaseCompleteSummaryProps) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]))
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const soldResults = results.filter((r) => !r.unsold)
  const unsoldResults = results.filter((r) => r.unsold)
  const hasUnsold = unsoldResults.length > 0

  return (
    <div className={s.captainSummary}>
      <div className={s.captainSummaryHeader}>
        <span>Phase {phase} Complete</span>
        <span className={s.captainSummaryBadge}>{soldResults.length} sold · {unsoldResults.length} unsold</span>
      </div>

      <div className={s.captainSummaryBody}>
        {/* Sold this phase */}
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

        {/* Unsold — going into next phase */}
        {unsoldResults.length > 0 && (
          <div className={s.captainSummarySection}>
            <div className={s.captainSummarySectionTitle}>
              Unsold — will enter Phase {phase + 1}
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

        {!hasUnsold && (
          <div className={s.captainSummarySection}>
            <div className={s.captainSummarySectionTitle} style={{ color: '#37d67a' }}>
              All players sold — auction complete!
            </div>
          </div>
        )}
      </div>

      <div className={s.captainSummaryFooter} style={{ display: 'flex', gap: 10 }}>
        <button className={`${s.crAct} ${s.crActGo}`} onClick={onStartNextPhase} disabled={!hasUnsold}>
          Start Phase {phase + 1}
          {hasUnsold && (
            <span className={s.captainSummaryFooterNote}>
              {unsoldResults.length} player{unsoldResults.length !== 1 ? 's' : ''} re-enter the pool
            </span>
          )}
        </button>
        <button className={s.crAct} onClick={onFinish}>
          End Auction
        </button>
      </div>
    </div>
  )
}
