import type { AuctionAction } from '@/features/auction/types'
import type { TweakState } from '@/features/auction/types'
import type { AuctionState } from '@/features/auction/types'
import type { AudioState } from '@/features/auction/types'
import type { PlayerData } from '@/features/auction/reducer'

export type SyncMessage =
  | { type: 'AUCTION_ACTION'; action: AuctionAction }
  | { type: 'TWEAK_UPDATE'; key: keyof TweakState; value: TweakState[keyof TweakState] }
  | { type: 'AUDIO_UPDATE'; audio: AudioState }
  | { type: 'VIEW_UPDATE'; view: string }
  | { type: 'DISPLAY_ALIVE' }
  | { type: 'REQUEST_STATE' }
  | { type: 'FULL_STATE'; auction: AuctionState; tweaks: TweakState; audio: AudioState; displayView?: string }
  | { type: 'PLAYERS_UPDATE'; players: PlayerData[] }
  | { type: 'FULLSCREEN_REQUEST' }

export type SyncHandler = (msg: SyncMessage) => void

export interface AuctionEventService {
  send(msg: SyncMessage): void
  subscribe(handler: SyncHandler): () => void
  destroy(): void
}
