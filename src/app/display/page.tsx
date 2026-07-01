import type { Metadata } from 'next'
import { PlayerRepository } from '@/repositories/PlayerRepository'
import { TeamRepository } from '@/repositories/TeamRepository'
import { ConfigRepository } from '@/repositories/ConfigRepository'
import { DisplayApp } from '@/features/display/DisplayApp'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const tweaks = ConfigRepository.getTweaks()
  const name = [tweaks.eventName, tweaks.eventYear].filter(Boolean).join(' ')
  return { title: name ? `${name} — Display` : 'Auction Display' }
}

export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>
}) {
  const { preview: previewParam } = await searchParams
  const preview = previewParam === '1'

  const [players, teams] = await Promise.all([
    PlayerRepository.findAllLite(),
    TeamRepository.findAll(),
  ])

  return (
    <DisplayApp
      initialPlayers={players as any}
      initialTeams={teams as any}
      preview={preview}
    />
  )
}
