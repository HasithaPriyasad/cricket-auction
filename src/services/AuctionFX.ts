interface ConfettiParticle {
  kind: 'confetti'
  x: number; y: number
  vx: number; vy: number
  rot: number; vr: number
  w: number; h: number
  color: string
  life: number; decay: number
  sway: number
}

interface SparkParticle {
  kind: 'spark'
  x: number; y: number
  vx: number; vy: number
  color: string
  life: number; decay: number
  r: number
}

interface RocketParticle {
  kind: 'rocket'
  x: number; y: number
  vy: number
  target: number
  onBurst: () => void
  color: string
  life: number; decay: number
}

type Particle = ConfettiParticle | SparkParticle | RocketParticle

export class AuctionFX {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private parts: Particle[] = []
  private running = false
  private w = 0
  private h = 0
  private dpr = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    window.addEventListener('resize', this._resize)
    this._resize()
  }

  private _resize = () => {
    const c = this.canvas
    this.w = c.clientWidth
    this.h = c.clientHeight
    c.width = this.w * this.dpr
    c.height = this.h * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  private _start() {
    if (!this.running) {
      this.running = true
      requestAnimationFrame(this._tick)
    }
  }

  confetti(colors: string[], intensity = 1) {
    const n = Math.round(140 * intensity)
    for (let i = 0; i < n; i++) {
      this.parts.push({
        kind: 'confetti',
        x: Math.random() * this.w,
        y: -20 - Math.random() * this.h * 0.5,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 8,
        h: 9 + Math.random() * 12,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
        decay: 0.004 + Math.random() * 0.004,
        sway: Math.random() * Math.PI * 2,
      })
    }
    this._start()
  }

  cannon(colors: string[], intensity = 1) {
    const shots: [number, number][] = [[0.08, -1], [0.92, 1]]
    shots.forEach(([fx, dir]) => {
      const n = Math.round(60 * intensity)
      for (let i = 0; i < n; i++) {
        const a = (-Math.PI / 2) + dir * (Math.random() * 0.5) - 0.1
        const sp = 9 + Math.random() * 9
        this.parts.push({
          kind: 'confetti',
          x: this.w * fx,
          y: this.h + 10,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          w: 6 + Math.random() * 8,
          h: 9 + Math.random() * 12,
          color: colors[(Math.random() * colors.length) | 0],
          life: 1,
          decay: 0.006,
          sway: Math.random() * Math.PI * 2,
        })
      }
    })
    this._start()
  }

  firework(colors: string[], intensity = 1) {
    const tx = this.w * (0.2 + Math.random() * 0.6)
    const ty = this.h * (0.2 + Math.random() * 0.3)
    const burst = () => {
      const n = Math.round(46 * intensity)
      const col = colors[(Math.random() * colors.length) | 0]
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const sp = 2.5 + Math.random() * 4.5
        this.parts.push({
          kind: 'spark',
          x: tx, y: ty,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          color: col,
          life: 1,
          decay: 0.012 + Math.random() * 0.01,
          r: 2 + Math.random() * 2,
        })
      }
      this._start()
    }
    this.parts.push({
      kind: 'rocket',
      x: tx, y: this.h,
      vy: -(this.h - ty) / 32,
      target: ty,
      onBurst: burst,
      color: '#fff',
      life: 1,
      decay: 0,
    })
    this._start()
  }

  fireworksShow(colors: string[], intensity = 1, count = 5) {
    let i = 0
    const fire = () => {
      if (i++ < count) {
        this.firework(colors, intensity)
        setTimeout(fire, 280 + Math.random() * 260)
      }
    }
    fire()
  }

  clear() {
    this.parts.length = 0
  }

  destroy() {
    window.removeEventListener('resize', this._resize)
    this.clear()
  }

  private _tick = () => {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.w, this.h)
    const g = 0.16
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]
      if (p.kind === 'rocket') {
        p.y += p.vy
        ctx.globalAlpha = 1
        ctx.fillStyle = '#fff'
        ctx.fillRect(p.x - 1.5, p.y, 3, 10)
        ctx.fillStyle = 'rgba(255,220,150,.6)'
        ctx.fillRect(p.x - 1, p.y + 8, 2, 16)
        if (p.y <= p.target) {
          p.onBurst()
          this.parts.splice(i, 1)
        }
        continue
      }
      p.life -= p.decay
      if (p.life <= 0) { this.parts.splice(i, 1); continue }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
      if (p.kind === 'confetti') {
        p.vy += g; p.x += p.vx; p.y += p.vy; p.rot += p.vr
        p.sway += 0.1; p.x += Math.sin(p.sway) * 0.6
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        if (p.y > this.h + 30) this.parts.splice(i, 1)
      } else if (p.kind === 'spark') {
        p.vy += g * 0.5; p.vx *= 0.985; p.vy *= 0.985
        p.x += p.vx; p.y += p.vy
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    if (this.parts.length > 0) {
      requestAnimationFrame(this._tick)
    } else {
      this.running = false
      ctx.clearRect(0, 0, this.w, this.h)
    }
  }
}
