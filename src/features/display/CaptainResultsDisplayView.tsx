'use client'
import type { LotResult } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import s from './display.module.css'

interface Props {
  results: LotResult[]
  players: PlayerData[]
  teams: TeamData[]
  currencySymbol: string
}

export function CaptainResultsDisplayView({ results, players, teams, currencySymbol }: Props) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]))
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const soldResults = results.filter((r) => !r.unsold)
  const unsoldResults = results.filter((r) => r.unsold)

  return (
    <div className={s.captainResultsView}>
      <div className={s.captainResultsHeader}>
        <div className={s.captainResultsKicker}>Phase 1 Complete</div>
        <div className={s.captainResultsTitle}>Captain Auction</div>
        <div className={s.captainResultsMeta}>
          <span>{soldResults.length} Sold</span>
          <span className={s.captainResultsMetaDot} />
          <span>{unsoldResults.length} Unsold</span>
        </div>
      </div>

      <div className={s.captainResultsBody}>
        {/* Left: sold + unsold list */}
        <div className={s.captainResultsCol}>
          <div className={s.captainResultsColTitle}>Sold Captains</div>
          <div className={s.captainResultsList}>
            {soldResults.map((r, i) => {
              const player = playerById[r.playerId]
              const team = r.soldTo ? teamById[r.soldTo] : null
              return (
                <div
                  key={r.playerId}
                  className={s.captainResultItem}
                  style={{ animationDelay: `${i * 55}ms`, '--tc': team?.color ?? 'var(--accent)' } as React.CSSProperties}
                >
                  <span className={s.captainResultItemName}>{player?.name ?? '—'}{player && <em style={{ fontStyle: 'normal', opacity: .6, fontSize: '0.8em', marginLeft: 6 }}>{player.gender === 'male' ? 'M' : 'F'}</em>}</span>
                  <span className={s.captainResultItemArrow}>→</span>
                  <span className={s.captainResultItemTeam} style={team ? { color: team.color } : {}}>
                    {team?.name ?? '—'}
                  </span>
                  <span className={s.captainResultItemPrice}>{rupees(r.price ?? 0, currencySymbol)}</span>
                </div>
              )
            })}

            {unsoldResults.length > 0 && (
              <>
                <div className={s.captainResultsDivider}>Unsold — joins player pool</div>
                {unsoldResults.map((r) => {
                  const player = playerById[r.playerId]
                  return (
                    <div key={r.playerId} className={`${s.captainResultItem} ${s.captainResultItemUnsold}`}>
                      <span className={s.captainResultItemName}>{player?.name ?? '—'}{player && <em style={{ fontStyle: 'normal', opacity: .6, fontSize: '0.8em', marginLeft: 6 }}>{player.gender === 'male' ? 'M' : 'F'}</em>}</span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Right: team captain status */}
        <div className={s.captainTeamStatusCol}>
          <div className={s.captainResultsColTitle}>Team Captains</div>
          <div className={s.captainTeamStatusGrid}>
            {teams.map((team, i) => {
              const captainResult = soldResults.find((r) => r.soldTo === team.id)
              const captainPlayer = captainResult ? playerById[captainResult.playerId] : null
              const hasCaptain = !!captainResult
              return (
                <div
                  key={team.id}
                  className={`${s.captainTeamStatusRow} ${hasCaptain ? s.captainTeamStatusOk : s.captainTeamStatusMissing}`}
                  style={{ '--tc': team.color, animationDelay: `${i * 60}ms` } as React.CSSProperties}
                >
                  <span className={s.captainTeamStatusMark}>{hasCaptain ? '✓' : '✗'}</span>
                  <div className={s.captainTeamStatusInfo}>
                    <span className={s.captainTeamStatusName}>{team.name}</span>
                    {captainPlayer && (
                      <span className={s.captainTeamStatusCaptain}>{captainPlayer.name}</span>
                    )}
                    {!hasCaptain && (
                      <span className={s.captainTeamStatusNone}>No captain</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
