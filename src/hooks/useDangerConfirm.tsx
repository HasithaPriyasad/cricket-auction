'use client'
import { useState, useRef, useCallback } from 'react'

const DANGER_CODE = process.env.NEXT_PUBLIC_DANGER_CODE ?? ''

interface ModalState {
  label: string
  onConfirm: () => void
}

export function useDangerConfirm() {
  const [modal, setModal] = useState<ModalState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState(false)

  const confirm = useCallback((label: string, action: () => void) => {
    setInputVal('')
    setError(false)
    setModal({ label, onConfirm: action })
    // Focus the input on next paint
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSubmit = () => {
    if (!DANGER_CODE || inputVal === DANGER_CODE) {
      modal?.onConfirm()
      setModal(null)
    } else {
      setError(true)
      setInputVal('')
      inputRef.current?.focus()
    }
  }

  const handleClose = () => {
    setModal(null)
    setInputVal('')
    setError(false)
  }

  const ConfirmModal = modal ? (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={dialog}>
        <div style={dlgTitle}>Confirm: {modal.label}</div>
        <div style={dlgBody}>
          Type the danger code to proceed. This action cannot be undone.
        </div>
        <input
          ref={inputRef}
          style={{ ...dlgInput, ...(error ? dlgInputErr : {}) }}
          type="text"
          placeholder={DANGER_CODE ? 'Enter danger code' : 'Press Confirm to proceed'}
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setError(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleClose() }}
          autoComplete="off"
        />
        {error && <div style={dlgError}>Incorrect code — try again.</div>}
        <div style={dlgActions}>
          <button style={dlgBtnCancel} onClick={handleClose}>Cancel</button>
          <button style={dlgBtnConfirm} onClick={handleSubmit}>Confirm</button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmModal }
}

// ── Inline styles (no CSS module dependency) ─────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const dialog: React.CSSProperties = {
  background: '#1a1e28', border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 14, padding: '28px 32px', width: 380, maxWidth: 'calc(100vw - 40px)',
  display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 64px rgba(0,0,0,.6)',
}

const dlgTitle: React.CSSProperties = {
  fontWeight: 800, fontSize: 18, color: '#f3f7ff',
}

const dlgBody: React.CSSProperties = {
  fontSize: 14, color: 'rgba(206,219,247,.6)', lineHeight: 1.5,
}

const dlgInput: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit',
  border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.06)',
  color: '#f3f7ff', outline: 'none', width: '100%', boxSizing: 'border-box',
  letterSpacing: '.06em',
}

const dlgInputErr: React.CSSProperties = {
  borderColor: '#e6362f', background: 'rgba(230,54,47,.08)',
}

const dlgError: React.CSSProperties = {
  fontSize: 13, color: '#e6362f', fontWeight: 600,
}

const dlgActions: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4,
}

const dlgBtnCancel: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)',
  background: 'transparent', color: 'rgba(206,219,247,.8)', cursor: 'pointer',
  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
}

const dlgBtnConfirm: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 8, border: 'none',
  background: '#e6362f', color: '#fff', cursor: 'pointer',
  fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
}
