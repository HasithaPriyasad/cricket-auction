'use client'
import type { AuctionState } from '@/features/auction/types'
import s from './admin.module.css'

interface AuctioneerActionsProps {
  state: AuctionState
  lotPlayersCount: number
  captainsCount: number
  teamsCount: number
  captainAuction: boolean
  onStatus: (v: 'once' | 'twice' | 'final') => void
  onSold: () => void
  onUnsold: () => void
  onNext: () => void
  onPause: () => void
  onRevert: () => void
  onRevertBid: () => void
  onStartCaptainAuction: () => void
  onStartPlayerAuction: () => void
  onEnterSecretBid: () => void
}

export function AuctioneerActions({
  state, lotPlayersCount, captainsCount, teamsCount, captainAuction,
  onStatus, onSold, onUnsold, onNext, onPause, onRevert, onRevertBid,
  onStartCaptainAuction, onStartPlayerAuction, onEnterSecretBid,
}: AuctioneerActionsProps) {
  const canAct = state.phase === 'bidding' && !!state.leaderId
  const canUnsold = state.phase === 'bidding'
  const canRevert = state.results.length > 0
  const canRevertBid = state.phase === 'bidding' && state.feed.length > 0
  const allLotsComplete = lotPlayersCount > 0 && state.results.length >= lotPlayersCount

  const isCaptainMode = state.auctionMode === 'captain'
  // Captain auction is definitively done once player auction has started OR results were saved
  const captainsDone = state.auctionMode === 'player' || state.captainResults.length > 0

  return (
    <>
      {/* Start captain auction — hidden once captain auction is done, or when feature is disabled */}
      {captainAuction && !isCaptainMode && !captainsDone && captainsCount > 0 && (
        <>
          <div className={s.crSectionKey}>Captain Auction</div>
          <div className={s.crActions}>
            <button className={`${s.crAct} ${s.crActGo}`} onClick={onStartCaptainAuction}>
              Start Captain Auction ({captainsCount} captain{captainsCount !== 1 ? 's' : ''})
            </button>
          </div>
        </>
      )}

      {/* Normal bidding controls */}
      <div className={s.crSectionKey}>
        {isCaptainMode ? 'Captain Auction — Auctioneer Calls' : 'Auctioneer Calls'}
      </div>
      <div className={s.crActions}>
        <button className={s.crAct} disabled={!canAct} onClick={() => onStatus('once')}>
          <span className={s.crKbd}>1</span> Going Once
        </button>
        <button className={s.crAct} disabled={!canAct} onClick={() => onStatus('twice')}>
          <span className={s.crKbd}>2</span> Going Twice
        </button>
        <button className={s.crAct} disabled={!canAct} onClick={() => onStatus('final')}>
          <span className={s.crKbd}>3</span> Final Call
        </button>
        <button className={`${s.crAct} ${s.crActSold}`} disabled={!canAct} onClick={onSold}>
          <span className={s.crKbd}>S</span> Sold
        </button>
        <button className={`${s.crAct} ${s.crActDanger}`} disabled={!canUnsold} onClick={onUnsold}>
          <span className={s.crKbd}>U</span> Unsold
        </button>
        {allLotsComplete ? (
          <button className={`${s.crAct} ${s.crActGo}`} disabled>
            {isCaptainMode ? 'All Captains Auctioned' : 'Auction Complete'}
          </button>
        ) : (
          <button className={`${s.crAct} ${s.crActGo}`} onClick={onNext}>
            <span className={s.crKbd}>N</span> Next {isCaptainMode ? 'Captain' : 'Player'}
          </button>
        )}
        <button className={s.crAct} onClick={onPause}>
          <span className={s.crKbd}>␣</span> {state.paused ? 'Resume' : 'Pause'}
        </button>
        <button className={`${s.crAct} ${s.crActRevert}`} disabled={!canRevertBid} onClick={onRevertBid}
          title="Undo the last bid">
          ↩ Undo Bid
        </button>
        {!state.secretBid && state.phase === 'bidding' && (
          <button className={`${s.crAct} ${s.crActRevert}`} onClick={onEnterSecretBid}
            title="Switch to secret bid mode — teams submit bids privately">
            🔒 Secret Bid
          </button>
        )}
        <button className={`${s.crAct} ${s.crActRevert}`} disabled={!canRevert} onClick={onRevert}
          title="Undo the last sold/unsold result">
          ↩ Revert Result
        </button>
        {captainAuction && isCaptainMode && !allLotsComplete && (
          <button className={s.crAct} onClick={onStartPlayerAuction}
            title="End captain auction now and begin player auction — remaining captains enter the player pool">
            Skip to Player Auction →
          </button>
        )}
      </div>
    </>
  )
}
