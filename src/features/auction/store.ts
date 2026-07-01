'use client'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { TWEAK_DEFAULTS } from '@/lib/presets'
import { reducer, initState, type PlayerData, type TeamData } from './reducer'
import type { AuctionAction, AuctionState, AudioState, TweakState, UIState } from './types'


export function applyGlobalBudget(teams: TeamData[], tweaks: TweakState): TeamData[] {
  if (!tweaks.globalTeamBudget) return teams
  return teams.map((t) => ({ ...t, budget: tweaks.globalTeamBudget }))
}

export function applyGenderPriceOverride(players: PlayerData[], tweaks: TweakState): PlayerData[] {
  const { maleBasePrice, femaleBasePrice } = tweaks
  if (!maleBasePrice && !femaleBasePrice) return players
  return players.map((p) => {
    const override = p.gender === 'male' ? maleBasePrice : femaleBasePrice
    return override > 0 ? { ...p, basePrice: override } : p
  })
}

function lotPlayersList(action: AuctionAction, auction: AuctionState, players: PlayerData[]): PlayerData[] {
  const mode = action.type === 'START_CAPTAIN_AUCTION' ? 'captain'
    : action.type === 'START_PLAYER_AUCTION' ? 'player'
    : auction.auctionMode

  let pool: PlayerData[]
  if (mode === 'captain') {
    pool = players.filter((p) => p.category === 'captain')
  } else if (mode === 'player') {
    const regular = players.filter((p) => p.category === 'player')
    const captainRes = action.type === 'START_PLAYER_AUCTION' ? auction.results : auction.captainResults
    const unsoldIds = new Set(captainRes.filter((r) => r.unsold).map((r) => r.playerId))
    const unsoldCaptains = players.filter((p) => p.category === 'captain' && unsoldIds.has(p.id))
    pool = [...regular, ...unsoldCaptains]
  } else {
    pool = players
  }

  // Phase restriction: only unsold players from the previous phase re-enter the pool
  if (action.type === 'START_NEXT_PHASE') {
    // About to archive current results — unsold in those = next phase's pool
    const unsoldIds = new Set(auction.results.filter((r) => r.unsold).map((r) => r.playerId))
    pool = pool.filter((p) => unsoldIds.has(p.id))
  } else if (auction.auctionPhase > 1 && auction.phaseResults.length > 0) {
    // Already in phase 2+ — filter by unsold from the last completed phase
    const prev = auction.phaseResults[auction.phaseResults.length - 1]
    const unsoldIds = new Set(prev.filter((r) => r.unsold).map((r) => r.playerId))
    pool = pool.filter((p) => unsoldIds.has(p.id))
  }

  return pool
}

// ── Full store shape ─────────────────────────────────────────────────────────

interface StoreState {
  // Reference data (loaded once from API)
  players: PlayerData[]
  teams: TeamData[]

  // Auction domain state (driven by reducer)
  auction: AuctionState

  // Tweak / visual settings
  tweaks: TweakState

  // Audio
  audio: AudioState

  // UI
  ui: UIState

  // UI display view (tracked here so FULL_STATE can include it)
  displayView: string

  // Actions
  loadData: (players: PlayerData[], teams: TeamData[]) => void
  loadPlayersTeams: (players: PlayerData[], teams: TeamData[]) => void
  dispatch: (action: AuctionAction) => void
  applyRemoteAction: (action: AuctionAction) => void
  loadTweaks: (tweaks: TweakState) => void
  loadAuction: (auction: AuctionState) => void
  setTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void
  setAudio: <K extends keyof AudioState>(key: K, value: AudioState[K]) => void
  setUI: <K extends keyof UIState>(key: K, value: UIState[K]) => void
  setDisplayView: (view: string) => void
  resetAuction: () => void

  // Broadcast channel reference (not serialised)
  _channel: BroadcastChannel | null
  _initChannel: () => void
  _destroyChannel: () => void
}

