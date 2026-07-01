import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuctionRepository } from '@/repositories/AuctionRepository'

const EventSchema = z.object({
  auctionId: z.string().min(1),
  kind: z.enum(['intro', 'bid', 'status', 'sold', 'unsold']),
  text: z.string().min(1),
  teamId: z.string().optional(),
  simMin: z.number().int().min(0),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const event = await AuctionRepository.recordEvent(parsed.data)
  return NextResponse.json(event, { status: 201 })
}
