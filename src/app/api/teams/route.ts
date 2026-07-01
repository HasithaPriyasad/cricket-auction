import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TeamRepository } from '@/repositories/TeamRepository'

const TeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  short: z.string().min(1).max(12),
  abbreviation: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  budget: z.number().int().positive(),
})

export async function GET() {
  const teams = await TeamRepository.findAll()
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = TeamSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const team = await TeamRepository.create(parsed.data)
  return NextResponse.json(team, { status: 201 })
}
