import { bidIncrement } from '@/lib/bidIncrement'
import type { AuctionState } from './types'
import type { PlayerData, TeamData } from './reducer'

export function currentPlayer(state: AuctionState, players: PlayerData[]): PlayerData | null {
  return players[state.lotIndex] ?? null
}

export function teamRemaining(state: AuctionState, teamId: string, budget: number): number {
  return budget - (state.teams[teamId]?.spent ?? 0)
}

export function nextBidAmount(state: AuctionState): number {
  if (state.leaderId == null) return state.currentBid
  return state.currentBid + bidIncrement(state.currentBid)
}

export function canTeamBid(state: AuctionState, teamId: string, budget: number): boolean {
  if (state.phase !== 'bidding' || state.paused) return false
  if (teamId === state.leaderId) return false
  return teamRemaining(state, teamId, budget) >= nextBidAmount(state)
}

export function feedEntries(state: AuctionState) {
  return state.feed
}

export function recentHistory(state: AuctionState, count = 12) {
  return [...state.history].reverse().slice(0, count)
}

export function teamPurses(state: AuctionState, teams: TeamData[]) {
  return teams.map((t) => ({
    team: t,
    spent: state.teams[t.id]?.spent ?? 0,
    remaining: teamRemaining(state, t.id, t.budget),
    playerCount: state.teams[t.id]?.players.length ?? 0,
    isLeader: state.leaderId === t.id,
    justBought: state.justBought === t.id,
  }))
}

export function auctionProgress(state: AuctionState, totalPlayers: number) {
  return {
    completed: state.results.length,
    total: totalPlayers,
    pct: totalPlayers > 0 ? Math.round((state.results.length / totalPlayers) * 100) : 0,
    sold: state.results.filter((r) => !r.unsold).length,
    unsold: state.results.filter((r) => r.unsold).length,
  }
}
