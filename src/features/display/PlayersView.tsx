'use client'
import type { LotResult } from '@/features/auction/types'
import type { PlayerData } from '@/features/auction/reducer'
import { compactINR } from '@/lib/formatters'
import s from './views.module.css'

interface TeamInfo { id: string; short: string; color: string }

interface PlayersViewProps {
  players: PlayerData[]
  results: LotResult[]
  teamsById: Record<string, TeamInfo>
  currentId: number | null
  animOn: boolean
  currencySymbol: string
  captainAuction?: boolean
}

export function PlayersView({ players, results, teamsById, currentId, animOn, currencySymbol, captainAuction = true }: PlayersViewProps) {
  const resultByPlayer = Object.fromEntries(results.map((r) => [r.playerId, r]))
  const sold = results.filter((r) => !r.unsold).length
  const unsold = results.filter((r) => r.unsold).length

  // Captains shown first (only when captain auction is enabled)
  const sorted = captainAuction
    ? [
        ...players.filter((p) => (p as any).category === 'captain'),
        ...players.filter((p) => (p as any).category !== 'captain'),
      ]
    : players

  return (
    <div className={`${s.view} ${animOn ? s.viewAnim : ''}`}>
      <div className={s.viewHead}>
        <div>
          <div className={s.viewKicker}>AUCTION ROSTER</div>
          <div className={s.viewTitle}>Player Pool</div>
        </div>
        <div className={s.viewCounts}>
          <div className={s.vc}>
            <b className={`${s.vcNum} ${s.vcNumSold}`}>{sold}</b>
            <span className={s.vcLabel}>Sold</span>
          </div>
          <div className={s.vc}>
            <b className={`${s.vcNum} ${s.vcNumUnsold}`}>{unsold}</b>
            <span className={s.vcLabel}>Unsold</span>
          </div>
          <div className={s.vc}>
            <b className={s.vcNum}>{players.filter((p) => !resultByPlayer[p.id]).length}</b>
            <span className={s.vcLabel}>Remaining</span>
          </div>
        </div>
      </div>

      <div className={s.playersGrid}>
        {sorted.map((p, idx) => {
          const result = resultByPlayer[p.id]
          const isLive = p.id === currentId
          const isSold = result && !result.unsold
          const isUnsold = result?.unsold
          const isCaptain = captainAuction && (p as any).category === 'captain'

          return (
            <div
              key={p.id}
              className={`${s.prow} ${isLive ? s.prowLive : ''} ${isUnsold ? s.prowUnsold : ''}`}
            >
              <span className={s.prowNum}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={s.prowJersey}>#{p.jerseyNum}</span>
              <div className={s.prowId}>
                <div className={s.prowName}>
                  {isCaptain && <em className={s.prowCaptainBadge}>C</em>}
                  {p.name}
                  {p.tag === 'MARQUEE' && <em className={s.prowStar}>★</em>}
                </div>
                <div className={s.prowSub}>{p.role} · {p.country} · {p.gender === 'male' ? 'M' : 'F'}</div>
              </div>
              {isLive && <div className={s.pstLive}>LIVE</div>}
              {isSold && result.soldTo && (
                <div
                  className={`${s.pst} ${s.pstSold}`}
                  style={{ '--tc': teamsById[result.soldTo]?.color } as React.CSSProperties}
                >
                  <span className={s.pstSoldTeam}>{teamsById[result.soldTo]?.short}</span>
                  <span className={s.pstSoldPrice}>{compactINR(result.price ?? 0, currencySymbol)}</span>
                </div>
              )}
              {isUnsold && <div className={`${s.pst} ${s.pstUnsold}`}>UNSOLD</div>}
              {!result && !isLive && <div className={`${s.pst} ${s.pstPending}`}>UPCOMING</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
