'use client'
import { useState } from 'react'
import { PRESETS, ACCENTS, DISPLAY_FONTS, type PresetKey, type CelebrationKey } from '@/lib/presets'
import type { TweakState } from '@/features/auction/types'
import s from './admin.module.css'

type ActionStatus = 'idle' | 'ok' | 'err'

interface TweaksPanelProps {
  tweaks: TweakState
  onTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void
  onSave: () => void
  onReset: (onDone: (ok: boolean) => void) => void
  onClearConfig: (onDone: (ok: boolean) => void) => void
}

const PRESET_OPTIONS: { value: PresetKey; label: string }[] = [
  { value: 'stadium', label: 'Stadium Night' },
  { value: 'neon', label: 'Neon Arena' },
  { value: 'bright', label: 'Broadcast Bright' },
  { value: 'mono', label: 'Mono Premium' },
]

const CELEBRATION_OPTIONS: CelebrationKey[] = ['subtle', 'standard', 'max']

export function TweaksPanel({ tweaks, onTweak, onSave, onReset, onClearConfig }: TweaksPanelProps) {
  const [open, setOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [resetStatus, setResetStatus] = useState<ActionStatus>('idle')
  const [configStatus, setConfigStatus] = useState<ActionStatus>('idle')

  function handleSave() {
    onSave()
    setSavedAt(Date.now())
  }

  function handleReset() {
    onReset((ok) => {
      setResetStatus(ok ? 'ok' : 'err')
      setTimeout(() => setResetStatus('idle'), 3000)
    })
  }

  function handleClearConfig() {
    onClearConfig((ok) => {
      setConfigStatus(ok ? 'ok' : 'err')
      setTimeout(() => setConfigStatus('idle'), 3000)
    })
  }

  return (
    <div className={`${s.tweaksPanel} ${open ? s.tweaksPanelOpen : ''}`}>
      <button className={s.tweaksHandle} onClick={() => setOpen((o) => !o)} title="Tweaks">
        {open ? '›' : '‹'}
      </button>

      <div className={s.tweaksTitle}>Display Tweaks</div>

      <div className={s.tweaksBody}>
        <div className={s.tweakSection}>Visual Style</div>

        <div className={s.tweakRow}>
          <label className={s.tweakLabel}>Theme Preset</label>
          <select
            className={s.tweakSelect}
            value={tweaks.style}
            onChange={(e) => onTweak('style', e.target.value as PresetKey)}
          >
            {PRESET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={s.tweakRow}>
          <label className={s.tweakLabel}>Accent Color</label>
          <div className={s.tweakColors}>
            {ACCENTS.map((color) => (
              <button
                key={color}
                className={`${s.tweakColorSwatch} ${tweaks.accent === color ? s.tweakColorSwatchActive : ''}`}
                style={{ background: color }}
                onClick={() => onTweak('accent', color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className={s.tweakRow}>
          <div className={s.tweakToggleRow}>
            <label className={s.tweakLabel}>Team-color theming</label>
            <button
              className={`${s.tweakToggle} ${tweaks.teamTheming ? s.tweakToggleOn : ''}`}
              onClick={() => onTweak('teamTheming', !tweaks.teamTheming)}
            />
          </div>
        </div>

        <div className={s.tweakRow}>
          <div className={s.tweakToggleRow}>
            <label className={s.tweakLabel}>Stadium spotlight</label>
            <button
              className={`${s.tweakToggle} ${tweaks.spotlight ? s.tweakToggleOn : ''}`}
              onClick={() => onTweak('spotlight', !tweaks.spotlight)}
            />
          </div>
        </div>

        <div className={s.tweakSection}>Typography</div>

        <div className={s.tweakRow}>
          <label className={s.tweakLabel}>Display Font</label>
          <div className={s.tweakRadioGroup}>
            {DISPLAY_FONTS.map((f) => (
              <button
                key={f.value}
                className={`${s.tweakRadioBtn} ${tweaks.displayFont === f.value ? s.tweakRadioBtnActive : ''}`}
                onClick={() => onTweak('displayFont', f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.tweakSection}>Audience Screen</div>

        <div className={s.tweakRow}>
          <div className={s.tweakToggleRow}>
            <label className={s.tweakLabel}>Live bid feed</label>
            <button
              className={`${s.tweakToggle} ${tweaks.showFeed ? s.tweakToggleOn : ''}`}
              onClick={() => onTweak('showFeed', !tweaks.showFeed)}
            />
          </div>
        </div>

        <div className={s.tweakRow}>
          <label className={s.tweakLabel}>Auto-advance after sold / unsold</label>
          <div className={s.tweakRadioGroup}>
            {([0, 5, 10, 15, 30] as const).map((sec) => (
              <button
                key={sec}
                className={`${s.tweakRadioBtn} ${tweaks.autoAdvanceDelay === sec ? s.tweakRadioBtnActive : ''}`}
                onClick={() => onTweak('autoAdvanceDelay', sec)}
              >
                {sec === 0 ? 'Off' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>

        <div className={s.tweakSection}>Celebration</div>

        <div className={s.tweakRow}>
          <label className={s.tweakLabel}>Intensity</label>
          <div className={s.tweakRadioGroup}>
            {CELEBRATION_OPTIONS.map((c) => (
              <button
                key={c}
                className={`${s.tweakRadioBtn} ${tweaks.celebration === c ? s.tweakRadioBtnActive : ''}`}
                onClick={() => onTweak('celebration', c)}
                style={{ textTransform: 'capitalize' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className={s.tweakSection}>Danger Zone</div>

        <button className={s.tweakBtn} onClick={handleReset}>
          Reset Auction
        </button>
        {resetStatus !== 'idle' && (
          <div className={`${s.tweakActionMsg} ${resetStatus === 'ok' ? s.tweakActionMsgOk : s.tweakActionMsgErr}`}>
            {resetStatus === 'ok' ? '✓ Auction reset successfully' : '✕ Reset failed — try again'}
          </div>
        )}
        <button className={s.tweakBtnDanger} onClick={handleClearConfig}>
          Clear Config
        </button>
        {configStatus !== 'idle' && (
          <div className={`${s.tweakActionMsg} ${configStatus === 'ok' ? s.tweakActionMsgOk : s.tweakActionMsgErr}`}>
            {configStatus === 'ok' ? '✓ Config cleared successfully' : '✕ Clear failed — try again'}
          </div>
        )}

        <div className={s.tweakSaveRow}>
          {savedAt && <span className={s.tweakSavedBadge}>✓ Saved</span>}
          <button className={s.tweakSaveBtn} onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
