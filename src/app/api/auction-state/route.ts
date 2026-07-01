import { NextResponse } from 'next/server'
import { ConfigRepository } from '@/repositories/ConfigRepository'
import type { AuctionState } from '@/features/auction/types'

export async function PUT(req: Request) {
  const body: AuctionState = await req.json()
  ConfigRepository.saveAuctionState(body)
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  ConfigRepository.clearAuctionState()
  return NextResponse.json({ ok: true })
}
