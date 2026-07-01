'use client'
import { useState, useCallback } from 'react'

interface ModalState {
  title: string
  body: string
  onConfirm: () => void
}

export function useConfirm() {
  const [modal, setModal] = useState<ModalState | null>(null)

  const confirm = useCallback((title: string, body: string, action: () => void) => {
    setModal({ title, body, onConfirm: action })
  }, [])

  const handleConfirm = () => { modal?.onConfirm(); setModal(null) }
  const handleClose = () => setModal(null)

  const ConfirmModal = modal ? (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={dialog}>
        <div style={dlgTitle}>{modal.title}</div>
        <div style={dlgBody}>{modal.body}</div>
        <div style={dlgActions}>
          <button style={dlgBtnCancel} onClick={handleClose}>Cancel</button>
          <button style={dlgBtnConfirm} onClick={handleConfirm}>Delete</button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, ConfirmModal }
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const dialog: React.CSSProperties = {
  background: '#1a1e28', border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 14, padding: '28px 32px', width: 360, maxWidth: 'calc(100vw - 40px)',
  display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 64px rgba(0,0,0,.6)',
}
const dlgTitle: React.CSSProperties = { fontWeight: 800, fontSize: 18, color: '#f3f7ff' }
const dlgBody: React.CSSProperties = { fontSize: 14, color: 'rgba(206,219,247,.6)', lineHeight: 1.5 }
const dlgActions: React.CSSProperties = { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }
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
