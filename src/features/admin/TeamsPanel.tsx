'use client'
import { useState } from 'react'
import type { TeamData } from '@/features/auction/reducer'
import { compactINR } from '@/lib/formatters'
import s from './admin.module.css'

interface TeamsPanelProps {
  teams: TeamData[]
  onRefresh: () => void
}

const EMPTY: Omit<TeamData, 'id'> = {
  name: '', short: '', abbreviation: '', color: '#f3b327', budget: 18000000,
}

export function TeamsPanel({ teams, onRefresh }: TeamsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<TeamData, 'id'>>(EMPTY)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  function selectTeam(team: TeamData) {
    setSelectedId(team.id)
    setIsNew(false)
    setForm({ name: team.name, short: team.short, abbreviation: team.abbreviation, color: team.color, budget: team.budget })
    setStatus('idle')
  }

  function startNew() {
    setSelectedId(null)
    setIsNew(true)
    setForm(EMPTY)
    setStatus('idle')
  }

  function field(key: keyof typeof form) {
    return {
      value: String(form[key]),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: key === 'budget' ? Number(e.target.value) : e.target.value })),
    }
  }

  async function save() {
    setSaving(true); setStatus('idle')
    try {
      const url = isNew ? '/api/teams' : `/api/teams/${selectedId}`
      const method = isNew ? 'POST' : 'PATCH'
      const body = isNew ? { id: form.short.toLowerCase().replace(/\s+/g, '-'), ...form } : form
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('saved')
      setIsNew(false)
      onRefresh()
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!selectedId || !confirm('Delete this team?')) return
    setSaving(true)
    try {
      await fetch(`/api/teams/${selectedId}`, { method: 'DELETE' })
      setSelectedId(null); setIsNew(false); setForm(EMPTY)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const showForm = selectedId !== null || isNew

  return (
    <div className={s.crudPanel}>
      <div className={s.crudList}>
        <div className={s.crudListHeader}>
          <span className={s.crudListTitle}>Teams ({teams.length})</span>
          <button className={s.crudAddBtn} onClick={startNew}>+ Add Team</button>
        </div>
        <div className={s.crudListScroll}>
          {teams.map((t) => (
            <div
              key={t.id}
              className={`${s.crudItem} ${selectedId === t.id ? s.crudItemActive : ''}`}
              onClick={() => selectTeam(t)}
            >
              <div className={s.crudItemColor} style={{ background: t.color }} />
              <div className={s.crudItemBody}>
                <div className={s.crudItemName}>{t.name}</div>
                <div className={s.crudItemSub}>{t.abbreviation} · Budget {compactINR(t.budget)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.crudForm}>
        {!showForm ? (
          <div className={s.crudFormEmpty}>Select a team to edit, or add a new one</div>
        ) : (
          <div className={s.crudFormInner}>
            <div className={s.crudFormTitle}>{isNew ? 'New Team' : form.name || 'Edit Team'}</div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Full Name</label>
              <input className={s.fieldInput} placeholder="Colombo Lions" {...field('name')} />
            </div>

            <div className={s.fieldRow}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Short Name</label>
                <input className={s.fieldInput} placeholder="LIONS" maxLength={12} {...field('short')} />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Abbreviation</label>
                <input className={s.fieldInput} placeholder="CL" maxLength={4} {...field('abbreviation')} />
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Team Color</label>
              <div className={s.fieldColorRow}>
                <div className={s.fieldColorPreview} style={{ background: form.color }} />
                <input className={`${s.fieldInput} ${s.fieldColorInput}`} type="color" {...field('color')} />
                <input className={`${s.fieldInput}`} style={{ flex: 1 }} placeholder="#f0a500" maxLength={7} {...field('color')} />
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Budget (Rupees)</label>
              <input className={s.fieldInput} type="number" step="100000" {...field('budget')} />
            </div>

            <div className={s.formActions}>
              <button className={s.saveBtn} disabled={saving} onClick={save}>
                {saving ? 'Saving…' : isNew ? 'Create Team' : 'Save Changes'}
              </button>
              {status === 'saved' && <span className={s.saveStatus}>✓ Saved</span>}
              {status === 'error' && <span className={s.saveError}>✗ Error saving</span>}
              {!isNew && selectedId && (
                <button className={s.deleteBtn} disabled={saving} onClick={remove}>Delete</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
