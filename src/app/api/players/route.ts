import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PlayerRepository } from '@/repositories/PlayerRepository'

const StatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sortOrder: z.number().int().min(0),
})

const PlayerSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  country: z.string().min(1),
  age: z.number().int().positive(),
  jerseyNum: z.number().int().positive(),
  basePrice: z.number().int().positive(),
  tag: z.enum(['MARQUEE', 'UNCAPPED', '']).default(''),
  category: z.enum(['captain', 'player']).default('player'),
  gender: z.enum(['male', 'female']).default('male'),
  photoUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  stats: z.array(StatSchema).max(4),
})

export async function GET() {
  const players = await PlayerRepository.findAllLite()
  return NextResponse.json(players)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = PlayerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { stats, ...data } = parsed.data
  const player = await PlayerRepository.create({ ...data, photoUrl: data.photoUrl ?? null }, stats)
  return NextResponse.json(player, { status: 201 })
}
