import type { SceneFactory } from '../types.js'
import { TAU, createSprite, lerp, rand, scaledCount, wind, withAlpha } from '../utils.js'

const SNOW_COLORS = ['#ffffff', '#f3f8ff', '#e6efff']

interface Flake {
  x: number
  y: number
  /** Depth: 0 is far (small, slow, faint), 1 is near. */
  z: number
  size: number
  vy: number
  swayAmp: number
  swayFreq: number
  phase: number
  rot: number
  vRot: number
  alpha: number
  crystal: boolean
  sprite: number
}

/** Soft dot with a faint cool rim so white snow stays visible on light backgrounds. */
const dotSprite = (color: string) =>
  createSprite(48, (ctx, s) => {
    const r = s / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, color)
    g.addColorStop(0.42, color)
    g.addColorStop(0.58, 'rgba(110, 140, 195, 0.45)')
    g.addColorStop(1, 'rgba(120, 150, 200, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
  })

/** Six-armed crystal with two branches per arm. */
const crystalSprite = (color: string) =>
  createSprite(96, (ctx, s) => {
    const r = s / 2
    ctx.translate(r, r)
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineWidth = s * 0.045
    ctx.shadowColor = 'rgba(90, 120, 170, 0.5)'
    ctx.shadowBlur = s * 0.04
    const arm = r * 0.82
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((i * TAU) / 6)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -arm)
      for (const at of [0.45, 0.7]) {
        const len = arm * (at === 0.45 ? 0.3 : 0.2)
        ctx.moveTo(0, -arm * at)
        ctx.lineTo(-len * 0.75, -arm * at - len * 0.75)
        ctx.moveTo(0, -arm * at)
        ctx.lineTo(len * 0.75, -arm * at - len * 0.75)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = withAlpha(color, 0.9)
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.05, 0, TAU)
    ctx.fill()
  })

export const winter: SceneFactory = ({ density, colors }) => {
  const palette = colors?.length ? colors : SNOW_COLORS
  const dots = palette.map(dotSprite)
  const crystals = palette.map(crystalSprite)

  let width = 0
  let height = 0
  let flakes: Flake[] = []

  const make = (initial: boolean): Flake => {
    const z = Math.random() ** 1.6
    const crystal = z > 0.62 && Math.random() < 0.28
    return {
      x: rand(-20, width + 20),
      y: initial ? rand(-height, height) : rand(-60, -10),
      z,
      size: crystal ? lerp(13, 24, z) : lerp(3, 11, z),
      vy: lerp(14, 62, z) * rand(0.85, 1.15),
      swayAmp: rand(8, 26),
      swayFreq: rand(0.3, 0.9),
      phase: rand(0, TAU),
      rot: rand(0, TAU),
      vRot: rand(-0.6, 0.6),
      alpha: lerp(0.35, 1, z),
      crystal,
      sprite: Math.floor(Math.random() * palette.length),
    }
  }

  return {
    resize(w, h) {
      width = w
      height = h
      const target = scaledCount(150, w, h, density, 20)
      if (flakes.length > target) flakes = flakes.slice(0, target)
      while (flakes.length < target) flakes.push(make(true))
      flakes.sort((a, b) => a.z - b.z)
    },

    update(dt, time) {
      const gust = wind(time)
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i]
        f.y += f.vy * dt
        f.x += (gust * (0.35 + f.z) + Math.cos(time * f.swayFreq + f.phase) * f.swayAmp * f.swayFreq) * dt
        f.rot += f.vRot * dt
        if (f.x < -30) f.x += width + 60
        else if (f.x > width + 30) f.x -= width + 60
        // Recycle in place so the depth order stays sorted
        if (f.y - f.size > height) {
          f.y = rand(-60, -10)
          f.x = rand(-20, width + 20)
        }
      }
    },

    draw(ctx) {
      for (const f of flakes) {
        ctx.globalAlpha = f.alpha
        if (f.crystal) {
          ctx.save()
          ctx.translate(f.x, f.y)
          ctx.rotate(f.rot)
          ctx.drawImage(crystals[f.sprite], -f.size / 2, -f.size / 2, f.size, f.size)
          ctx.restore()
        } else {
          ctx.drawImage(dots[f.sprite], f.x - f.size / 2, f.y - f.size / 2, f.size, f.size)
        }
      }
      ctx.globalAlpha = 1
    },
  }
}
