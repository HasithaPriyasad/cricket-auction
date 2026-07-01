'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuctionStore, applyGenderPriceOverride, applyGlobalBudget } from '@/features/auction/store'
import { useDangerConfirm } from '@/hooks/useDangerConfirm'
import { TWEAK_DEFAULTS } from '@/lib/presets'
import { bidIncrement } from '@/lib/bidIncrement'
import { speakAmount } from '@/lib/formatters'
import type { AuctionState, TweakState } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import type { DisplayView } from '@/features/display/TopBar'
import { NowAuctioning } from './NowAuctioning'
import { TeamBidGrid } from './TeamBidGrid'
import { SecretBidPanel } from './SecretBidPanel'
import { AuctioneerActions } from './AuctioneerActions'
import { CaptainAuctionSummary } from './CaptainAuctionSummary'
import { PhaseCompleteSummary } from './PhaseCompleteSummary'
import { AuctionTimeline } from './AuctionTimeline'
import { AudiencePreview } from './AudiencePreview'
import { TweaksPanel } from './TweaksPanel'
import { PlayersPanel } from './PlayersPanel'
import { TeamsPanel } from './TeamsPanel'
import { ResultsPanel } from './ResultsPanel'
import { ConfigPanel } from './ConfigPanel'
import s from './admin.module.css'

type AdminPanel = 'auction' | 'players' | 'teams' | 'results' | 'config'

const PANEL_TABS: { id: AdminPanel; label: string }[] = [
  { id: 'auction', label: 'Auction' },
  { id: 'players', label: 'Players' },
  { id: 'teams', label: 'Teams' },
  { id: 'results', label: 'Results' },
  { id: 'config', label: 'Config' },
]

interface OperatorAppProps {
  initialPlayers: PlayerData[]
  initialTeams: TeamData[]
  initialTweaks: TweakState
  initialAuctionState: AuctionState | null
}

