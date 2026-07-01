'use client'
import type { RefObject } from 'react'
import type { AuctionState } from '@/features/auction/types'
import type { TweakState } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import { PRESETS } from '@/lib/presets'
import { applyGenderPriceOverride, applyGlobalBudget } from '@/features/auction/store'
import { TopBar, type DisplayView } from './TopBar'
import { PlayerStage } from './PlayerStage'
import { BidHero } from './BidHero'
import { BidFeed } from './BidFeed'
import { PurseRow } from './PurseRow'
import { IdleScreen } from './IdleScreen'
import { SoldOverlay } from './SoldOverlay'
import { UnsoldOverlay } from './UnsoldOverlay'
import { PausedOverlay } from './PausedOverlay'
import { SummaryOverlay } from './SummaryOverlay'
import { PlayersView } from './PlayersView'
import { TeamsView } from './TeamsView'
import { CaptainResultsDisplayView } from './CaptainResultsDisplayView'
import s from './display.module.css'

interface DisplayScreenProps {
  state: AuctionState
  tweaks: TweakState
  view: DisplayView
  conn: 'live' | 'reconnecting'
  players: PlayerData[]
  teams: TeamData[]
  screenRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  animOn: boolean
  onReconnect?: () => void
  onCloseSummary?: () => void
}

