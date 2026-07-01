'use client'
import { useRef } from 'react'
import type { BidStatus } from '@/features/auction/types'
import { formatBidDisplay } from '@/lib/formatters'
import s from './display.module.css'

interface TeamInfo {
  id: string
  short: string
  name: string
  color: string
  abbreviation: string
}

interface BidHeroProps {
  currentBid: number
  leader: TeamInfo | null
  status: BidStatus
  hasBid: boolean
  currencySymbol: string
  secretBid?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  once: 'GOING ONCE',
  twice: 'GOING TWICE',
  final: 'FINAL CALL',
}
const STATUS_CLASS: Record<string, string> = {
  once: s.statusOnce,
  twice: s.statusTwice,
  final: s.statusFinal,
}

export function BidHero({ currentBid, leader, status, hasBid, currencySymbol, secretBid }: BidHeroProps) {
  const prevBid = useRef(currentBid)
  const isNew = currentBid !== prevBid.current
  if (isNew) prevBid.current = currentBid

  const { sym, val, unit } = formatBidDisplay(currentBid, currencySymbol)

  return (
    <div className={s.bidHero}>
      <div className={s.bidKey}>{hasBid ? 'CURRENT BID' : 'STARTING PRICE'}</div>
      <div className={`${s.bidAmt} ${hasBid ? s.bidAmtLive : ''}`} key={currentBid}>
        <span className={s.bidAmtCur}>{sym}</span>
        {val}
        {unit && <span style={{ fontSize: 46, marginLeft: 8, color: 'var(--text-dim)', letterSpacing: 0 }}> {unit}</span>}
      </div>

      <div className={s.leader}>
        {leader ? (
          <>
            <div
              className={s.badge}
              style={{ '--tc': leader.color, width: 52, height: 52, fontSize: 16 } as React.CSSProperties}
            >
              {leader.abbreviation}
            </div>
            <div className={s.leaderTxt}>
              <span className={s.leaderLbl}>LEADING BID</span>
              <span className={s.leaderName}>{leader.name}</span>
            </div>
          </>
        ) : (
          <span className={`${s.leaderName} ${s.leaderNameMuted}`}>No bids yet — open for bidding</span>
        )}
      </div>

      {secretBid && (
        <div className={`${s.statusPill} ${s.statusSecret}`}>
          🔒 SECRET BID
        </div>
      )}
      {!secretBid && status && (
        <div className={`${s.statusPill} ${STATUS_CLASS[status] ?? ''}`} key={status}>
          {STATUS_LABELS[status]}
        </div>
      )}
    </div>
  )
}
