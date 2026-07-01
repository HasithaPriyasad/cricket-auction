'use client'
import { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { useAuctionStore } from '@/features/auction/store'
import { useAnimGate } from '@/hooks/useAnimGate'
import { getAudio } from '@/services/AuctionAudio'
import { AuctionFX } from '@/services/AuctionFX'
import { getBroadcastService } from '@/services/BroadcastChannelService'
import { INTENSITY } from '@/lib/presets'
import { speakAmount } from '@/lib/formatters'
import { DisplayScreen } from './DisplayScreen'
import type { DisplayView } from './TopBar'
import type { AuctionState } from '@/features/auction/types'
import type { TweakState } from '@/features/auction/types'
import type { PlayerData, TeamData } from '@/features/auction/reducer'
import type { SyncMessage } from '@/services/AuctionEventService'

interface DisplayAppProps {
  initialPlayers: PlayerData[]
  initialTeams: TeamData[]
  preview?: boolean
}

export function DisplayApp({ initialPlayers, initialTeams, preview = false }: DisplayAppProps) {
  const animOn = useAnimGate()
  const screenRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<AuctionFX | null>(null)
  const prevStateRef = useRef<AuctionState | null>(null)
  const realAliveRef = useRef(0)

  const [view, setView] = useState<DisplayView>('live')
  const [conn, setConn] = useState<'live' | 'reconnecting'>('live')
  // Chrome requires at least one user gesture before speechSynthesis.speak() will fire.
  // The preview iframe is always considered "ready" since it never plays voice.
  const [audioReady, setAudioReady] = useState(preview)
  const [fullscreenOverlay, setFullscreenOverlay] = useState(false)
  const fullscreenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read auction state directly from Zustand — updates synchronously when
  // applyRemoteAction or FULL_STATE writes to the store.
  const state = useAuctionStore((st) => st.auction)
  const tweaks = useAuctionStore((st) => st.tweaks)
  const storePlayers = useAuctionStore((st) => st.players)
  // Use store players once seeded (e.g. after PLAYERS_UPDATE); fall back to server-rendered initial
  const players = storePlayers.length > 0 ? storePlayers : initialPlayers
  const teams = initialTeams

  // Team lookup
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  // Init canvas FX
  useEffect(() => {
    if (canvasRef.current) {
      fxRef.current = new AuctionFX(canvasRef.current)
    }
    return () => fxRef.current?.destroy()
  }, [])

  // Subscribe to broadcast channel
  useEffect(() => {
    const svc = getBroadcastService()
    const audio = getAudio()

    // Seed the store with reference data so applyRemoteAction has correct players/teams
    useAuctionStore.getState().loadPlayersTeams(initialPlayers, initialTeams)

    // Apply a set of audio settings to the AuctionAudio singleton
    function applyAudio(a: { voiceOn: boolean; fxOn: boolean; volume: number }) {
      if (preview) return  // preview iframe never plays audio
      audio.voiceOn = a.voiceOn
      audio.fxOn = a.fxOn
      audio.setVolume(a.volume)
    }

    // Start muted until FULL_STATE arrives with the operator's settings
    audio.voiceOn = false
    audio.fxOn = false

    // Request current state from operator
    svc.send({ type: 'REQUEST_STATE' })

    // Heartbeat — real display windows announce presence so preview iframes mute
    let hb: ReturnType<typeof setInterval> | undefined
    if (!preview) {
      hb = setInterval(() => svc.send({ type: 'DISPLAY_ALIVE' }), 1500)
    }

    const unsub = svc.subscribe((msg: SyncMessage) => {
      if (msg.type === 'DISPLAY_ALIVE' && preview) {
        realAliveRef.current = Date.now()
        audio.fxOn = false
        audio.voiceOn = false
      }

      if (msg.type === 'AUCTION_ACTION') {
        // applyRemoteAction updates the Zustand store → useAuctionStore subscribers
        // re-render synchronously via useSyncExternalStore. No manual setState needed.
        useAuctionStore.getState().applyRemoteAction(msg.action)
      }

      if (msg.type === 'TWEAK_UPDATE') {
        useAuctionStore.setState((st) => ({ tweaks: { ...st.tweaks, [msg.key]: msg.value } }))
      }

      if (msg.type === 'AUDIO_UPDATE') {
        useAuctionStore.setState({ audio: msg.audio })
        applyAudio(msg.audio)
      }

      if (msg.type === 'VIEW_UPDATE') {
        setView(msg.view as DisplayView)
      }

      if (msg.type === 'FULL_STATE') {
        // Write the full operator state directly into the store so all subscribers update at once
        useAuctionStore.setState({ auction: msg.auction, tweaks: msg.tweaks, audio: msg.audio })
        applyAudio(msg.audio)
        if (msg.displayView) setView(msg.displayView as DisplayView)
        setConn('live')
      }

      if (msg.type === 'PLAYERS_UPDATE') {
        useAuctionStore.setState({ players: msg.players })
      }

      if (msg.type === 'FULLSCREEN_REQUEST' && !preview) {
        // Can't call requestFullscreen() from a message handler (no user gesture).
        // Show an overlay instead — the click on the overlay IS a user gesture.
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          setFullscreenOverlay(true)
          if (fullscreenTimerRef.current) clearTimeout(fullscreenTimerRef.current)
          fullscreenTimerRef.current = setTimeout(() => setFullscreenOverlay(false), 8000)
        }
      }
    })

    // Reconnect detection
    const reconnectTimeout = setInterval(() => {
      svc.send({ type: 'REQUEST_STATE' })
      setConn('reconnecting')
    }, 15000)

    return () => {
      unsub()
      if (hb) clearInterval(hb)
      clearInterval(reconnectTimeout)
    }
  }, [preview])

  // AV — diff state and fire sound/speech/effects
  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = state
    if (!prev) return

    const audio = getAudio()
    const fx = fxRef.current
    const celebrationMuted = preview && Date.now() - realAliveRef.current < 3500

    // New bid
    const top = state.feed[0]
    const ptop = prev.feed[0]
    if (top && (!ptop || top.id !== ptop.id)) {
      if (!celebrationMuted) {
        audio.play('bid')
        const teamName = teamById[top.team]?.short ?? ''
        audio.say(`New bid received from ${teamName}`)
      }
    }

    // Status change
    if (state.status && state.status !== prev.status) {
      if (!celebrationMuted) {
        audio.play(state.status as any)
        const labels: Record<string, string> = { once: 'Going once', twice: 'Going twice', final: 'Final call' }
        audio.say(labels[state.status] ?? '')
      }
    }

    // Phase change
    if (state.phase !== prev.phase) {
      if (state.phase === 'bidding' && prev.phase !== 'bidding') {
        // Any transition INTO bidding = new lot (covers first lot and all subsequent)
        if (!celebrationMuted) {
          audio.play('walkin')
          const p = players[state.lotIndex]
          if (p) audio.say(`Next player entering the auction. ${p.name}`)
        }
      } else if (state.phase === 'unsold') {
        if (!celebrationMuted) {
          audio.play('unsold')
          const p = players[state.lotIndex]
          if (p) audio.say(`${p.name}. Unsold.`)
        }
      } else if (state.phase === 'sold' && state.justBought) {
        const team = teamById[state.justBought]
        const price = state.currentBid
        if (!celebrationMuted) {
          audio.play('hammer')
          setTimeout(() => audio.play('sold'), 220)
          if (team) audio.say(`Player sold to ${team.name}, for ${speakAmount(price)} rupees`)
          if (fx) {
            const intensity = INTENSITY[tweaks.celebration]
            const cols = team ? [team.color, '#ffffff', tweaks.accent] : ['#f3b327', '#ffffff']
            fx.confetti(cols, intensity)
            fx.cannon(cols, intensity)
            if (intensity >= 1) fx.fireworksShow(cols, intensity, tweaks.celebration === 'max' ? 7 : 4)
          }
        }
      }
    }
  }, [state])

  // Scale 1920×1080 to viewport
  useLayoutEffect(() => {
    const fit = () => {
      const el = screenRef.current
      if (!el) return
      const sc = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
      const ox = (window.innerWidth - 1920 * sc) / 2
      const oy = (window.innerHeight - 1080 * sc) / 2
      el.style.transform = `translate(${ox}px, ${oy}px) scale(${sc})`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  function activateAudio() {
    if (audioReady) return
    try {
      // Chrome (71+) requires a real click inside THIS document before
      // speechSynthesis.speak() will fire. Calling getVoices() here satisfies
      // that requirement without playing any audible phrase.
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.getVoices()
      }
    } catch { /* no-op */ }
    // Enter fullscreen on the same click that activates audio (same user gesture)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    setAudioReady(true)
  }

  function handleFullscreenOverlayClick() {
    setFullscreenOverlay(false)
    if (fullscreenTimerRef.current) clearTimeout(fullscreenTimerRef.current)
    document.documentElement.requestFullscreen().catch(() => {})
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}
      onClick={activateAudio}
    >
      {!audioReady && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.82)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 28 }}>🔊</div>
          <div style={{
            fontSize: 36, fontWeight: 700, color: '#fff',
            letterSpacing: '0.04em', marginBottom: 14,
          }}>
            Click to activate audio &amp; fullscreen
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>
            Browser requires a click before voice announcements can play
          </div>
        </div>
      )}

      {fullscreenOverlay && (
        <div
          onClick={handleFullscreenOverlayClick}
          style={{
            position: 'absolute', inset: 0, zIndex: 1001,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 24, color: '#fff' }}>⛶</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', marginBottom: 12 }}>
            Click to go fullscreen
          </div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>
            Overlay closes automatically in a moment
          </div>
        </div>
      )}
      <DisplayScreen
        state={state}
        tweaks={tweaks}
        view={view}
        conn={conn}
        players={players}
        teams={teams}
        screenRef={screenRef}
        canvasRef={canvasRef}
        animOn={animOn}
        onReconnect={() => {
          getBroadcastService().send({ type: 'REQUEST_STATE' })
          setConn('reconnecting')
        }}
        onCloseSummary={() => {}}
      />
    </div>
  )
}
