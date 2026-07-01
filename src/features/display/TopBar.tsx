'use client'
import { Clock } from '@/components/Clock'
import type { AuctionState } from '@/features/auction/types'
import type { PlayerData } from '@/features/auction/reducer'
import s from './display.module.css'

export type DisplayView = 'live' | 'players' | 'teams' | 'summary' | 'captain-results'

interface TopBarProps {
  state: AuctionState
  view: DisplayView
  conn: 'live' | 'reconnecting'
  players: PlayerData[]
  eventName: string
  eventYear: string
  logoUrl?: string
  onReconnect?: () => void
}

const viewLabels: Record<DisplayView, string> = {
  live: '',
  players: 'Player Pool',
  teams: 'Team Rosters',
  summary: 'Auction Summary',
  'captain-results': 'Captain Results',
}

export function TopBar({ state, view, conn, players, eventName, eventYear, logoUrl, onReconnect }: TopBarProps) {
  const showPlayer = ['walkin', 'bidding', 'sold', 'unsold'].includes(state.phase)
  const clamp = state.phase === 'idle' || state.phase === 'summary'
  const lotDisplay = clamp ? state.results.length : state.lotIndex + 1
  const player = players[state.lotIndex]

  return (
    <div className={s.topbar}>
      <div className={s.brand}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
        ) : (
          <div className={s.brandMark} />
        )}
        <div>
          <b className={s.brandName}>{eventName.toUpperCase()}</b>
          <span className={s.brandSub}>
            Season {eventYear} ·{' '}
            {state.auctionMode === 'captain' ? 'Captain Auction' : 'Player Auction'}
          </span>
        </div>
      </div>

      <div className={s.lotInfo}>
        {view === 'live' ? (
          <>
            <span className={s.lotNum}>
              LOT <b className={s.lotNumAccent}>{String(Math.min(lotDisplay, players.length)).padStart(2, '0')}</b> / {players.length}
            </span>
            {state.auctionMode && (
              <span className={`${s.viewTag} ${state.auctionMode === 'captain' ? s.viewTagCaptain : ''}`}>
                {state.auctionMode === 'captain' ? 'Captain Auction' : 'Player Auction'}
              </span>
            )}
            {state.auctionPhase > 1 && (
              <span className={`${s.viewTag} ${s.viewTagPhase}`}>
                Phase {state.auctionPhase}
              </span>
            )}
          </>
        ) : (
          <span className={s.viewTag}>{viewLabels[view]}</span>
        )}
        {view === 'live' && showPlayer && player && (
          <span className={s.lotCat}>{player.role}</span>
        )}
      </div>

      <div className={s.topRight}>
        <Clock className={s.clock} />
        <div
          className={`${s.conn} ${conn === 'reconnecting' ? s.connReconnecting : ''}`}
          onClick={onReconnect}
          title="Connection status"
        >
          <span className={s.connDot} />
          {conn === 'reconnecting' ? 'Reconnecting…' : 'Connected'}
        </div>
        <div className={s.live}>
          <span className={s.liveDot} />
          {view === 'live' ? 'LIVE' : 'STANDINGS'}
        </div>
      </div>
    </div>
  )
}
