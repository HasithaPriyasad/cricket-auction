'use client'
import type { PlayerData } from '@/features/auction/reducer'
import s from './overlays.module.css'

interface UnsoldOverlayProps {
  player: PlayerData
}

export function UnsoldOverlay({ player }: UnsoldOverlayProps) {
  return (
    <div className={`${s.overlay} ${s.unsold}`}>
      <div className={s.unsoldStamp}>UNSOLD</div>
      <div className={s.unsoldPlayer}>{player.name}</div>
      <div className={s.unsoldSub}>{player.role} · {player.country} · {player.gender === 'male' ? 'M' : 'F'}</div>
    </div>
  )
}
