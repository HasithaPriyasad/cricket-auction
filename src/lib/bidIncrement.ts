import type { BidRule } from '@/features/auction/types'

export function bidIncrement(currentPrice: number, rules?: BidRule[]): number {
  if (!rules || rules.length === 0) {
    // fallback matching the original ladder
    if (currentPrice < 2_000_000) return 100_000
    if (currentPrice < 5_000_000) return 200_000
    return 500_000
  }
  // Use the highest-threshold rule whose threshold is <= currentPrice
  const sorted = [...rules].sort((a, b) => b.threshold - a.threshold)
  const match = sorted.find((r) => currentPrice >= r.threshold)
  return match?.increment ?? sorted[sorted.length - 1].increment
}
