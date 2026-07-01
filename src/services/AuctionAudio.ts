export type AudioCue = 'walkin' | 'bid' | 'once' | 'twice' | 'final' | 'sold' | 'unsold' | 'hammer'

export class AuctionAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  fxOn = true
  voiceOn = true
  volume = 0.7
  private voice: SpeechSynthesisVoice | null = null

  constructor() {
    if (typeof speechSynthesis !== 'undefined') {
      this._pickVoice()
      speechSynthesis.onvoiceschanged = () => this._pickVoice()
    }
  }

  private _pickVoice() {
    const vs = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []
    this.voice =
      vs.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur|george/i.test(v.name)) ??
      vs.find((v) => /en-IN/i.test(v.lang)) ??
      vs.find((v) => /en-GB/i.test(v.lang)) ??
      vs.find((v) => /^en/i.test(v.lang)) ??
      vs[0] ??
      null
  }

  private _ensure(): boolean {
    if (!this.ctx) {
      const AC = (window as any).AudioContext ?? (window as any).webkitAudioContext
      if (!AC) return false
      this.ctx = new AC() as AudioContext
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return true
  }

  setVolume(v: number) {
    this.volume = v
    if (this.master) this.master.gain.value = v
  }

  private _tone(
    freq: number,
    t0: number,
    dur: number,
    type: OscillatorType = 'sine',
    gain = 0.3,
    glideTo?: number,
  ) {
    const c = this.ctx!
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (glideTo != null) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g)
    g.connect(this.master!)
    o.start(t0)
    o.stop(t0 + dur + 0.02)
  }

  private _noise(t0: number, dur: number, gain = 0.25, hp = 800) {
    const c = this.ctx!
    const n = Math.floor(c.sampleRate * dur)
    const buf = c.createBuffer(1, n, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = c.createBufferSource()
    src.buffer = buf
    const f = c.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = hp
    const g = c.createGain()
    g.gain.value = gain
    src.connect(f)
    f.connect(g)
    g.connect(this.master!)
    src.start(t0)
  }

  play(name: AudioCue) {
    if (!this.fxOn || !this._ensure()) return
    const t = this.ctx!.currentTime
    switch (name) {
      case 'walkin':
        this._noise(t, 0.5, 0.18, 500)
        this._tone(220, t, 0.5, 'sawtooth', 0.18, 880)
        this._tone(660, t + 0.18, 0.4, 'triangle', 0.12, 1320)
        break
      case 'bid':
        this._tone(880, t, 0.12, 'square', 0.22, 1320)
        this._tone(1760, t + 0.02, 0.1, 'sine', 0.1)
        break
      case 'once':
        this._tone(523, t, 0.18, 'triangle', 0.25)
        break
      case 'twice':
        this._tone(587, t, 0.18, 'triangle', 0.27)
        break
      case 'final':
        this._tone(440, t, 0.16, 'sawtooth', 0.22)
        this._tone(440, t + 0.22, 0.16, 'sawtooth', 0.22)
        break
      case 'sold':
        ;([0, 0.14, 0.28] as const).forEach((d, i) => {
          this._tone(([392, 523, 784] as const)[i], t + d, 0.5, 'sawtooth', 0.22)
          this._tone(([196, 262, 392] as const)[i], t + d, 0.5, 'square', 0.12)
        })
        this._noise(t + 0.28, 0.6, 0.2, 1200)
        break
      case 'unsold':
        this._tone(440, t, 0.25, 'sine', 0.2, 220)
        this._tone(330, t + 0.18, 0.3, 'sine', 0.18, 165)
        break
      case 'hammer':
        this._noise(t, 0.08, 0.4, 200)
        this._tone(140, t, 0.12, 'square', 0.3, 70)
        break
    }
  }

  say(text: string) {
    if (!this.voiceOn || typeof speechSynthesis === 'undefined') return
    if (!this.voice) this._pickVoice()
    try {
      if (speechSynthesis.paused) speechSynthesis.resume()
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      if (this.voice) u.voice = this.voice
      else u.lang = 'en-US'
      u.rate = 1.0
      u.pitch = 1.0
      u.volume = Math.min(1, this.volume + 0.2)
      speechSynthesis.speak(u)
    } catch {
      // no-op
    }
  }

  stopVoice() {
    try { speechSynthesis.cancel() } catch { /* no-op */ }
  }
}

// Singleton per window
let _audio: AuctionAudio | null = null
export function getAudio(): AuctionAudio {
  if (!_audio) _audio = new AuctionAudio()
  return _audio
}
