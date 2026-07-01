import { NextResponse } from 'next/server'
import { AuctionRepository } from '@/repositories/AuctionRepository'

export async function GET() {
  const auction = await AuctionRepository.findActive()
  return NextResponse.json(auction)
}
