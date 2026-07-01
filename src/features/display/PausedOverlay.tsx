'use client'
import s from './overlays.module.css'

export function PausedOverlay() {
  return (
    <div className={`${s.overlay} ${s.paused}`}>
      <div className={s.pausedInner}>
        <div className={s.pausedBars}>
          <i className={s.pausedBar} />
          <i className={s.pausedBar} />
        </div>
        PAUSED
      </div>
    </div>
  )
}
