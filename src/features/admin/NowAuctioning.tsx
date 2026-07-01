'use client'
import type { AuctionState } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import { useAuctionStore } from '@/features/auction/store'
import s from './admin.module.css'

interface NowAuctioningProps {
  state: AuctionState
  players: PlayerData[]   // already filtered to current lot list
  teams: TeamData[]
}

const STATUS_CLASS: Record<string, string> = {
  once: s.crStatusOnce,
  twice: s.crStatusTwice,
  final: s.crStatusFinal,
}
const STATUS_LABEL: Record<string, string> = { once: 'Going Once', twice: 'Going Twice', final: 'Final Call' }

export function NowAuctioning({ state, players, teams }: NowAuctioningProps) {
  const currencySymbol = useAuctionStore((st) => st.tweaks.currencySymbol)
  const player = players[state.lotIndex]
  const showPlayer = ['walkin', 'bidding', 'sold', 'unsold'].includes(state.phase)
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))
  const leader = state.leaderId ? teamById[state.leaderId] : null
  const hasBid = state.leaderId !== null
  const nextPlayer = players[state.results.length]

  return (
    <div className={s.crNow}>
      <div>
        <div className={s.crNowKey}>
          {showPlayer
            ? (state.auctionMode === 'captain' ? 'Captain Auction' : 'Player Auction')
            : state.phase === 'summary' ? 'Auction Complete' : 'Stage Clear'}
        </div>
        {showPlayer && player ? (
          <>
            <div className={s.crNowName}>
              {player.name}
              {player.tag === 'MARQUEE' && <i className={s.crStar}>★</i>}
            </div>
            <div className={s.crNowMeta}>
              {player.role} · {player.country} · #{player.jerseyNum} · Base {rupees(player.basePrice, currencySymbol)}
            </div>
          </>
        ) : (
          <>
            <div className={`${s.crNowName} ${s.crNowDim}`}>
              {state.results.length >= players.length
                ? 'All lots complete'
                : nextPlayer
                  ? `Up next: ${nextPlayer.name}`
                  : '—'}
            </div>
            <div className={s.crNowMeta}>
              Press <b className={s.crKbd}>N</b> to bring in the next player
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <div className={s.crBidK}>
          {hasBid ? 'Current Bid' : showPlayer ? 'Opening At' : 'Current Bid'}
        </div>
        <div className={s.crBidV}>
          {showPlayer || hasBid ? rupees(state.currentBid, currencySymbol) : '—'}
        </div>
        <div
          className={s.crBidLead}
          style={leader ? ({ '--tc': leader.color } as React.CSSProperties) : {}}
        >
          {leader ? (
            <>
              <span className={s.crLeadDot} />
              Leading: <b>{leader.name}</b>
            </>
          ) : (
            <span style={{ color: 'var(--cr-dim)' }}>No bids yet</span>
          )}
          {state.status && (
            <span className={`${s.crStatusChip} ${STATUS_CLASS[state.status] ?? ''}`}>
              {STATUS_LABEL[state.status]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
