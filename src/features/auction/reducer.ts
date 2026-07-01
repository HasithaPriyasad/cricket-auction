import { bidIncrement } from '@/lib/bidIncrement'
import { rupees } from '@/lib/formatters'
import type { AuctionAction, AuctionState, BidRule, HistoryEntry, TeamState } from './types'

export interface PlayerData {
  id: number
  name: string
  role: string
  country: string
  age: number
  jerseyNum: number
  basePrice: number
  tag: string
  category: 'captain' | 'player'
  gender: 'male' | 'female'
  photoUrl?: string | null
  hasPhoto?: boolean
  sortOrder: number
}

export interface TeamData {
  id: string
  name: string
  short: string
  abbreviation: string
  color: string
  budget: number
}

export function initState(teams: TeamData[], players: PlayerData[]): AuctionState {
  const teamMap: Record<string, TeamState> = {}
  teams.forEach((t) => { teamMap[t.id] = { spent: 0, players: [] } })
  return {
    phase: 'idle',
    auctionMode: null,
    lotIndex: 0,
    currentBid: 0,
    leaderId: null,
    status: '',
    teams: teamMap,
    feed: [],
    history: [],
    results: [],
    captainResults: [],
    phaseResults: [],
    auctionPhase: 1,
    lotOrder: [],
    simMin: 5,
    paused: false,
    justBought: null,
    bidSeq: 0,
    secretBid: false,
  }
}

function pushHist(state: AuctionState, text: string, kind: HistoryEntry['kind'], team?: string): HistoryEntry[] {
  return [...state.history, { id: state.history.length, t: state.simMin, text, kind, team }]
}