export function OperatorApp({ initialPlayers, initialTeams, initialTweaks, initialAuctionState }: OperatorAppProps) {
  const store = useAuctionStore()
  const auction = useAuctionStore((st) => st.auction)
  const tweaks = useAuctionStore((st) => st.tweaks)
  const dispatch = useAuctionStore((st) => st.dispatch)
  const setTweak = useAuctionStore((st) => st.setTweak)
  const setAudio = useAuctionStore((st) => st.setAudio)
  const audioState = useAuctionStore((st) => st.audio)
  const loadData = useAuctionStore((st) => st.loadData)
  const loadTweaks = useAuctionStore((st) => st.loadTweaks)
  const loadAuction = useAuctionStore((st) => st.loadAuction)
  const resetAuction = useAuctionStore((st) => st.resetAuction)
  const setDisplayView = useAuctionStore((st) => st.setDisplayView)

  const { confirm, ConfirmModal } = useDangerConfirm()

  const [panel, setPanel] = useState<AdminPanel>('auction')
  const [view, setView] = useState<DisplayView>('live')

  // Broadcast view to display whenever it changes
  useEffect(() => { setDisplayView(view) }, [view])

  // When player auction starts, 'captain-results' view is stale — revert to live
  useEffect(() => {
    if (auction.auctionMode !== 'captain' && view === 'captain-results') {
      setView('live')
    }
  }, [auction.auctionMode])
  const [conn, setConn] = useState<'live' | 'reconnecting'>('live')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [displayWindows, setDisplayWindows] = useState(0)

  // Mutable data state (for CRUD panels that can refresh)
  const [players, setPlayers] = useState(initialPlayers)
  const [teams, setTeams] = useState(initialTeams)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const popupsRef = useRef<Window[]>([])
  const prevAuctionRef = useRef<AuctionState | null>(null)
  const actRef = useRef<typeof act | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const [voiceTestActive, setVoiceTestActive] = useState(false)

  function handleStartPlayerAuction() {
    // Identify captains to convert: explicitly unsold OR never auctioned (skipped mid-auction)
    const auctionedCaptainIds = new Set(auction.results.map((r) => r.playerId))
    const unsoldCaptainIds = players
      .filter((p) => p.category === 'captain')
      .filter((p) => !auctionedCaptainIds.has(p.id) || auction.results.find((r) => r.playerId === p.id)?.unsold === true)
      .map((p) => p.id)

    dispatch({ type: 'START_PLAYER_AUCTION' })

    if (unsoldCaptainIds.length > 0) {
      // Persist to DB (fire-and-forget)
      fetch('/api/players/convert-captains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unsoldCaptainIds }),
      }).catch(() => {})
      // Update in-memory state
      const updatedPlayers = players.map((p) =>
        unsoldCaptainIds.includes(p.id) ? { ...p, category: 'player' as const } : p
      )
      setPlayers(updatedPlayers)
      store.loadPlayersTeams(updatedPlayers, teams)
      useAuctionStore.getState()._channel?.postMessage({ type: 'PLAYERS_UPDATE', players: updatedPlayers })
    }
  }

  async function refreshData() {
    const [pr, tr] = await Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/teams').then((r) => r.json()),
    ])
    setPlayers(pr)
    setTeams(tr)
    store.loadPlayersTeams(pr, tr)  // update reference data without resetting auction state
  }

  // Load initial data into store on mount
  useEffect(() => {
    loadTweaks(initialTweaks)
    loadData(initialPlayers, initialTeams)
    if (initialAuctionState) {
      const freshTeamMap = Object.fromEntries(initialTeams.map((t) => [t.id, { spent: 0, players: [] }]))
      const restored = {
        ...initialAuctionState,
        auctionMode: initialAuctionState.auctionMode ?? null,
        captainResults: initialAuctionState.captainResults ?? [],
        lotOrder: initialAuctionState.lotOrder ?? [],
        phaseResults: initialAuctionState.phaseResults ?? [],
        auctionPhase: initialAuctionState.auctionPhase ?? 1,
        secretBid: initialAuctionState.secretBid ?? false,
        teams: { ...freshTeamMap, ...initialAuctionState.teams },
      }
      loadAuction(restored)
      // Re-save immediately so any missing new fields are written back to DB
      fetch('/api/auction-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restored),
      }).catch(() => {})
    }
    store._initChannel()
    return () => store._destroyChannel()
  }, [])


  // Save auction state to DB on every change (100ms debounce to batch rapid updates).
  // Read from getState() so the callback always captures the final state after loadAuction,
  // not the intermediate initState() value that exists when the effect first fires on mount.
  const auctionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (auctionSaveTimerRef.current) clearTimeout(auctionSaveTimerRef.current)
    auctionSaveTimerRef.current = setTimeout(() => {
      fetch('/api/auction-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useAuctionStore.getState().auction),
      }).catch(() => { /* silent */ })
    }, 100)
    return () => { if (auctionSaveTimerRef.current) clearTimeout(auctionSaveTimerRef.current) }
  }, [auction])

  // Pre-load TTS voices so they're available when we need them
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const load = () => { voicesRef.current = speechSynthesis.getVoices() }
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  // Lot players for current auction mode
  const captains = players.filter((p) => (p as any).category === 'captain')
  const regularPlayers = players.filter((p) => (p as any).category === 'player')

  // Unsold captains enter the player pool
  const captainResultsForPool = auction.auctionMode === 'captain' ? auction.results : auction.captainResults
  const unsoldCaptainIds = new Set(captainResultsForPool.filter((r) => r.unsold).map((r) => r.playerId))
  const unsoldCaptainPlayers = captains.filter((p) => unsoldCaptainIds.has(p.id))

  const modePool = !tweaks.captainAuction
    ? players
    : auction.auctionMode === 'captain' ? captains
      : auction.auctionMode === 'player' ? [...regularPlayers, ...unsoldCaptainPlayers]
      : players

  // Phase 2+: only unsold players from the previous phase re-enter the pool
  const phasePool = (() => {
    if (auction.auctionPhase > 1 && auction.phaseResults.length > 0) {
      const prev = auction.phaseResults[auction.phaseResults.length - 1]
      const unsoldIds = new Set(prev.filter((r) => r.unsold).map((r) => r.playerId))
      return modePool.filter((p) => unsoldIds.has(p.id))
    }
    return modePool
  })()

  const lotPlayers = applyGenderPriceOverride(phasePool, tweaks)

  // Global budget override: takes priority over individual team budgets
  const effectiveTeams = applyGlobalBudget(teams, tweaks)

  // Captain auction is done when all captain lots have a result (or there are no captains at all)
  // Never shown when captain auction feature is disabled
  const captainAuctionDone = tweaks.captainAuction
    && auction.auctionMode === 'captain'
    && auction.results.length >= captains.length

  // A player-auction phase is done when every lot in the current phase has a result
  const phaseDone = !captainAuctionDone
    && auction.auctionMode !== 'captain'
    && auction.phase !== 'summary'
    && lotPlayers.length > 0
    && auction.results.length >= lotPlayers.length

  // All results across every completed phase + current phase (for summary / display)
  const allPhaseResults = [...auction.phaseResults.flat(), ...auction.results]

  // Compute next bid amount using configured rules
  const nextAmount = auction.leaderId === null
    ? auction.currentBid
    : auction.currentBid + bidIncrement(auction.currentBid, tweaks.bidRules)

  function isEligible(teamId: string): boolean {
    const team = effectiveTeams.find((t) => t.id === teamId)
    if (!team) return false
    return (
      auction.phase === 'bidding' &&
      !auction.paused &&
      teamId !== auction.leaderId &&
      team.budget - (auction.teams[teamId]?.spent ?? 0) >= nextAmount
    )
  }

  // ── Actions ──
  function next() {
    if (auction.results.length >= lotPlayers.length) return
    dispatch({ type: 'NEXT' })
    setView('live')
    setSelectedTeam(null)
  }

  const act = {
    next,
    bid: (teamId: string) => { dispatch({ type: 'BID', teamId }); setSelectedTeam(teamId) },
    enterSecretBid: () => dispatch({ type: 'ENTER_SECRET_BID' }),
    exitSecretBid: () => dispatch({ type: 'EXIT_SECRET_BID' }),
    secretBidSold: (teamId: string, price: number) => { dispatch({ type: 'SECRET_BID_SOLD', teamId, price }); setSelectedTeam(null) },
    bidSelected: () => {
      if (auction.phase !== 'bidding' || auction.paused) return
      const ok = (id: string) => isEligible(id)
      let team = selectedTeam && ok(selectedTeam) ? selectedTeam : null
      if (!team) { const c = teams.find((tm) => ok(tm.id)); team = c ? c.id : null }
      if (team) { dispatch({ type: 'BID', teamId: team }); setSelectedTeam(team) }
    },
    cycleTeam: (dir: 1 | -1) => {
      const elig = teams.filter((tm) => isEligible(tm.id))
      if (!elig.length) return
      const cur = elig.findIndex((tm) => tm.id === selectedTeam)
      const ni = ((cur === -1 ? (dir > 0 ? -1 : 0) : cur) + dir + elig.length) % elig.length
      setSelectedTeam(elig[ni].id)
    },
    status: (v: 'once' | 'twice' | 'final') => dispatch({ type: 'STATUS', value: v }),
    sold: () => { dispatch({ type: 'SOLD' }); setSelectedTeam(null) },
    unsold: () => { dispatch({ type: 'UNSOLD' }); setSelectedTeam(null) },
    togglePause: () => dispatch({ type: 'PAUSE' }),
    cancel: () => { if (auction.status) dispatch({ type: 'CLEAR_STATUS' }) },
    revert: () => { dispatch({ type: 'REVERT' }); setSelectedTeam(null) },
    revertBid: () => dispatch({ type: 'REVERT_BID' }),
    openDisplay: () => {
      const displayUrl = `${window.location.origin}/display`
      const w = window.open(displayUrl, 'lpa-audience-display', 'width=1280,height=720')
      if (!w) { alert('Could not open the audience window — please allow pop-ups, then try again.'); return }
      popupsRef.current.push(w)
      setDisplayWindows(popupsRef.current.filter((x) => x && !x.closed).length)
      w.focus()  // bring display to front so user sees the activation overlay
    },
  }
  actRef.current = act

  // Track popup count
  useEffect(() => {
    const id = setInterval(() => {
      const n = popupsRef.current.filter((w) => w && !w.closed).length
      setDisplayWindows((cur) => (cur !== n ? n : cur))
    }, 1500)
    return () => clearInterval(id)
  }, [])

  // Keyboard shortcuts — use actRef so we always call the latest version of each action
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel !== 'auction') return
      if (e.target && /input|textarea|select/i.test((e.target as Element).tagName)) return
      const a = actRef.current
      if (!a) return
      const k = e.key.toLowerCase()
      const map: Record<string, () => void> = {
        '1': () => a.status('once'), '2': () => a.status('twice'), '3': () => a.status('final'),
        s: a.sold, u: a.unsold, n: a.next, b: a.bidSelected,
        arrowleft: () => a.cycleTeam(-1), arrowright: () => a.cycleTeam(1),
        p: () => setView((v) => (v === 'players' ? 'live' : 'players')),
        t: () => setView((v) => (v === 'teams' ? 'live' : 'teams')),
        l: () => setView('live'),
        ' ': a.togglePause, escape: a.cancel, f: a.openDisplay,
      }
      const fn = map[k]
      if (fn) { e.preventDefault(); fn() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  // Auto-advance from sold / unsold → idle after configured delay
  useEffect(() => {
    const delay = tweaks.autoAdvanceDelay
    if (!delay) return
    if (auction.phase !== 'sold' && auction.phase !== 'unsold') return
    const id = setTimeout(() => dispatch({ type: 'IDLE' }), delay * 1000)
    return () => clearTimeout(id)
  }, [auction.phase, tweaks.autoAdvanceDelay])

  // Voice announcements fired from the admin page where the user's button
  // clicks guarantee fresh transient user activation for speechSynthesis.
  useEffect(() => {
    if (!audioState.voiceOn || typeof speechSynthesis === 'undefined') return
    // Skip the very first render — prevAuctionRef not yet seeded
    if (!prevAuctionRef.current) { prevAuctionRef.current = auction; return }
    const prev = prevAuctionRef.current
    prevAuctionRef.current = auction

    const say = (text: string) => {
      try {
        const u = new SpeechSynthesisUtterance(text)
        const enVoice = voicesRef.current.find((v) => /en[-_]/i.test(v.lang)) ?? voicesRef.current[0] ?? null
        if (enVoice) u.voice = enVoice
        else u.lang = 'en-US'
        u.volume = Math.min(1, audioState.volume + 0.1)
        speechSynthesis.cancel()
        setTimeout(() => speechSynthesis.speak(u), 150)
      } catch { /* no-op */ }
    }

    if (auction.phase === 'bidding' && prev.phase !== 'bidding') {
      const p = lotPlayers[auction.lotIndex]
      if (p) say(`Next player entering the auction. ${p.name}`)
    } else if (auction.phase === 'sold' && prev.phase !== 'sold' && auction.justBought) {
      const team = teams.find((t) => t.id === auction.justBought)
      if (team) say(`Player sold to ${team.name}, for ${speakAmount(auction.currentBid)} rupees`)
    } else if (auction.phase === 'unsold' && prev.phase !== 'unsold') {
      const p = lotPlayers[auction.lotIndex]
      if (p) say(`${p.name}. Unsold.`)
    } else if (auction.status && auction.status !== prev.status) {
      const labels: Record<string, string> = { once: 'Going once', twice: 'Going twice', final: 'Final call' }
      const text = labels[auction.status]
      if (text) say(text)
    } else if (auction.feed[0]?.id !== prev.feed[0]?.id && auction.feed[0]) {
      const team = teams.find((t) => t.id === auction.feed[0].team)
      if (team) say(`Bid from ${team.short ?? team.name}`)
    }
  }, [auction, audioState.voiceOn, audioState.volume])

  const phaseLabel = {
    idle: 'Idle', walkin: 'Walk-in', bidding: 'Bidding',
    sold: 'Sold', unsold: 'Unsold', summary: 'Summary',
  }[auction.phase] ?? 'Idle'

  const lotNo = auction.phase === 'idle' || auction.phase === 'summary'
    ? auction.results.length : auction.lotIndex + 1

  return (
    <>
      <div className={s.cr}>
        {/* Header */}
        <header className={s.crTop}>
          <div className={s.crBrand}>
            {tweaks.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tweaks.logoUrl} alt="" className={s.crMark} style={{ objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <span className={s.crMark} />
            )}
            <div className={s.crBrandTxt}>
              <b>AUCTIONEER CONTROL</b>
              <span>{tweaks.eventName} · {tweaks.eventYear}</span>
            </div>
          </div>

          {/* Panel tabs */}
          <nav className={s.panelNav}>
            {PANEL_TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`${s.panelTab} ${panel === id ? s.panelTabActive : ''}`}
                onClick={() => setPanel(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className={s.crTopAct}>
            <div className={s.crTopStat}>
              {auction.auctionMode && (
                <div className={s.crPill} style={{ color: auction.auctionMode === 'captain' ? '#f3b327' : 'var(--cr-accent)' }}>
                  <b>{auction.auctionMode === 'captain' ? 'Captain' : 'Player'}</b><span>Auction</span>
                </div>
              )}
              {auction.auctionPhase > 1 && (
                <div className={s.crPill} style={{ color: '#37d67a' }}>
                  <b>Phase {auction.auctionPhase}</b><span>Round</span>
                </div>
              )}
              <div className={s.crPill}><b>{phaseLabel}</b><span>Phase</span></div>
              <div className={s.crPill}><b>{Math.min(lotNo, lotPlayers.length)} / {lotPlayers.length}</b><span>Lot</span></div>
              <div className={s.crPill} style={{ color: 'var(--cr-accent)' }}><b>{Math.max(0, lotPlayers.length - auction.results.length)}</b><span>Left</span></div>
              <div className={`${s.crConn} ${conn === 'reconnecting' ? s.crConnDown : ''}`}>
                <span className={`${s.crConnDot} ${conn === 'reconnecting' ? s.crConnDownDot : ''}`} />
                {conn === 'reconnecting' ? 'Reconnecting…' : 'Synced'}
              </div>
            </div>
            <button className={s.crOpen} onClick={act.openDisplay}>
              Open Display ↗
              {displayWindows > 0 && <span className={s.crBadge}>{displayWindows}</span>}
            </button>
          </div>
        </header>

        {/* Auction panel */}
        {panel === 'auction' && (
          <div className={s.crBody}>
            <section className={s.crMain}>
              <div className={s.crScroll}>
                <NowAuctioning state={auction} players={lotPlayers} teams={effectiveTeams} />
                {auction.secretBid
                  ? <SecretBidPanel state={auction} teams={effectiveTeams} onAward={act.secretBidSold} onExit={act.exitSecretBid} currencySymbol={tweaks.currencySymbol} />
                  : <TeamBidGrid state={auction} teams={effectiveTeams} players={players} selectedTeamId={selectedTeam} onBid={act.bid} bidRules={tweaks.bidRules} currencySymbol={tweaks.currencySymbol} minPlayersPerTeam={tweaks.minPlayersPerTeam ?? 0} minMalePerTeam={tweaks.minMalePerTeam ?? 0} minFemalePerTeam={tweaks.minFemalePerTeam ?? 0} />
                }
                {captainAuctionDone ? (
                  <CaptainAuctionSummary
                    results={auction.results}
                    players={players}
                    teams={effectiveTeams}
                    onStartPlayerAuction={handleStartPlayerAuction}
                  />
                ) : phaseDone ? (
                  <PhaseCompleteSummary
                    phase={auction.auctionPhase}
                    results={auction.results}
                    players={players}
                    teams={effectiveTeams}
                    currencySymbol={tweaks.currencySymbol}
                    onStartNextPhase={() => dispatch({ type: 'START_NEXT_PHASE' })}
                    onFinish={() => dispatch({ type: 'SUMMARY' })}
                  />
                ) : (
                  <AuctioneerActions
                    state={auction}
                    lotPlayersCount={lotPlayers.length}
                    captainsCount={captains.length}
                    teamsCount={teams.length}
                    captainAuction={tweaks.captainAuction}
                    onStatus={act.status} onSold={act.sold} onUnsold={act.unsold}
                    onNext={act.next} onPause={act.togglePause}
                    onRevert={act.revert} onRevertBid={act.revertBid}
                    onStartCaptainAuction={() => dispatch({ type: 'START_CAPTAIN_AUCTION' })}
                    onStartPlayerAuction={handleStartPlayerAuction}
                    onEnterSecretBid={act.enterSecretBid}
                  />
                )}
              </div>
              <div className={s.crFoot}>
                <div className={s.crFootGrp}>
                  <span className={s.crFootKey}>Audio</span>
                  <button className={s.crTgl} data-on={audioState.voiceOn ? '1' : '0'}
                    onClick={() => setAudio('voiceOn', !audioState.voiceOn)}>
                    <span className={s.crTglSw} /> Voice
                  </button>
                  <button className={s.crTgl} data-on={audioState.fxOn ? '1' : '0'}
                    onClick={() => setAudio('fxOn', !audioState.fxOn)}>
                    <span className={s.crTglSw} /> SFX
                  </button>
                  <input className={s.crVol} type="range" min="0" max="1" step="0.05"
                    value={audioState.volume}
                    onChange={(e) => setAudio('volume', Number(e.target.value))} />
                  <button
                    className={s.crGhost}
                    disabled={voiceTestActive}
                    onClick={() => {
                      if (typeof speechSynthesis === 'undefined') return
                      try {
                        const u = new SpeechSynthesisUtterance('Voice test, one two three')
                        const enVoice = voicesRef.current.find((v) => /en[-_]/i.test(v.lang)) ?? voicesRef.current[0] ?? null
                        if (enVoice) u.voice = enVoice
                        else u.lang = 'en-US'
                        u.volume = Math.min(1, audioState.volume + 0.1)
                        u.onstart = () => setVoiceTestActive(true)
                        u.onend = () => setVoiceTestActive(false)
                        u.onerror = () => setVoiceTestActive(false)
                        speechSynthesis.cancel()
                        setTimeout(() => speechSynthesis.speak(u), 150)
                      } catch { /* no-op */ }
                    }}
                  >
                    {voiceTestActive ? 'Speaking…' : 'Test Voice'}
                  </button>
                </div>
              </div>
            </section>
            <aside className={s.crSide}>
              <AudiencePreview iframeRef={iframeRef} previewSrc="/display?preview=1"
                view={view} displayWindows={displayWindows}
                captainAuctionDone={captainAuctionDone}
                onSetView={setView} onOpenDisplay={act.openDisplay}
                onToggleFullscreen={() => {
                  useAuctionStore.getState()._channel?.postMessage({ type: 'FULLSCREEN_REQUEST' })
                }} />
              <AuctionTimeline history={auction.history} teams={teams} />
            </aside>
          </div>
        )}

        {panel === 'players' && (
          <PlayersPanel players={players as any} onRefresh={refreshData} />
        )}
        {panel === 'teams' && (
          <TeamsPanel teams={teams} onRefresh={refreshData} />
        )}
        {panel === 'results' && (
          <ResultsPanel teams={effectiveTeams} players={players} lotPlayers={lotPlayers} />
        )}
        {panel === 'config' && (
          <ConfigPanel
            tweaks={tweaks}
            onSave={(changes) => {
              Object.entries(changes).forEach(([k, v]) =>
                setTweak(k as keyof TweakState, v as TweakState[keyof TweakState])
              )
              // Flush immediately — don't wait for the 1s debounce
              const next = { ...tweaks, ...changes }
              fetch('/api/config', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next),
              }).catch(() => {})
            }}
          />
        )}
      </div>

      <TweaksPanel
        tweaks={tweaks}
        onTweak={setTweak}
        onSave={() => {
          fetch('/api/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(useAuctionStore.getState().tweaks),
          }).catch(() => {})
        }}
        onReset={(onDone) => confirm('Reset Auction', () => {
          resetAuction(); setView('live'); setSelectedTeam(null)
          fetch('/api/auction-state', { method: 'DELETE' })
            .then((r) => onDone(r.ok))
            .catch(() => onDone(false))
        })}
        onClearConfig={(onDone) => confirm('Clear Config', () => {
          Object.entries(TWEAK_DEFAULTS).forEach(([k, v]) =>
            setTweak(k as keyof TweakState, v as TweakState[keyof TweakState])
          )
          fetch('/api/config', { method: 'DELETE' })
            .then((r) => onDone(r.ok))
            .catch(() => onDone(false))
        })}
      />
      {ConfirmModal}
    </>
  )
}
