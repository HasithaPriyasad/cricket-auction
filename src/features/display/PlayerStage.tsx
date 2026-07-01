'use client'
import Image from 'next/image'
import { useRef, useEffect } from 'react'
import type { AuctionPhase } from '@/features/auction/types'
import type { PlayerData } from '@/features/auction/reducer'
import { rupees } from '@/lib/formatters'
import s from './display.module.css'

interface PlayerStageProps {
  player: PlayerData
  phase: AuctionPhase
  currencySymbol: string
  bidSeq?: number
}

// key={player.id} on this component forces remount and resets entrance animations
export function PlayerStage({ player, phase, currencySymbol, bidSeq }: PlayerStageProps) {
  const isWalkin = phase === 'walkin'
  const photoWrapRef = useRef<HTMLDivElement>(null)
  const prevBidSeq = useRef(bidSeq)

  // Retrigger the photo scale-pulse on every new bid without remounting the image
  useEffect(() => {
    if (bidSeq === undefined || bidSeq === prevBidSeq.current) return
    prevBidSeq.current = bidSeq
    const el = photoWrapRef.current
    if (!el) return
    el.classList.remove(s.cutoutPhotoWrapBid)
    void el.offsetHeight // force reflow so the browser sees the class removal
    el.classList.add(s.cutoutPhotoWrapBid)
  }, [bidSeq])

  return (
    <div className={s.playerCol}>
      {/* Cutout */}
      <div className={`${s.cutout} ${isWalkin ? s.cutoutWalkin : ''}`}>
        <div className={s.cutoutStripes} />
        <div className={s.cutoutNum}>{player.jerseyNum}</div>
        {(player.photoUrl || player.hasPhoto) && (
          <div
            ref={photoWrapRef}
            className={`${s.cutoutPhotoWrap} ${isWalkin ? s.cutoutPhotoWrapWalkin : ''}`}
          >
            <Image
              src={player.photoUrl ?? `/api/players/${player.id}/photo`}
              alt={player.name}
              fill
              unoptimized
              className={s.cutoutPhoto}
              priority
            />
          </div>
        )}
        {/* Bid flash overlay — key resets on every new bid */}
        <div key={bidSeq} className={s.cutoutBidFlash} />
        <div className={s.cutoutSpot} />
        <div className={s.cutoutFloor} />
        {/* Walk-in shimmer sweep */}
        {isWalkin && <div className={s.cutoutShimmer} />}
      </div>

      {/* Identity */}
      <div className={s.identity}>
        {player.tag && (
          <div className={`${s.pTag} ${player.tag === 'MARQUEE' ? s.pTagMarquee : s.pTagUncapped}`}>
            {player.tag}
          </div>
        )}
        <div className={s.pRole}>{player.role}</div>
        <div className={s.pName}>{player.name}</div>
        <div className={s.pMeta}>
          <span>{player.country}</span>
          <i className={s.pMetaDot} />
          <span>Age {player.age}</span>
          <i className={s.pMetaDot} />
          <span>#{player.jerseyNum}</span>
          <i className={s.pMetaDot} />
          <span>{player.gender === 'male' ? 'Male' : 'Female'}</span>
        </div>

        {/* Stats — loaded from DB */}
        <div className={s.stats}>
          {(player as any).stats?.map((stat: { label: string; value: string; sortOrder: number }, i: number) => (
            <div key={stat.label} className={s.stat} style={{ '--i': i } as React.CSSProperties}>
              <div className={s.statV}>{stat.value}</div>
              <div className={s.statK}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className={s.basePrice}>
          <span className={s.basePriceKey}>Base Price</span>
          <span className={s.basePriceVal}>{rupees(player.basePrice, currencySymbol)}</span>
        </div>
      </div>
    </div>
  )
}