export function reducer(
  state: AuctionState,
  action: AuctionAction,
  players: PlayerData[],
  teams: TeamData[],
  bidRules?: BidRule[],
  secretBidThreshold = 0,
  currencySymbol = '₹',
): AuctionState {
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  switch (action.type) {
    case 'NEXT': {
      const auctionedIds = new Set(state.results.map((r) => r.playerId))
      const remaining = players.map((p, i) => ({ p, i })).filter(({ p }) => !auctionedIds.has(p.id))
      if (remaining.length === 0) return { ...state, phase: 'summary' }
      // targetIdx is set by dispatch to the pre-chosen random index so both windows agree
      const chosen = action.targetIdx != null
        ? remaining.find(({ i }) => i === action.targetIdx) ?? remaining[0]
        : remaining[0]
      const { p, i: idx } = chosen
      const sim = state.simMin + 2
      return {
        ...state,
        lotIndex: idx,
        phase: 'bidding',
        currentBid: p.basePrice,
        leaderId: null,
        status: '',
        feed: [],
        justBought: null,
        secretBid: false,
        simMin: sim,
        history: [...state.history, { id: state.history.length, t: sim, text: `${p.name} introduced`, kind: 'intro' }],
      }
    }

    case 'BIDDING':
      return state.phase === 'walkin' ? { ...state, phase: 'bidding' } : state

    case 'BID': {
      if (state.phase !== 'bidding' || state.paused || state.secretBid) return state
      if (action.teamId === state.leaderId) return state
      const hasBid = state.leaderId !== null
      const p = players[state.lotIndex]
      const amount = hasBid ? state.currentBid + bidIncrement(state.currentBid, bidRules) : p.basePrice
      const rem = teamById[action.teamId].budget - (state.teams[action.teamId]?.spent ?? 0)
      if (rem < amount) return state
      const seq = state.bidSeq + 1
      const sim = state.simMin + 1
      const feed = [{ id: seq, team: action.teamId, amount }, ...state.feed].slice(0, 6)
      const hitsThreshold = secretBidThreshold > 0 && amount >= secretBidThreshold
      return {
        ...state,
        currentBid: amount,
        leaderId: action.teamId,
        status: '',
        feed,
        bidSeq: seq,
        simMin: sim,
        secretBid: hitsThreshold,
        history: [...state.history, {
          id: state.history.length,
          t: sim,
          text: `${teamById[action.teamId].short} bid ${rupees(amount, currencySymbol)}${hitsThreshold ? ' — SECRET BID triggered' : ''}`,
          kind: 'bid',
          team: action.teamId,
        }],
      }
    }

    case 'ENTER_SECRET_BID':
      if (state.phase !== 'bidding') return state
      return { ...state, secretBid: true, history: pushHist(state, 'SECRET BID round started', 'status') }

    case 'EXIT_SECRET_BID':
      return { ...state, secretBid: false, history: pushHist(state, 'Returned to open bidding', 'status') }

    case 'SECRET_BID_SOLD': {
      if (state.phase !== 'bidding') return state
      const p = players[state.lotIndex]
      const { teamId: tid, price } = action
      const prevTeam = state.teams[tid] ?? { spent: 0, players: [] }
      return {
        ...state,
        phase: 'sold',
        currentBid: price,
        leaderId: tid,
        secretBid: false,
        status: '',
        justBought: tid,
        teams: {
          ...state.teams,
          [tid]: { spent: prevTeam.spent + price, players: [...prevTeam.players, p.id] },
        },
        results: [...state.results, { playerId: p.id, soldTo: tid, price }],
        history: pushHist(state, `SECRET BID — SOLD to ${teamById[tid]?.short ?? tid} · ${rupees(price, currencySymbol)}`, 'sold', tid),
      }
    }

    case 'STATUS': {
      if (state.leaderId == null || state.phase !== 'bidding') return state
      const labels: Record<string, string> = { once: 'Going once', twice: 'Going twice', final: 'Final call' }
      return { ...state, status: action.value, history: pushHist(state, labels[action.value], 'status') }
    }

    case 'AUTOBID': {
      if (state.phase !== 'bidding' || state.paused) return state
      const hasBid = state.leaderId !== null
      const amount = hasBid ? state.currentBid + bidIncrement(state.currentBid, bidRules) : players[state.lotIndex].basePrice
      const cands = teams.filter((t) => t.id !== state.leaderId && teamById[t.id].budget - state.teams[t.id].spent >= amount)
      if (!cands.length) return state
      return reducer(state, { type: 'BID', teamId: cands[state.bidSeq % cands.length].id }, players, teams, bidRules)
    }

    case 'CLEAR_STATUS':
      return { ...state, status: '' }

    case 'SOLD': {
      if (state.leaderId == null) return state
      const p = players[state.lotIndex]
      const price = state.currentBid
      const tid = state.leaderId
      const prevTeam = state.teams[tid]
      const teams_: typeof state.teams = {
        ...state.teams,
        [tid]: { spent: prevTeam.spent + price, players: [...prevTeam.players, p.id] },
      }
      return {
        ...state,
        phase: 'sold',
        teams: teams_,
        justBought: tid,
        status: '',
        results: [...state.results, { playerId: p.id, soldTo: tid, price }],
        history: pushHist(state, `SOLD to ${teamById[tid].short} · ${rupees(price, currencySymbol)}`, 'sold', tid),
      }
    }

    case 'UNSOLD': {
      if (state.phase !== 'bidding' && state.phase !== 'walkin') return state
      const p = players[state.lotIndex]
      return {
        ...state,
        phase: 'unsold',
        status: '',
        results: [...state.results, { playerId: p.id, unsold: true }],
        history: pushHist(state, `${p.name} unsold`, 'unsold'),
      }
    }

    case 'IDLE':
      return { ...state, phase: 'idle', status: '', justBought: null }

    case 'SUMMARY':
      return { ...state, phase: 'summary' }

    case 'CLOSE_SUMMARY':
      return { ...state, phase: 'idle' }

    case 'PAUSE':
      return { ...state, paused: !state.paused }

    case 'REVERT_BID': {
      if (state.phase !== 'bidding' || state.feed.length === 0) return state
      const remaining = state.feed.slice(1)
      const prev = remaining[0] ?? null
      const p = players[state.lotIndex]
      return {
        ...state,
        currentBid: prev ? prev.amount : p.basePrice,
        leaderId: prev ? prev.team : null,
        status: '',
        feed: remaining,
        bidSeq: state.bidSeq - 1,
        history: pushHist(state, 'BID REVERTED', 'status'),
      }
    }

    case 'START_CAPTAIN_AUCTION':
      return {
        ...state,
        auctionMode: 'captain',
        lotOrder: action.lotOrder ?? [],
        phase: 'idle',
        results: [],
        captainResults: [],
        phaseResults: [],
        auctionPhase: 1,
        lotIndex: 0,
        leaderId: null,
        currentBid: 0,
        status: '',
        feed: [],
        justBought: null,
        history: [...state.history, { id: state.history.length, t: state.simMin, text: 'Captain Auction started', kind: 'status' as const }],
      }

    case 'START_PLAYER_AUCTION':
      return {
        ...state,
        auctionMode: 'player',
        lotOrder: action.lotOrder ?? [],
        captainResults: state.results,
        phase: 'idle',
        results: [],
        phaseResults: [],
        auctionPhase: 1,
        lotIndex: 0,
        leaderId: null,
        currentBid: 0,
        status: '',
        feed: [],
        justBought: null,
        history: [...state.history, { id: state.history.length, t: state.simMin, text: 'Player Auction started', kind: 'status' as const }],
      }

    case 'START_NEXT_PHASE': {
      const nextPhase = state.auctionPhase + 1
      return {
        ...state,
        auctionPhase: nextPhase,
        phaseResults: [...state.phaseResults, state.results],
        phase: 'idle',
        results: [],
        lotIndex: 0,
        leaderId: null,
        currentBid: 0,
        status: '',
        feed: [],
        justBought: null,
        history: [...state.history, { id: state.history.length, t: state.simMin, text: `Phase ${nextPhase} started`, kind: 'status' as const }],
      }
    }

    case 'RESET':
      return initState(teams, players)

    case 'REVERT': {
      if (state.results.length === 0) return state
      const last = state.results[state.results.length - 1]
      const newResults = state.results.slice(0, -1)
      const revertIdx = newResults.length  // players are auctioned in order
      const p = players[revertIdx]
      if (!p) return state

      // Restore the team's budget/roster if it was a sale
      const newTeams = { ...state.teams }
      if (last.soldTo && last.price != null) {
        const ts = newTeams[last.soldTo]
        if (ts) {
          newTeams[last.soldTo] = {
            spent: Math.max(0, ts.spent - last.price),
            players: ts.players.filter((id) => id !== last.playerId),
          }
        }
      }

      return {
        ...state,
        phase: 'bidding',
        lotIndex: revertIdx,
        currentBid: p.basePrice,
        leaderId: null,
        status: '',
        feed: [],
        justBought: null,
        paused: false,
        teams: newTeams,
        results: newResults,
        history: pushHist(state, `REVERTED — ${p.name} back to auction`, 'status'),
      }
    }

    default:
      return state
  }
}
