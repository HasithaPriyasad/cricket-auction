'use client'
import { useState, useRef } from 'react'
import type { PlayerData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import { useConfirm } from '@/hooks/useConfirm'
import s from './admin.module.css'

interface PlayerStat { label: string; value: string; sortOrder: number }
interface PlayerWithStats extends PlayerData { stats: PlayerStat[] }

interface PlayersPanelProps {
  players: PlayerWithStats[]
  onRefresh: () => void
}

const EMPTY_PLAYER = {
  name: '', role: '', country: 'Sri Lanka', age: 25, jerseyNum: 1,
  basePrice: 500000, tag: '' as '' | 'MARQUEE' | 'UNCAPPED',
  category: 'player' as 'captain' | 'player', gender: 'male' as 'male' | 'female',
  photoUrl: '', sortOrder: 0,
  stats: [] as PlayerStat[],
}

const ROLES = ['Batter', 'Bowler', 'Fast Bowler', 'Off-spinner', 'Leg-spinner', 'All-rounder', 'Wicket-keeper']
const TAGS = [{ value: '', label: 'None' }, { value: 'MARQUEE', label: 'Marquee' }, { value: 'UNCAPPED', label: 'Uncapped' }]

export function PlayersPanel({ players, onRefresh }: PlayersPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_PLAYER)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [search, setSearch] = useState('')
  const { confirm, ConfirmModal } = useConfirm()

  const selectSeqRef = useRef(0)

  async function selectPlayer(p: PlayerWithStats) {
    const seq = ++selectSeqRef.current
    setSelectedId(p.id)
    setIsNew(false)
    setStatus('idle')
    setForm({
      name: p.name, role: p.role, country: p.country, age: p.age, jerseyNum: p.jerseyNum,
      basePrice: p.basePrice, tag: (p.tag as any) ?? '',
      category: ((p as any).category ?? 'player') as 'captain' | 'player',
      gender: ((p as any).gender ?? 'male') as 'male' | 'female',
      photoUrl: p.photoUrl ?? '', sortOrder: p.sortOrder,
      stats: p.stats.map((st) => ({ label: st.label, value: st.value, sortOrder: st.sortOrder })),
    })
    // Lite player data has no photoUrl — fetch it asynchronously so the form is instant
    try {
      const res = await fetch(`/api/players/${p.id}`)
      if (res.ok && selectSeqRef.current === seq) {
        const full = await res.json()
        setForm((f) => ({ ...f, photoUrl: full.photoUrl ?? '' }))
      }
    } catch { /* non-critical */ }
  }

  function startNew() {
    setSelectedId(null); setIsNew(true)
    setForm({ ...EMPTY_PLAYER, sortOrder: players.length })
    setStatus('idle')
  }

  function setField(key: keyof typeof form, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setStat(i: number, key: 'label' | 'value', val: string) {
    setForm((f) => {
      const stats = [...f.stats]
      stats[i] = { ...stats[i], [key]: val }
      return { ...f, stats }
    })
  }

  function addStat() {
    if (form.stats.length >= 4) return
    setForm((f) => ({ ...f, stats: [...f.stats, { label: '', value: '', sortOrder: f.stats.length }] }))
  }

  function removeStat(i: number) {
    setForm((f) => ({ ...f, stats: f.stats.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setSaving(true); setStatus('idle')
    try {
      const payload = {
        ...form,
        photoUrl: form.photoUrl || null,
        stats: form.stats.map((st, i) => ({ ...st, sortOrder: i })),
      }
      const url = isNew ? '/api/players' : `/api/players/${selectedId}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
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

  async function doDelete() {
    if (!selectedId) return
    setSaving(true)
    try {
      await fetch(`/api/players/${selectedId}`, { method: 'DELETE' })
      setSelectedId(null); setIsNew(false); setForm(EMPTY_PLAYER)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  function remove() {
    if (!selectedId) return
    confirm(
      `Delete ${form.name || 'this player'}?`,
      'This will permanently remove the player and all their stats. This cannot be undone.',
      doDelete,
    )
  }

  const showForm = selectedId !== null || isNew

  const q = search.trim().toLowerCase()
  const filtered = q
    ? players.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
      )
    : players

  return (
    <>
    <div className={s.crudPanel}>
      <div className={s.crudList}>
        <div className={s.crudListHeader}>
          <span className={s.crudListTitle}>
            Players ({q ? `${filtered.length} / ${players.length}` : players.length})
          </span>
          <button className={s.crudAddBtn} onClick={startNew}>+ Add Player</button>
        </div>
        <input
          className={s.crudSearch}
          placeholder="Search by name, role or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={s.crudListScroll}>
          {filtered.map((p) => {
            const globalIdx = players.indexOf(p)
            return (
            <div
              key={p.id}
              className={`${s.crudItem} ${selectedId === p.id ? s.crudItemActive : ''}`}
              onClick={() => selectPlayer(p)}
            >
              <div className={s.crudItemBody}>
                <div className={s.crudItemName}>
                  {String(globalIdx + 1).padStart(2, '0')}. {p.name}
                  {p.tag === 'MARQUEE' && ' ★'}
                </div>
                <div className={s.crudItemSub}>
                  {p.role} · {p.country} · Base {rupees(p.basePrice)} · {(p as any).gender ?? 'male'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {(p as any).category === 'captain' && <span className={s.crudItemBadgeCaptain}>C</span>}
                {p.tag && <span className={s.crudItemBadge}>{p.tag}</span>}
              </div>
            </div>
          )})}
        </div>
      </div>

      <div className={s.crudForm}>
        {!showForm ? (
          <div className={s.crudFormEmpty}>Select a player to edit, or add a new one</div>
        ) : (
          <div className={s.crudFormInner}>
            <div className={s.crudFormTitle}>{isNew ? 'New Player' : form.name || 'Edit Player'}</div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Full Name</label>
              <input className={s.fieldInput} placeholder="Kasun Perera"
                value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>

            <div className={s.fieldRow}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Role</label>
                <select className={s.fieldSelect}
                  value={form.role} onChange={(e) => setField('role', e.target.value)}>
                  <option value="">Select role…</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Tag</label>
                <select className={s.fieldSelect}
                  value={form.tag} onChange={(e) => setField('tag', e.target.value)}>
                  {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className={s.fieldRow}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Category</label>
                <select className={s.fieldSelect}
                  value={form.category} onChange={(e) => setField('category', e.target.value)}>
                  <option value="player">Player</option>
                  <option value="captain">Captain</option>
                </select>
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Gender</label>
                <select className={s.fieldSelect}
                  value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className={s.fieldRow3}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Country</label>
                <input className={s.fieldInput} placeholder="Sri Lanka"
                  value={form.country} onChange={(e) => setField('country', e.target.value)} />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Age</label>
                <input className={s.fieldInput} type="number" min={15} max={50}
                  value={form.age} onChange={(e) => setField('age', Number(e.target.value))} />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Jersey #</label>
                <input className={s.fieldInput} type="number" min={1} max={99}
                  value={form.jerseyNum} onChange={(e) => setField('jerseyNum', Number(e.target.value))} />
              </div>
            </div>

            <div className={s.fieldRow}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Base Price (Rs.)</label>
                <input className={s.fieldInput} type="number" step={100000} min={100000}
                  value={form.basePrice} onChange={(e) => setField('basePrice', Number(e.target.value))} />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Sort Order</label>
                <input className={s.fieldInput} type="number" min={0}
                  value={form.sortOrder} onChange={(e) => setField('sortOrder', Number(e.target.value))} />
              </div>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.fieldLabel}>Photo (optional)</label>
              <div className={s.photoSection}>
                <div className={s.photoPreviewRow}>
                  {form.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photoUrl} alt="" className={s.photoPreview} />
                  ) : (
                    <div className={s.photoPlaceholder}>👤</div>
                  )}
                  <div className={s.photoActions}>
                    <label className={s.photoUploadBtn}>
                      {form.photoUrl ? 'Replace photo' : 'Upload photo'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (ev) => setField('photoUrl', ev.target?.result as string)
                          reader.readAsDataURL(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {form.photoUrl && (
                      <button className={s.photoRemoveBtn} onClick={() => setField('photoUrl', '')}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <span className={s.photoUrlSep}>OR PASTE A URL</span>
                <input
                  className={s.fieldInput}
                  placeholder="https://example.com/photo.jpg"
                  value={form.photoUrl.startsWith('data:') ? '' : form.photoUrl}
                  onChange={(e) => setField('photoUrl', e.target.value)}
                />
              </div>
            </div>

            {/* Stats */}
            <div className={s.statsBlock}>
              <div className={s.statsBlockTitle}>Stats (up to 4)</div>
              {form.stats.map((st, i) => (
                <div key={i} className={s.statRow}>
                  <input className={s.fieldInput} placeholder="Label (e.g. Runs)"
                    value={st.label} onChange={(e) => setStat(i, 'label', e.target.value)} />
                  <input className={s.fieldInput} placeholder="Value (e.g. 4,820)"
                    value={st.value} onChange={(e) => setStat(i, 'value', e.target.value)} />
                  <button className={s.statRemoveBtn} onClick={() => removeStat(i)}>×</button>
                </div>
              ))}
              {form.stats.length < 4 && (
                <button className={s.addStatBtn} onClick={addStat}>+ Add Stat</button>
              )}
            </div>

            <div className={s.formActions}>
              <button className={s.saveBtn} disabled={saving} onClick={save}>
                {saving ? 'Saving…' : isNew ? 'Create Player' : 'Save Changes'}
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
    {ConfirmModal}
    </>
  )
}
