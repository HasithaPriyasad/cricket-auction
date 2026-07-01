import type { AuctionEventService, SyncHandler, SyncMessage } from './AuctionEventService'

const CHANNEL_NAME = 'cricket-auction'

export class BroadcastChannelService implements AuctionEventService {
  private channel: BroadcastChannel
  private handlers = new Set<SyncHandler>()

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (ev: MessageEvent<SyncMessage>) => {
      if (ev.data?.type) {
        this.handlers.forEach((h) => h(ev.data))
      }
    }
  }

  send(msg: SyncMessage): void {
    this.channel.postMessage(msg)
  }

  subscribe(handler: SyncHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  destroy(): void {
    this.channel.close()
    this.handlers.clear()
  }
}

// Singleton — one channel per display window
let _instance: BroadcastChannelService | null = null

export function getBroadcastService(): BroadcastChannelService {
  if (!_instance) _instance = new BroadcastChannelService()
  return _instance
}
