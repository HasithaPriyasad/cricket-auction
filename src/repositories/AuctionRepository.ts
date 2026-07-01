import { prisma } from '@/lib/prisma'
import type { Auction, AuctionLot, AuctionTeam, AuctionEvent, Bid } from '@/generated/prisma/client'

export type { Auction, AuctionLot, AuctionTeam, AuctionEvent, Bid }

export const AuctionRepository = {
  findActive(): Promise<Auction | null> {
    return prisma.auction.findFirst({
      where: { status: { in: ['pending', 'active'] } },
      orderBy: { createdAt: 'desc' },
    })
  },

  findById(id: string) {
    return prisma.auction.findUnique({
      where: { id },
      include: {
        lots: { include: { player: true }, orderBy: { lotNumber: 'asc' } },
        teams: { include: { team: true } },
        events: { orderBy: { occurredAt: 'asc' } },
      },
    })
  },

  create(name: string): Promise<Auction> {
    return prisma.auction.create({ data: { name } })
  },

  markStarted(id: string): Promise<Auction> {
    return prisma.auction.update({ where: { id }, data: { status: 'active', startedAt: new Date() } })
  },

  markCompleted(id: string): Promise<Auction> {
    return prisma.auction.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } })
  },

  // ── Lots ──────────────────────────────────────────────────────────────────

  updateLot(
    lotId: number,
    data: { status: string; soldTo?: string | null; finalPrice?: number | null },
  ): Promise<AuctionLot> {
    return prisma.auctionLot.update({ where: { id: lotId }, data })
  },

  findLotByAuctionAndPlayer(auctionId: string, playerId: number): Promise<AuctionLot | null> {
    return prisma.auctionLot.findUnique({ where: { auctionId_playerId: { auctionId, playerId } } })
  },

  // ── Bids ──────────────────────────────────────────────────────────────────

  recordBid(lotId: number, teamId: string, amount: number): Promise<Bid> {
    return prisma.bid.create({ data: { lotId, teamId, amount } })
  },

  findBidsByLot(lotId: number): Promise<Bid[]> {
    return prisma.bid.findMany({ where: { lotId }, orderBy: { placedAt: 'asc' } })
  },

  // ── Team spend ────────────────────────────────────────────────────────────

  incrementTeamSpend(auctionId: string, teamId: string, amount: number): Promise<AuctionTeam> {
    return prisma.auctionTeam.update({
      where: { auctionId_teamId: { auctionId, teamId } },
      data: { spent: { increment: amount } },
    })
  },

  // ── Events (timeline) ─────────────────────────────────────────────────────

  recordEvent(data: {
    auctionId: string
    kind: string
    text: string
    teamId?: string
    simMin: number
  }): Promise<AuctionEvent> {
    return prisma.auctionEvent.create({ data })
  },

  findEventsByAuction(auctionId: string): Promise<AuctionEvent[]> {
    return prisma.auctionEvent.findMany({
      where: { auctionId },
      orderBy: { occurredAt: 'asc' },
    })
  },

  // ── Summary ───────────────────────────────────────────────────────────────

  getSummary(auctionId: string) {
    return prisma.auctionLot.findMany({
      where: { auctionId },
      include: { player: true, bids: true },
      orderBy: { lotNumber: 'asc' },
    })
  },
}
