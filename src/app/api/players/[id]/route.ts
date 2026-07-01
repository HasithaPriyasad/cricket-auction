import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PlayerRepository } from '@/repositories/PlayerRepository'

const StatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sortOrder: z.number().int().min(0),
})

const PlayerPatchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  age: z.number().int().positive().optional(),
  jerseyNum: z.number().int().positive().optional(),
  basePrice: z.number().int().positive().optional(),
  tag: z.string().optional(),
  category: z.enum(['captain', 'player']).optional(),
  gender: z.enum(['male', 'female']).optional(),
  photoUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  stats: z.array(StatSchema).max(4).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await PlayerRepository.findById(Number(id))
  if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(player)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = PlayerPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { stats, ...data } = parsed.data
  const player = await PlayerRepository.update(Number(id), data, stats)
  return NextResponse.json(player)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await PlayerRepository.delete(Number(id))
  return NextResponse.json({ ok: true })
}
