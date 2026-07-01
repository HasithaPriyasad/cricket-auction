import { NextResponse } from 'next/server'
import { AuctionRepository } from '@/repositories/AuctionRepository'
import { TeamRepository } from '@/repositories/TeamRepository'
import { compactINR, rupees } from '@/lib/formatters'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const auctionId = searchParams.get('auctionId')

  const auction = auctionId
    ? await AuctionRepository.findById(auctionId)
    : await (async () => {
        const a = await AuctionRepository.findActive()
        return a ? AuctionRepository.findById(a.id) : null
      })()

  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

  const teams = await TeamRepository.findAll()
  const lots = await AuctionRepository.getSummary(auction.id)

  const sold = lots.filter((l) => l.status === 'sold')
  const unsold = lots.filter((l) => l.status === 'unsold')
  const prices = sold.map((l) => l.finalPrice ?? 0)
  const totalSpend = prices.reduce((a, b) => a + b, 0)

  const teamStats = teams.map((t) => {
    const teamLots = sold.filter((l) => l.soldTo === t.id)
    const spent = teamLots.reduce((a, l) => a + (l.finalPrice ?? 0), 0)
    const mostExpensive = teamLots.sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0))[0]
    return {
      team: t,
      playersBought: teamLots.length,
      totalSpent: spent,
      totalSpentFormatted: compactINR(spent),
      remainingBudget: t.budget - spent,
      remainingBudgetFormatted: compactINR(t.budget - spent),
      mostExpensivePlayer: mostExpensive
        ? { name: mostExpensive.player.name, price: mostExpensive.finalPrice, priceFormatted: rupees(mostExpensive.finalPrice ?? 0) }
        : null,
    }
  })

  const topPurchases = [...sold]
    .sort((a, b) => (b.finalPrice ?? 0) - (a.finalPrice ?? 0))
    .slice(0, 5)
    .map((l) => ({
      player: l.player,
      soldTo: l.soldTo,
      price: l.finalPrice,
      priceFormatted: rupees(l.finalPrice ?? 0),
    }))

  return NextResponse.json({
    auction: { id: auction.id, name: auction.name, status: auction.status },
    stats: {
      totalAuctioned: lots.length,
      sold: sold.length,
      unsold: unsold.length,
      totalSpend,
      totalSpendFormatted: compactINR(totalSpend),
      highestBid: prices.length ? Math.max(...prices) : 0,
      highestBidFormatted: prices.length ? rupees(Math.max(...prices)) : '—',
      lowestBid: prices.length ? Math.min(...prices) : 0,
      averagePrice: prices.length ? Math.round(totalSpend / prices.length) : 0,
    },
    teamStats,
    topPurchases,
  })
}