export const useAuctionStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    players: [],
    teams: [],
    auction: initState([], []),

    tweaks: { ...TWEAK_DEFAULTS },

    audio: { voiceOn: false, fxOn: true, volume: 0.8 },

    ui: { activePanel: 'auction', displayConnected: false, previewOpen: false },

    displayView: 'live',

    _channel: null,

    loadData(players, teams) {
      set({ players, teams, auction: initState(teams, players) })
    },

    // Load players/teams into the store without resetting auction state.
    // Used by the display page so applyRemoteAction has correct reference data.
    loadPlayersTeams(players: PlayerData[], teams: TeamData[]) {
      set({ players, teams })
    },

    dispatch(action) {
      const { players, teams, auction, tweaks } = get()
      let act = action
      if (action.type === 'NEXT') {
        // Pick a random remaining player so both windows (operator + display) see the same choice
        const lotPlayers = lotPlayersList(action, auction, players)
        const auctionedIds = new Set(auction.results.map((r) => r.playerId))
        const remaining = lotPlayers.map((p, i) => ({ p, i })).filter(({ p }) => !auctionedIds.has(p.id))
        if (remaining.length > 0) {
          const { i } = remaining[Math.floor(Math.random() * remaining.length)]
          act = { ...action, targetIdx: i }
        }
      }
      const lotPlayers = applyGenderPriceOverride(lotPlayersList(act, auction, players), tweaks)
      const effectiveTeams = applyGlobalBudget(teams, tweaks)
      const next = reducer(auction, act, lotPlayers, effectiveTeams, tweaks.bidRules, tweaks.secretBidThreshold ?? 0, tweaks.currencySymbol)
      set({ auction: next })
      get()._channel?.postMessage({ type: 'AUCTION_ACTION', action: act })
    },

    applyRemoteAction(action) {
      const { players, teams, auction, tweaks } = get()
      const lotPlayers = applyGenderPriceOverride(lotPlayersList(action, auction, players), tweaks)
      const effectiveTeams = applyGlobalBudget(teams, tweaks)
      const next = reducer(auction, action, lotPlayers, effectiveTeams, tweaks.bidRules, tweaks.secretBidThreshold ?? 0, tweaks.currencySymbol)
      set({ auction: next })
    },

    loadTweaks(tweaks) {
      set({ tweaks })
    },

    loadAuction(auction) {
      set({ auction })
    },

    setTweak(key, value) {
      set((s) => ({ tweaks: { ...s.tweaks, [key]: value } }))
      get()._channel?.postMessage({ type: 'TWEAK_UPDATE', key, value })
    },

    setAudio(key, value) {
      set((s) => ({ audio: { ...s.audio, [key]: value } }))
      get()._channel?.postMessage({ type: 'AUDIO_UPDATE', audio: get().audio })
    },

    setUI(key, value) {
      set((s) => ({ ui: { ...s.ui, [key]: value } }))
    },

    setDisplayView(view) {
      set({ displayView: view })
      get()._channel?.postMessage({ type: 'VIEW_UPDATE', view })
    },

    resetAuction() {
      const { players, teams } = get()
      set({ auction: initState(teams, players) })
      get()._channel?.postMessage({ type: 'AUCTION_ACTION', action: { type: 'RESET' } })
    },

    _initChannel() {
      if (typeof window === 'undefined') return
      if (get()._channel) return
      const ch = new BroadcastChannel('cricket-auction')
      ch.onmessage = (ev) => {
        const msg = ev.data
        if (!msg?.type) return
        if (msg.type === 'AUCTION_ACTION') {
          get().applyRemoteAction(msg.action)
        } else if (msg.type === 'TWEAK_UPDATE') {
          set((s) => ({ tweaks: { ...s.tweaks, [msg.key]: msg.value } }))
        } else if (msg.type === 'DISPLAY_ALIVE') {
          set((s) => ({ ui: { ...s.ui, displayConnected: true } }))
          // Heartbeat timeout: if no ping in 3s, mark disconnected
          clearTimeout((window as any).__displayTimeout)
          ;(window as any).__displayTimeout = setTimeout(() => {
            set((s) => ({ ui: { ...s.ui, displayConnected: false } }))
          }, 3000)
        } else if (msg.type === 'AUDIO_UPDATE') {
          set({ audio: msg.audio })
        } else if (msg.type === 'REQUEST_STATE') {
          // Display requesting full state sync (e.g., after page reload)
          const { auction, tweaks, audio, displayView } = get()
          ch.postMessage({ type: 'FULL_STATE', auction, tweaks, audio, displayView })
        } else if (msg.type === 'FULL_STATE') {
          const a = msg.auction
          set({
            auction: { ...a, auctionMode: a.auctionMode ?? null, captainResults: a.captainResults ?? [], lotOrder: a.lotOrder ?? [], phaseResults: a.phaseResults ?? [], auctionPhase: a.auctionPhase ?? 1 },
            tweaks: msg.tweaks,
            audio: msg.audio,
          })
        } else if (msg.type === 'PLAYERS_UPDATE') {
          set({ players: msg.players })
        }
      }
      set({ _channel: ch })
    },

    _destroyChannel() {
      get()._channel?.close()
      set({ _channel: null })
    },
  }))
)

// ── Typed selectors for components ───────────────────────────────────────────

export const selectAuction = (s: StoreState) => s.auction
export const selectTweaks = (s: StoreState) => s.tweaks
export const selectAudio = (s: StoreState) => s.audio
export const selectUI = (s: StoreState) => s.ui
export const selectPlayers = (s: StoreState) => s.players
export const selectTeams = (s: StoreState) => s.teams
export const selectDispatch = (s: StoreState) => s.dispatch
