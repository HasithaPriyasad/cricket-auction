'use client'
import type { PlayerData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import s from './overlays.module.css'

interface TeamInfo { id: string; name: string; abbreviation: string; color: string }

interface SoldOverlayProps {
  player: PlayerData
  team: TeamInfo
  price: number
  currencySymbol: string
}

export function SoldOverlay({ player, team, price, currencySymbol }: SoldOverlayProps) {
  return (
    <div className={`${s.overlay} ${s.sold}`} style={{ '--tc': team.color } as React.CSSProperties}>
      <div className={s.soldFlood} />
      <div className={s.soldRays} />
      <div className={s.soldInner}>
        <div className={s.soldBanner}>SOLD</div>
        <div className={s.soldPlayer}>{player.name}</div>
        <div className={s.soldTo}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: team.color, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff',
            }}
          >
            {team.abbreviation}
          </div>
          <div className={s.soldToTxt}>
            <span className={s.soldToLbl}>SOLD TO</span>
            <span className={s.soldToName}>{team.name}</span>
          </div>
        </div>
        <div className={s.soldPrice}>{rupees(price, currencySymbol)}</div>
      </div>
    </div>
  )
}
