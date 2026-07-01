import Database from 'better-sqlite3'
import path from 'path'
import { TWEAK_DEFAULTS } from '@/lib/presets'
import type { TweakState, AuctionState } from '@/features/auction/types'

function db() {
  return new Database(path.resolve(process.cwd(), 'prisma/dev.db'))
}

function upsert(conn: Database.Database, id: number, data: unknown): void {
  conn.prepare(
    'INSERT INTO Config (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
  ).run(id, JSON.stringify(data))
}

export const ConfigRepository = {
  // id=1: visual tweaks
  getTweaks(): TweakState {
    const conn = db()
    try {
      const row = conn.prepare('SELECT data FROM Config WHERE id = 1').get() as { data: string } | undefined
      if (!row?.data) return { ...TWEAK_DEFAULTS }
      return { ...TWEAK_DEFAULTS, ...(JSON.parse(row.data) as Partial<TweakState>) }
    } finally {
      conn.close()
    }
  },

  saveTweaks(tweaks: TweakState): void {
    const conn = db()
    try { upsert(conn, 1, tweaks) } finally { conn.close() }
  },

  clearTweaks(): void {
    const conn = db()
    try { conn.prepare('DELETE FROM Config WHERE id = 1').run() } finally { conn.close() }
  },

  // id=2: auction state (persisted so refreshes don't lose progress)
  getAuctionState(): AuctionState | null {
    const conn = db()
    try {
      const row = conn.prepare('SELECT data FROM Config WHERE id = 2').get() as { data: string } | undefined
      if (!row?.data) return null
      const parsed = JSON.parse(row.data) as Record<string, unknown>
      // Normalise fields added after initial implementation so old saved states load cleanly
      if (parsed.auctionMode === undefined) parsed.auctionMode = null
      if (!Array.isArray(parsed.captainResults)) parsed.captainResults = []
      if (!Array.isArray(parsed.lotOrder)) parsed.lotOrder = []
      if (!Array.isArray(parsed.phaseResults)) parsed.phaseResults = []
      if (typeof parsed.auctionPhase !== 'number') parsed.auctionPhase = 1
      if (typeof parsed.secretBid !== 'boolean') parsed.secretBid = false
      return parsed as unknown as AuctionState
    } finally {
      conn.close()
    }
  },

  saveAuctionState(state: AuctionState): void {
    const conn = db()
    try { upsert(conn, 2, state) } finally { conn.close() }
  },

  clearAuctionState(): void {
    const conn = db()
    try { conn.prepare('DELETE FROM Config WHERE id = 2').run() } finally { conn.close() }
  },
}
