import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuctionRepository } from '@/repositories/AuctionRepository'

const LotUpdateSchema = z.object({
  auctionId: z.string().min(1),
  playerId: z.number().int(),
  status: z.enum(['sold', 'unsold']),
  soldTo: z.string().optional(),
  finalPrice: z.number().int().positive().optional(),
})

export async function PATCH(req: Request) {
  const body = await req.json()
  const parsed = LotUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { auctionId, playerId, status, soldTo, finalPrice } = parsed.data

  const lot = await AuctionRepository.findLotByAuctionAndPlayer(auctionId, playerId)
  if (!lot) return NextResponse.json({ error: 'Lot not found' }, { status: 404 })

  const updated = await AuctionRepository.updateLot(lot.id, {
    status,
    soldTo: soldTo ?? null,
    finalPrice: finalPrice ?? null,
  })

  if (status === 'sold' && soldTo && finalPrice) {
    await AuctionRepository.recordBid(lot.id, soldTo, finalPrice)
    await AuctionRepository.incrementTeamSpend(auctionId, soldTo, finalPrice)
  }

  return NextResponse.json(updated)
}
