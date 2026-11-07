import type { SceneFactory } from '../types.js'
import { TAU, createSprite, lerp, rand, scaledCount, withAlpha } from '../utils.js'

/** Warm gold, honey, pale butter, peach. */
const SUN_COLORS = ['#ffd36b', '#ffc04d', '#ffe39a', '#ffb070', '#fff0bf']

interface Orb {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  alpha: number
  phase: number
  freq: number
  sprite: number
}

interface Glint {
  x: number
  y: number
  size: number
  age: number
  life: number
  rot: number
  sprite: number
}

interface Ray {
  angle: number
  spread: number
  length: number
  phase: number
}

/** Lens bokeh: soft core with a slightly brighter rim. */
const orbSprite = (color: string) =>
  createSprite(128, (ctx, s) => {
    const r = s / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, withAlpha(color, 0.38))
    g.addColorStop(0.72, withAlpha(color, 0.5))
    g.addColorStop(0.86, withAlpha(color, 0.62))
    g.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })

/** Four-point star with a warm halo and a white core. */
const glintSprite = (color: string) =>
  createSprite(96, (ctx, s) => {
    const r = s / 2
    const halo = ctx.createRadialGradient(r, r, 0, r, r, r * 0.55)
    halo.addColorStop(0, withAlpha(color, 0.55))
    halo.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, s, s)

    ctx.translate(r, r)
    ctx.fillStyle = color
    for (const [len, waist] of [
      [r * 0.98, r * 0.09],
      [r * 0.55, r * 0.07],
    ] as const) {
      for (let i = 0; i < 4; i++) {
        ctx.save()
        ctx.rotate((i * TAU) / 4 + (len < r * 0.6 ? Math.PI / 4 : 0))
        ctx.beginPath()
        ctx.moveTo(0, -len)
        ctx.quadraticCurveTo(waist * 0.25, -waist, waist, 0)
        ctx.lineTo(-waist, 0)
        ctx.quadraticCurveTo(-waist * 0.25, -waist, 0, -len)
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.fillStyle = '#fffdf3'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.1, 0, TAU)
    ctx.fill()
  })

export const summer: SceneFactory = ({ density, colors }) => {
  const palette = colors?.length ? colors : SUN_COLORS
  const orbSprites = palette.map(orbSprite)
  const glintSprites = palette.map(glintSprite)
  const rayColor = palette[0]

  let width = 0
  let height = 0
  let orbs: Orb[] = []
  let glints: Glint[] = []
  let glintTarget = 0
  let nextGlint = 0
  const rays: Ray[] = Array.from({ length: 5 }, (_, i) => ({
    angle: 0.32 + i * 0.17 + rand(-0.04, 0.04),
    spread: rand(0.025, 0.06),
    length: rand(0.9, 1.4),
    phase: rand(0, TAU),
  }))

  const makeOrb = (initial: boolean): Orb => {
    const r = lerp(14, 70, Math.random() ** 1.5)
    return {
      x: rand(-r, width + r),
      y: initial ? rand(-r, height + r) : height + r,
      r,
      vx: rand(-5, 5),
      vy: rand(-10, -3),
      alpha: rand(0.2, 0.5),
      phase: rand(0, TAU),
      freq: rand(0.15, 0.45),
      sprite: Math.floor(Math.random() * palette.length),
    }
  }

  const makeGlint = (): Glint => ({
    x: rand(0.04, 0.96) * width,
    // Biased toward the top, where sunlight usually comes from
    y: Math.random() ** 1.4 * height * 0.9,
    size: rand(16, 36),
    age: 0,
    life: rand(1.8, 3.6),
    rot: rand(0, TAU),
    sprite: Math.floor(Math.random() * palette.length),
  })

  return {
    resize(w, h) {
      width = w
      height = h
      const target = scaledCount(18, w, h, density, 5)
      if (orbs.length > target) orbs = orbs.slice(0, target)
      while (orbs.length < target) orbs.push(makeOrb(true))
      glintTarget = scaledCount(8, w, h, density, 3)
    },

    update(dt, time) {
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i]
        o.x += (o.vx + Math.sin(time * o.freq + o.phase) * 4) * dt
        o.y += o.vy * dt
        if (o.y < -o.r * 2 || o.x < -o.r * 2 || o.x > width + o.r * 2) orbs[i] = makeOrb(false)
      }

      for (const g of glints) {
        g.age += dt
        g.rot += 0.25 * dt
      }
      glints = glints.filter((g) => g.age < g.life)

      nextGlint -= dt
      if (nextGlint <= 0 && glints.length < glintTarget) {
        glints.push(makeGlint())
        nextGlint = rand(0.2, 0.7)
      }
    },

    draw(ctx, time) {
      // Faint rays from the top-left corner
      const ox = -width * 0.05
      const oy = -height * 0.08
      const reach = Math.hypot(width, height)
      for (const ray of rays) {
        const a = ray.angle + Math.sin(time * 0.06 + ray.phase) * 0.035
        const len = reach * ray.length
        const grad = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len)
        const pulse = 0.05 + 0.025 * Math.sin(time * 0.21 + ray.phase)
        grad.addColorStop(0, withAlpha(rayColor, pulse))
        grad.addColorStop(1, withAlpha(rayColor, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(ox + Math.cos(a - ray.spread) * len, oy + Math.sin(a - ray.spread) * len)
        ctx.lineTo(ox + Math.cos(a + ray.spread) * len, oy + Math.sin(a + ray.spread) * len)
        ctx.closePath()
        ctx.fill()
      }

      for (const o of orbs) {
        ctx.globalAlpha = o.alpha * (0.6 + 0.4 * Math.sin(time * o.freq * 2 + o.phase))
        ctx.drawImage(orbSprites[o.sprite], o.x - o.r, o.y - o.r, o.r * 2, o.r * 2)
      }

      for (const g of glints) {
        const p = g.age / g.life
        const twinkle = 0.85 + 0.15 * Math.sin(g.age * 9)
        const s = g.size * Math.sin(Math.PI * p) * twinkle
        if (s <= 0.5) continue
        ctx.globalAlpha = Math.min(1, Math.sin(Math.PI * p) * 1.4)
        ctx.save()
        ctx.translate(g.x, g.y)
        ctx.rotate(g.rot)
        ctx.drawImage(glintSprites[g.sprite], -s, -s, s * 2, s * 2)
        ctx.restore()
      }
      ctx.globalAlpha = 1
    },
  }
}
