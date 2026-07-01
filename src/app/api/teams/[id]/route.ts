import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TeamRepository } from '@/repositories/TeamRepository'

const TeamPatchSchema = z.object({
  name: z.string().min(1).optional(),
  short: z.string().min(1).max(12).optional(),
  abbreviation: z.string().min(1).max(4).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  budget: z.number().int().positive().optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await TeamRepository.findById(id)
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(team)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = TeamPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const team = await TeamRepository.update(id, parsed.data)
  return NextResponse.json(team)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await TeamRepository.delete(id)
  return NextResponse.json({ ok: true })
}
