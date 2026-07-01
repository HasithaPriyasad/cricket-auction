'use client'
import type { AuctionState, BidRule } from '@/features/auction/types'
import type { TeamData, PlayerData } from '@/features/auction/reducer'
import { bidIncrement } from '@/lib/bidIncrement'
import { compactINR, rupees } from '@/lib/formatters'
import s from './admin.module.css'

interface TeamBidGridProps {
  state: AuctionState
  teams: TeamData[]
  players: PlayerData[]
  selectedTeamId: string | null
  onBid: (teamId: string) => void
  bidRules: BidRule[]
  currencySymbol: string
  minPlayersPerTeam: number
  minMalePerTeam: number
  minFemalePerTeam: number
}

export function TeamBidGrid({
  state, teams, players, selectedTeamId, onBid, bidRules, currencySymbol,
  minPlayersPerTeam, minMalePerTeam, minFemalePerTeam,
}: TeamBidGridProps) {
  const nextAmount =
    state.leaderId === null
      ? (teams.length > 0 ? state.currentBid : 0)
      : state.currentBid + bidIncrement(state.currentBid, bidRules)

  const showRoster = minPlayersPerTeam > 0 || minMalePerTeam > 0 || minFemalePerTeam > 0

  const playerById = new Map(players.map((p) => [p.id, p]))

  function isEligible(teamId: string): boolean {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return false
    return (
      state.phase === 'bidding' &&
      !state.paused &&
      teamId !== state.leaderId &&
      team.budget - (state.teams[teamId]?.spent ?? 0) >= nextAmount
    )
  }

  function rosterCounts(teamId: string) {
    const ids = state.teams[teamId]?.players ?? []
    let male = 0, female = 0
    for (const id of ids) {
      const p = playerById.get(id)
      if (p?.gender === 'male') male++
      else if (p?.gender === 'female') female++
    }
    return { total: ids.length, male, female }
  }

  return (
    <>
      <div className={s.crSectionKey}>
        Place a bid — pick the team{' '}
        <span className={s.crHint}>
          click, or ←/→ then <b className={s.crKbd}>B</b>
        </span>
      </div>
      <div className={s.crBidGrid}>
        {teams.map((team) => {
          const ts = state.teams[team.id] ?? { spent: 0, players: [] }
          const remaining = team.budget - ts.spent
          const isLeader = team.id === state.leaderId
          const ok = isEligible(team.id)
          const sel = selectedTeamId === team.id
          const counts = showRoster ? rosterCounts(team.id) : null

          return (
            <button
              key={team.id}
              className={`${s.crTeam} ${isLeader ? s.crTeamLeading : ''} ${sel && !isLeader ? s.crTeamSelected : ''}`}
              style={{ '--tc': team.color } as React.CSSProperties}
              disabled={!ok}
              onClick={() => onBid(team.id)}
            >
              <div className={s.crTeamTop}>
                <div
                  style={{
                    width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: team.color, color: '#fff', fontFamily: 'Saira Condensed',
                    fontWeight: 800, fontSize: 13, flexShrink: 0,
                  }}
                >
                  {team.abbreviation}
                </div>
                <div className={s.crTeamId}>
                  <b>{team.short}</b>
                  <i>{compactINR(remaining, currencySymbol)} left</i>
                </div>
              </div>

              {counts && (
                <div className={s.crTeamRoster}>
                  {minPlayersPerTeam > 0 && (
                    <span className={counts.total >= minPlayersPerTeam ? s.crRosterMet : s.crRosterPending}>
                      {counts.total}/{minPlayersPerTeam}
                    </span>
                  )}
                  {minMalePerTeam > 0 && (
                    <span className={counts.male >= minMalePerTeam ? s.crRosterMet : s.crRosterPending}>
                      {counts.male}/{minMalePerTeam} ♂
                    </span>
                  )}
                  {minFemalePerTeam > 0 && (
                    <span className={counts.female >= minFemalePerTeam ? s.crRosterMet : s.crRosterPending}>
                      {counts.female}/{minFemalePerTeam} ♀
                    </span>
                  )}
                </div>
              )}

              <div className={s.crTeamAct}>
                {isLeader ? (
                  <em className={s.crTeamActLead}>Leading bid</em>
                ) : ok ? (
                  <em className={s.crTeamActOk}>Bid {rupees(nextAmount, currencySymbol)}</em>
                ) : (
                  <em className={s.crTeamActCant}>Can't cover</em>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
