import type { SceneFactory } from '../types.js'
import { TAU, lerp, pick, rand, scaledCount, wind } from '../utils.js'

/** Maple red, burnt orange, amber, ochre, brown. */
const LEAF_COLORS = ['#c2410c', '#ea580c', '#d97706', '#b45309', '#a16207', '#92400e', '#b91c1c']

/** Leaf outlines in a 0..100 box, centered at (50, 50). */
const LEAF_PATHS = [
  // Maple
  'M50 2 L57 22 L72 14 L67 34 L90 30 L76 46 L92 56 L68 60 L72 78 L55 68 L52 98 L48 98 L45 68 L28 78 L32 60 L8 56 L24 46 L10 30 L33 34 L28 14 L43 22 Z',
  // Beech
  'M50 4 C78 18 86 52 50 96 C14 52 22 18 50 4 Z',
  // Oak
  'M50 4 C60 10 54 20 64 22 C76 24 66 36 76 40 C88 46 72 54 78 62 C84 72 64 70 60 80 C56 90 52 96 50 98 C48 96 44 90 40 80 C36 70 16 72 22 62 C28 54 12 46 24 40 C34 36 24 24 36 22 C46 20 40 10 50 4 Z',
]

const VEIN_PATH = 'M50 10 L50 96'

interface Leaf {
  x: number
  y: number
  z: number
  size: number
  vy: number
  swayAmp: number
  swayFreq: number
  phase: number
  rot: number
  vRot: number
  flipFreq: number
  color: string
  shape: number
  alpha: number
}

export const autumn: SceneFactory = ({ density, colors }) => {
  const palette = colors?.length ? colors : LEAF_COLORS
  const shapes = LEAF_PATHS.map((d) => new Path2D(d))
  const vein = new Path2D(VEIN_PATH)

  let width = 0
  let height = 0
  let leaves: Leaf[] = []

  const make = (initial: boolean): Leaf => {
    const z = Math.random()
    return {
      x: rand(0, width),
      y: initial ? rand(-height, height) : rand(-120, -40),
      z,
      size: lerp(13, 30, z),
      vy: lerp(26, 58, z) * rand(0.85, 1.15),
      swayAmp: rand(20, 60),
      swayFreq: rand(0.4, 1.1),
      phase: rand(0, TAU),
      rot: rand(0, TAU),
      vRot: rand(-1.2, 1.2),
      flipFreq: rand(0.6, 1.8),
      color: pick(palette),
      shape: Math.floor(Math.random() * shapes.length),
      alpha: lerp(0.55, 0.92, z),
    }
  }

  return {
    resize(w, h) {
      width = w
      height = h
      const target = scaledCount(24, w, h, density, 6)
      if (leaves.length > target) leaves = leaves.slice(0, target)
      while (leaves.length < target) leaves.push(make(true))
      leaves.sort((a, b) => a.z - b.z)
    },

    update(dt, time) {
      const gust = wind(time) * 1.4
      for (let i = 0; i < leaves.length; i++) {
        const l = leaves[i]
        l.y += l.vy * dt
        l.rot += l.vRot * dt
        // Horizontal drift follows the sway derivative so leaves glide side to side
        l.x += (Math.cos(time * l.swayFreq + l.phase) * l.swayAmp * l.swayFreq * 0.6 + gust * (0.4 + l.z)) * dt
        if (l.y - l.size > height || l.x < -120 || l.x > width + 120) {
          const next = make(false)
          leaves[i] = { ...next, z: l.z, size: l.size, vy: l.vy, alpha: l.alpha }
        }
      }
    },

    draw(ctx, time) {
      for (const l of leaves) {
        // Tumble: squash one axis; the back of the leaf is slightly darker
        const flip = Math.cos(time * l.flipFreq + l.phase)
        const scale = l.size / 100
        ctx.save()
        ctx.globalAlpha = l.alpha
        ctx.translate(l.x + Math.sin(time * l.swayFreq + l.phase) * l.swayAmp * 0.3, l.y)
        ctx.rotate(l.rot)
        ctx.scale(scale * (0.3 + 0.7 * Math.abs(flip)), scale)
        ctx.translate(-50, -50)
        ctx.fillStyle = l.color
        ctx.fill(shapes[l.shape])
        if (flip < 0) {
          ctx.fillStyle = 'rgba(40, 15, 0, 0.16)'
          ctx.fill(shapes[l.shape])
        }
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)'
        ctx.lineWidth = 3
        ctx.stroke(vein)
        ctx.restore()
      }
    },
  }
}
