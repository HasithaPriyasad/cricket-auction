import type { Metadata } from 'next'
import { PlayerRepository } from '@/repositories/PlayerRepository'
import { TeamRepository } from '@/repositories/TeamRepository'
import { ConfigRepository } from '@/repositories/ConfigRepository'
import { OperatorApp } from '@/features/admin/OperatorApp'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const tweaks = ConfigRepository.getTweaks()
  const name = [tweaks.eventName, tweaks.eventYear].filter(Boolean).join(' ')
  return { title: name ? `${name} — Control` : 'Auction Control' }
}

export default async function AdminPage() {
  const [players, teams] = await Promise.all([
    PlayerRepository.findAllLite(),
    TeamRepository.findAll(),
  ])
  const initialTweaks = ConfigRepository.getTweaks()
  const initialAuctionState = ConfigRepository.getAuctionState()

  return (
    <OperatorApp
      initialPlayers={players as any}
      initialTeams={teams as any}
      initialTweaks={initialTweaks}
      initialAuctionState={initialAuctionState}
    />
  )
}
