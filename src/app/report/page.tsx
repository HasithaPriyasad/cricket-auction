import type { Metadata } from 'next'
import { PlayerRepository } from '@/repositories/PlayerRepository'
import { TeamRepository } from '@/repositories/TeamRepository'
import { ConfigRepository } from '@/repositories/ConfigRepository'
import { ReportView } from '@/features/report/ReportView'
import PrintButton from './PrintButton'
import s from '@/features/report/report.module.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const tweaks = ConfigRepository.getTweaks()
  const name = [tweaks.eventName, tweaks.eventYear].filter(Boolean).join(' ')
  return { title: name ? `${name} — Report` : 'Auction Report' }
}

export default async function ReportPage() {
  const [players, teams] = await Promise.all([
    PlayerRepository.findAll(),
    TeamRepository.findAll(),
  ])
  const tweaks = ConfigRepository.getTweaks()
  const auction = ConfigRepository.getAuctionState()
  const eventLabel = [tweaks.eventName, tweaks.eventYear].filter(Boolean).join(' ')

  return (
    <div className={s.page}>
      <div className={s.pageInner}>
        <div className={s.pageHeader}>
          <div>
            <div className={s.pageTitle}>Auction Report</div>
            {eventLabel && <div className={s.pageSubtitle}>{eventLabel}</div>}
          </div>
          <PrintButton />
        </div>

        {!auction ? (
          <div className={s.emptyState}>No auction data available yet.</div>
        ) : (
          <ReportView
            teams={teams as any}
            players={players as any}
            auction={auction}
            currencySymbol={tweaks.currencySymbol}
          />
        )}
      </div>
    </div>
  )
}