export function DisplayScreen({
  state, tweaks, view, conn, players, teams,
  screenRef, canvasRef, animOn,
  onReconnect, onCloseSummary,
}: DisplayScreenProps) {
  const effectiveTeams = applyGlobalBudget(teams, tweaks)
  const teamById = Object.fromEntries(effectiveTeams.map((t) => [t.id, t]))
  const leaderTeam = state.leaderId
    ? teamById[state.leaderId]
    : state.phase === 'sold' && state.justBought
      ? teamById[state.justBought]
      : null

  const cssAccent = tweaks.accent
  const liveAccent = tweaks.teamTheming && leaderTeam ? leaderTeam.color : cssAccent
  const glow = `color-mix(in srgb, ${liveAccent} 45%, transparent)`
  const preset = PRESETS[tweaks.style]

  const rootStyle: React.CSSProperties = {
    ...(Object.fromEntries(Object.entries(preset)) as React.CSSProperties),
    '--accent': cssAccent,
    '--liveaccent': liveAccent,
    '--glow': glow,
    '--font-display': `'${tweaks.displayFont}'`,
    '--font-cond': "'Saira Semi Condensed'",
    '--font-body': "'Saira'",
    ...(!tweaks.spotlight ? { '--spot': 'transparent' } : {}),
  } as React.CSSProperties

  // Derive the correct lot list based on auction mode so player index is accurate
  const captainPlayers = players.filter((p) => (p as any).category === 'captain')
  const regularPlayers = players.filter((p) => (p as any).category === 'player')
  const unsoldCaptainIds = new Set(
    state.captainResults.filter((r) => r.unsold).map((r) => r.playerId)
  )
  const unsoldCaptains = captainPlayers.filter((p) => unsoldCaptainIds.has(p.id))
  const modePool = !tweaks.captainAuction
    ? players
    : state.auctionMode === 'captain' ? captainPlayers
    : state.auctionMode === 'player' ? [...regularPlayers, ...unsoldCaptains]
    : players

  // Phase 2+: only unsold players from the previous phase re-enter the pool
  const lotPlayers = (() => {
    if (state.auctionPhase > 1 && state.phaseResults.length > 0) {
      const prev = state.phaseResults[state.phaseResults.length - 1]
      const unsoldIds = new Set(prev.filter((r) => r.unsold).map((r) => r.playerId))
      return modePool.filter((p) => unsoldIds.has(p.id))
    }
    return modePool
  })()

  const effectiveLotPlayers = applyGenderPriceOverride(lotPlayers, tweaks)
  const player = effectiveLotPlayers[state.lotIndex]
  const showPlayer = ['walkin', 'bidding', 'sold', 'unsold'].includes(state.phase)
  const leader = state.leaderId ? teamById[state.leaderId] : null
  const hasBid = state.leaderId !== null
  const showSummary = view === 'summary' || (view === 'live' && state.phase === 'summary')

  // Captain results to display — either current results (captain mode) or saved (player mode)
  const captainResultsToShow = state.auctionMode === 'player' ? state.captainResults : state.results

  return (
    <div
      className={s.screen}
      ref={screenRef}
      style={rootStyle}
      {...(animOn ? { 'data-anim': '' } : {})}
    >
      <div className={s.bgSpot} />
      <div className={s.bgGrid} />
      <div className={s.bgVignette} />
      <canvas className={s.fxCanvas} ref={canvasRef} />

      <TopBar
        state={state}
        view={view}
        conn={conn}
        players={lotPlayers}
        eventName={tweaks.eventName}
        eventYear={tweaks.eventYear}
        logoUrl={tweaks.logoUrl || undefined}
        onReconnect={onReconnect}
      />

      {view === 'captain-results' && (
        <CaptainResultsDisplayView
          results={captainResultsToShow}
          players={players}
          teams={teams}
          currencySymbol={tweaks.currencySymbol}
        />
      )}

      {view === 'live' && (
        <div className={s.stageMain}>
          {showPlayer && player && (
            <>
              <PlayerStage key={player.id} player={player} phase={state.phase} currencySymbol={tweaks.currencySymbol} bidSeq={state.bidSeq} />
              <div className={s.bidCol}>
                {state.phase === 'walkin' ? (
                  <div className={s.bidIncoming}>
                    <b className={s.bidIncomingTitle}>Entering the Auction</b>
                    <span className={s.bidIncomingSub}>{player.name}</span>
                  </div>
                ) : (
                  <BidHero
                    currentBid={state.currentBid}
                    leader={leader ? { ...leader } : null}
                    status={state.status}
                    hasBid={hasBid}
                    currencySymbol={tweaks.currencySymbol}
                    secretBid={state.secretBid}
                  />
                )}
                {state.phase !== 'walkin' && tweaks.showFeed && (
                  <BidFeed feed={state.feed} teamsById={teamById} currencySymbol={tweaks.currencySymbol} />
                )}
              </div>
            </>
          )}

          {state.phase === 'idle' && (
            <IdleScreen
              done={state.results.length}
              total={lotPlayers.length}
              nextPlayer={lotPlayers[state.results.length] ?? null}
              eventName={tweaks.eventName}
              logoUrl={tweaks.logoUrl || undefined}
            />
          )}
        </div>
      )}

      {view === 'players' && (
        <PlayersView
          players={players}
          results={[...state.captainResults, ...state.phaseResults.flat(), ...state.results]}
          teamsById={teamById}
          currentId={showPlayer && player ? player.id : null}
          animOn={animOn}
          currencySymbol={tweaks.currencySymbol}
          captainAuction={tweaks.captainAuction}
        />
      )}

      {view === 'teams' && (
        <TeamsView
          teams={effectiveTeams}
          players={players}
          teamsState={state.teams}
          results={[...state.captainResults, ...state.phaseResults.flat(), ...state.results]}
          animOn={animOn}
          currencySymbol={tweaks.currencySymbol}
          captainAuction={tweaks.captainAuction}
        />
      )}

      {(view === 'live' || view === 'captain-results') && (
        <PurseRow
          teams={effectiveTeams}
          teamsState={state.teams}
          leaderId={state.leaderId}
          justBoughtId={state.justBought}
          currencySymbol={tweaks.currencySymbol}
        />
      )}

      {/* Overlays — shown on top of live view regardless of what else is rendering */}
      {view === 'live' && state.phase === 'sold' && state.justBought && player && (
        <SoldOverlay
          player={player}
          team={teamById[state.justBought]}
          price={state.currentBid}
          currencySymbol={tweaks.currencySymbol}
        />
      )}
      {view === 'live' && state.phase === 'unsold' && player && (
        <UnsoldOverlay player={player} />
      )}
      {view === 'live' && state.paused && state.phase !== 'idle' && state.phase !== 'summary' && (
        <PausedOverlay />
      )}
      {showSummary && (
        <SummaryOverlay
          teams={effectiveTeams}
          players={players}
          teamsState={state.teams}
          results={[...state.phaseResults.flat(), ...state.results]}
          phases={[
            ...(state.captainResults.length > 0
              ? [{ label: 'Captain Auction', results: state.captainResults }]
              : []),
            ...state.phaseResults.map((r, i) => ({ label: `Phase ${i + 1}`, results: r })),
            ...(state.results.length > 0
              ? [{ label: `Phase ${state.auctionPhase}`, results: state.results }]
              : []),
          ]}
          onClose={onCloseSummary ?? (() => {})}
          currencySymbol={tweaks.currencySymbol}
        />
      )}
    </div>
  )
}
