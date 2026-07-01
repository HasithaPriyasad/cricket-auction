import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PlayerRepository } from '@/repositories/PlayerRepository'

const Schema = z.object({ ids: z.array(z.number().int().positive()) })

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  if (parsed.data.ids.length > 0) {
    await PlayerRepository.convertToPlayers(parsed.data.ids)
  }
  return NextResponse.json({ ok: true })
}
