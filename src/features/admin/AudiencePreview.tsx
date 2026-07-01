'use client'
import { type RefObject } from 'react'
import type { DisplayView } from '@/features/display/TopBar'
import s from './admin.module.css'

interface AudiencePreviewProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
  previewSrc: string
  view: DisplayView
  displayWindows: number
  captainAuctionDone?: boolean
  onSetView: (v: DisplayView) => void
  onOpenDisplay: () => void
  onToggleFullscreen: () => void
}

const VIEWS: [DisplayView, string][] = [
  ['live', 'Live'],
  ['players', 'Players'],
  ['teams', 'Teams'],
  ['summary', 'Summary'],
]

export function AudiencePreview({
  iframeRef, previewSrc, view, displayWindows, captainAuctionDone, onSetView, onOpenDisplay, onToggleFullscreen,
}: AudiencePreviewProps) {
  return (
    <div className={s.crPreview}>
      <div className={s.crPreviewBar}>
        <span className={s.crPreviewLive}>
          <span className={s.crPreviewLiveDot} />
          Audience Display — live
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={s.crPreviewPop}
            onClick={onToggleFullscreen}
            disabled={displayWindows === 0}
            title={displayWindows === 0 ? 'Pop out the display first' : 'Toggle fullscreen on display'}
          >
            ⛶ Fullscreen
          </button>
          <button className={s.crPreviewPop} onClick={onOpenDisplay}>
            Pop out ↗
          </button>
        </div>
      </div>
      <div className={s.crPreviewFrame}>
        <iframe ref={iframeRef} src={previewSrc} title="Audience display preview" />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--cr-brd)' }}>
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            className={`${s.crSeg} ${view === id ? s.crSegOn : ''}`}
            onClick={() => onSetView(id)}
          >
            {label}
          </button>
        ))}
        {captainAuctionDone && (
          <button
            className={`${s.crSeg} ${view === 'captain-results' ? s.crSegOn : ''}`}
            onClick={() => onSetView(view === 'captain-results' ? 'live' : 'captain-results')}
          >
            Cpt Results
          </button>
        )}
      </div>
    </div>
  )
}
