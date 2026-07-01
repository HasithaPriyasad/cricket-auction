export type AuctionPhase = 'idle' | 'walkin' | 'bidding' | 'sold' | 'unsold' | 'summary'
export type BidStatus = '' | 'once' | 'twice' | 'final'
export type HistoryKind = 'intro' | 'bid' | 'status' | 'sold' | 'unsold'

export interface TeamState {
  spent: number
  players: number[] // player IDs
}

export interface BidEntry {
  id: number
  team: string
  amount: number
}

export interface HistoryEntry {
  id: number
  t: number     // simMin
  text: string
  kind: HistoryKind
  team?: string
}

export interface LotResult {
  playerId: number
  soldTo?: string
  price?: number
  unsold?: true
}

export interface AuctionState {
  phase: AuctionPhase
  auctionMode: 'captain' | 'player' | null
  lotIndex: number
  currentBid: number
  leaderId: string | null
  status: BidStatus
  teams: Record<string, TeamState>
  feed: BidEntry[]
  history: HistoryEntry[]
  results: LotResult[]        // current phase results only
  captainResults: LotResult[]
  phaseResults: LotResult[][]  // archived results from completed phases (index 0 = phase 1, etc.)
  auctionPhase: number         // 1-based; increments with each START_NEXT_PHASE
  lotOrder: number[]
  simMin: number
  paused: boolean
  justBought: string | null
  bidSeq: number
  secretBid: boolean           // true when auction has entered secret bid mode
}

// ── Tweak / visual settings ─────────────────────────────────────────────────

export type PresetName = 'stadium' | 'neon' | 'bright' | 'mono'
export type CelebrationIntensity = 'subtle' | 'standard' | 'max'

export interface BidRule {
  threshold: number  // when currentBid >= threshold, use this increment
  increment: number
}

export interface TweakState {
  style: PresetName
  accent: string
  teamTheming: boolean
  displayFont: string
  celebration: CelebrationIntensity
  showFeed: boolean
  spotlight: boolean
  autoAdvanceDelay: number // seconds after sold/unsold before returning to idle; 0 = disabled
  eventName: string
  eventYear: string
  logoUrl: string
  currencySymbol: string
  bidRules: BidRule[]
  maleBasePrice: number   // 0 = use player-level price
  femaleBasePrice: number // 0 = use player-level price
  captainAuction: boolean // false = skip captain phase, all players in one flat pool
  globalTeamBudget: number // 0 = use individual team budgets
  secretBidThreshold: number // 0 = disabled; when currentBid reaches this, switch to secret bid mode
  minPlayersPerTeam: number  // 0 = no restriction
  minMalePerTeam: number     // 0 = no restriction
  minFemalePerTeam: number   // 0 = no restriction
}

// ── Audio slice ──────────────────────────────────────────────────────────────

export interface AudioState {
  voiceOn: boolean
  fxOn: boolean
  volume: number
}

// ── UI slice ─────────────────────────────────────────────────────────────────

export type AdminPanel = 'auction' | 'players' | 'teams' | 'settings'

export interface UIState {
  activePanel: AdminPanel
  displayConnected: boolean
  previewOpen: boolean
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type AuctionAction =
  | { type: 'NEXT'; targetIdx?: number }
  | { type: 'BIDDING' }
  | { type: 'BID'; teamId: string }
  | { type: 'STATUS'; value: Exclude<BidStatus, ''> }
  | { type: 'AUTOBID' }
  | { type: 'CLEAR_STATUS' }
  | { type: 'SOLD' }
  | { type: 'UNSOLD' }
  | { type: 'IDLE' }
  | { type: 'SUMMARY' }
  | { type: 'CLOSE_SUMMARY' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'REVERT' }
  | { type: 'REVERT_BID' }
  | { type: 'START_CAPTAIN_AUCTION'; lotOrder?: number[] }
  | { type: 'START_PLAYER_AUCTION'; lotOrder?: number[] }
  | { type: 'START_NEXT_PHASE' }
  | { type: 'ENTER_SECRET_BID' }
  | { type: 'EXIT_SECRET_BID' }
  | { type: 'SECRET_BID_SOLD'; teamId: string; price: number }
