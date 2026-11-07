import type { SceneFactory } from '../types.js'
import { TAU, angleDelta, clamp, easeOutBack, easeOutCubic, pick, rand, scaledCount } from '../utils.js'

/** Wing pairs: [upper, lower]. */
const WING_COLORS: readonly (readonly [string, string])[] = [
  ['#f472b6', '#f9a8d4'],
  ['#a78bfa', '#c4b5fd'],
  ['#fbbf24', '#fde68a'],
  ['#60a5fa', '#93c5fd'],
  ['#fb923c', '#fdba74'],
]

const PETAL_COLORS = ['#f9a8d4', '#fbcfe8', '#fde68a', '#c4b5fd', '#fca5a5', '#a5b4fc', '#ffffff']
const FLOWER_CENTERS = ['#f59e0b', '#fbbf24', '#b45309']
const STEM_COLOR = '#4d7c3a'
const LEAF_COLOR = '#6aa84f'

/** Right-hand wings in a unit where the body is about 12 long; mirrored for the left side. */
const UPPER_WING = 'M0.6 -2 C4 -10 12.5 -11 11.5 -4 C11 0 5.5 1.2 0.6 1 Z'
const LOWER_WING = 'M0.6 1 C6 1 9.5 5 7.5 8.6 C5.5 11.2 1.8 8.4 0.6 4 Z'

interface Butterfly {
  x: number
  y: number
  heading: number
  speed: number
  size: number
  flap: number
  flapRate: number
  turn: [number, number]
  upper: string
  lower: string
  age: number
  stay: number
  /** Seconds to wait off-screen before the next visit. */
  wait: number
}

interface Bee {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  size: number
  retarget: number
}

interface Flower {
  /** 1 grows from the left edge toward the right, -1 from the right edge. */
  side: 1 | -1
  anchorY: number
  angle: number
  stem: number
  bend: number
  petals: number
  petal: number
  color: string
  center: string
  spin: number
  sway: number
  age: number
  grow: number
  bloom: number
  hold: number
  fade: number
}

/** Point on a quadratic curve from the anchor, bent sideways by `bend`. */
const stemPoint = (f: Flower, t: number, anchorX: number): [number, number] => {
  const ex = anchorX + Math.cos(f.angle) * f.stem
  const ey = f.anchorY + Math.sin(f.angle) * f.stem
  const nx = -Math.sin(f.angle)
  const ny = Math.cos(f.angle)
  const cx = (anchorX + ex) / 2 + nx * f.bend
  const cy = (f.anchorY + ey) / 2 + ny * f.bend
  const u = 1 - t
  return [u * u * anchorX + 2 * u * t * cx + t * t * ex, u * u * f.anchorY + 2 * u * t * cy + t * t * ey]
}

export const spring: SceneFactory = ({ density, colors }) => {
  const wingPairs = colors?.length ? colors.map((c) => [c, c] as const) : WING_COLORS
  const petalColors = colors?.length ? colors : PETAL_COLORS
  const upperWing = new Path2D(UPPER_WING)
  const lowerWing = new Path2D(LOWER_WING)

  let width = 0
  let height = 0
  let butterflies: Butterfly[] = []
  let bees: Bee[] = []
  let flowers: Flower[] = []
  let flowerTarget = 0
  let nextFlower = 0.4

  const spawnButterfly = (b: Butterfly, initial: boolean) => {
    const pair = pick(wingPairs)
    const edge = Math.floor(Math.random() * 4)
    if (initial) {
      b.x = rand(0.1, 0.9) * width
      b.y = rand(0.1, 0.9) * height
    } else {
      b.x = edge === 0 ? -30 : edge === 1 ? width + 30 : rand(0, width)
      b.y = edge === 2 ? -30 : edge === 3 ? height + 30 : rand(0.1, 0.9) * height
    }
    b.heading = Math.atan2(height / 2 - b.y, width / 2 - b.x) + rand(-0.6, 0.6)
    b.speed = rand(34, 56)
    b.size = rand(13, 21)
    b.flap = rand(0, TAU)
    b.flapRate = rand(13, 18)
    b.turn = [rand(0, TAU), rand(0, TAU)]
    b.upper = pair[0]
    b.lower = pair[1]
    b.age = 0
    b.stay = rand(12, 24)
    b.wait = 0
  }

  const makeButterfly = (initial: boolean): Butterfly => {
    const b = {} as Butterfly
    spawnButterfly(b, initial)
    return b
  }

  const makeBee = (): Bee => ({
    x: rand(0.1, 0.9) * width,
    y: rand(0.2, 0.9) * height,
    vx: 0,
    vy: 0,
    tx: rand(0.1, 0.9) * width,
    ty: rand(0.2, 0.9) * height,
    size: rand(6, 8.5),
    retarget: rand(1, 3),
  })

  const makeFlower = (): Flower | null => {
    const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    // Keep some distance from flowers already on the same edge
    for (let attempt = 0; attempt < 6; attempt++) {
      const anchorY = rand(0.18, 0.97) * height
      if (flowers.some((f) => f.side === side && Math.abs(f.anchorY - anchorY) < 56)) continue
      const tilt = rand(0.15, 0.85)
      return {
        side,
        anchorY,
        angle: side === 1 ? -tilt : Math.PI + tilt,
        stem: rand(24, 58),
        bend: rand(-10, 10),
        petals: Math.random() < 0.7 ? 5 : 6,
        petal: rand(5, 8.5),
        color: pick(petalColors),
        center: pick(FLOWER_CENTERS),
        spin: rand(0, TAU),
        sway: rand(0, TAU),
        age: 0,
        grow: rand(1.1, 1.8),
        bloom: rand(0.7, 1.1),
        hold: rand(6, 11),
        fade: rand(1.4, 2),
      }
    }
    return null
  }

  const flowerHead = (f: Flower): [number, number] => stemPoint(f, 1, f.side === 1 ? 0 : width)

  return {
    resize(w, h) {
      width = w
      height = h
      const bTarget = scaledCount(5, w, h, density, 2)
      if (butterflies.length > bTarget) butterflies = butterflies.slice(0, bTarget)
      while (butterflies.length < bTarget) butterflies.push(makeButterfly(true))
      const beeTarget = scaledCount(2, w, h, density, 1)
      if (bees.length > beeTarget) bees = bees.slice(0, beeTarget)
      while (bees.length < beeTarget) bees.push(makeBee())
      flowerTarget = scaledCount(9, w, h, density, 3)
      flowers = flowers.filter((f) => f.anchorY < h)
    },

    update(dt, time) {
      const margin = 50
      for (const b of butterflies) {
        if (b.wait > 0) {
          b.wait -= dt
          if (b.wait <= 0) spawnButterfly(b, false)
          continue
        }
        b.age += dt
        b.flap += b.flapRate * dt
        b.heading += (Math.sin(time * 0.7 + b.turn[0]) * 1.3 + Math.sin(time * 1.9 + b.turn[1]) * 0.7) * dt
        const leaving = b.age > b.stay
        const outside = b.x < margin || b.x > width - margin || b.y < margin || b.y > height - margin
        if (!leaving && outside) {
          const home = Math.atan2(height / 2 - b.y, width / 2 - b.x)
          b.heading += angleDelta(b.heading, home) * 1.6 * dt
        }
        // Each wing beat gives a small lift
        const lift = Math.max(0, Math.sin(b.flap)) * 0.6
        b.x += Math.cos(b.heading) * b.speed * dt
        b.y += (Math.sin(b.heading) * b.speed - lift * 18) * dt
        if (leaving && (b.x < -60 || b.x > width + 60 || b.y < -60 || b.y > height + 60)) {
          b.wait = rand(1.5, 6)
        }
      }

      const blooming = flowers.filter((f) => f.age > f.grow + f.bloom && f.age < f.grow + f.bloom + f.hold)
      for (const bee of bees) {
        bee.retarget -= dt
        const dx = bee.tx - bee.x
        const dy = bee.ty - bee.y
        if (bee.retarget <= 0 || Math.hypot(dx, dy) < 6) {
          // Prefer an open flower, otherwise hover somewhere new
          if (blooming.length && Math.random() < 0.7) {
            const [hx, hy] = flowerHead(pick(blooming))
            bee.tx = hx
            bee.ty = hy - 6
          } else {
            bee.tx = rand(0.1, 0.9) * width
            bee.ty = rand(0.2, 0.9) * height
          }
          bee.retarget = rand(1.5, 3.5)
        }
        bee.vx += (dx * 1.6 - bee.vx * 1.8) * dt
        bee.vy += (dy * 1.6 - bee.vy * 1.8) * dt
        bee.x += (bee.vx + Math.sin(time * 23 + bee.size) * 14) * dt
        bee.y += (bee.vy + Math.cos(time * 19 + bee.size) * 12) * dt
      }

      for (const f of flowers) f.age += dt
      flowers = flowers.filter((f) => f.age < f.grow + f.bloom + f.hold + f.fade)
      nextFlower -= dt
      if (nextFlower <= 0 && flowers.length < flowerTarget) {
        const f = makeFlower()
        if (f) flowers.push(f)
        nextFlower = rand(0.7, 2.2)
      }
    },

    draw(ctx, time) {
      for (const f of flowers) drawFlower(ctx, f, time, f.side === 1 ? 0 : width)
      for (const bee of bees) drawBee(ctx, bee, time)
      for (const b of butterflies) if (b.wait <= 0) drawButterfly(ctx, b, upperWing, lowerWing)
    },
  }
}

const drawFlower = (ctx: CanvasRenderingContext2D, f: Flower, time: number, anchorX: number) => {
  const g = easeOutCubic(clamp(f.age / f.grow))
  const b = easeOutBack(clamp((f.age - f.grow) / f.bloom))
  const fade = clamp((f.age - f.grow - f.bloom - f.hold) / f.fade)

  ctx.save()
  ctx.globalAlpha = 1 - fade
  // Sway and, while fading, a slight droop toward the ground
  ctx.translate(anchorX, f.anchorY)
  ctx.rotate(Math.sin(time * 1.1 + f.sway) * 0.06 * g + f.side * fade * 0.35)
  ctx.translate(-anchorX, -f.anchorY)

  ctx.strokeStyle = STEM_COLOR
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(anchorX, f.anchorY)
  const steps = 14
  for (let i = 1; i <= steps; i++) {
    const [x, y] = stemPoint(f, (i / steps) * g, anchorX)
    ctx.lineTo(x, y)
  }
  ctx.stroke()

  const leafGrow = easeOutCubic(clamp((g - 0.45) / 0.4))
  if (leafGrow > 0) {
    const [lx, ly] = stemPoint(f, 0.42, anchorX)
    ctx.save()
    ctx.translate(lx, ly)
    ctx.rotate(f.angle - f.side * 0.9)
    ctx.scale(leafGrow, leafGrow)
    ctx.fillStyle = LEAF_COLOR
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(5, -4.5, 11, 0)
    ctx.quadraticCurveTo(5, 4.5, 0, 0)
    ctx.fill()
    ctx.restore()
  }

  if (b > 0) {
    const [hx, hy] = stemPoint(f, g, anchorX)
    const s = b * (1 - fade * 0.3)
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(f.spin + time * 0.05)
    ctx.fillStyle = f.color
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)'
    ctx.lineWidth = 0.6
    for (let i = 0; i < f.petals; i++) {
      ctx.save()
      ctx.rotate((i * TAU) / f.petals)
      ctx.beginPath()
      ctx.ellipse(f.petal * 0.62 * s, 0, f.petal * 0.58 * s, f.petal * 0.34 * s, 0, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = f.center
    ctx.beginPath()
    ctx.arc(0, 0, f.petal * 0.3 * s, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

const drawBee = (ctx: CanvasRenderingContext2D, bee: Bee, time: number) => {
  const s = bee.size
  ctx.save()
  ctx.translate(bee.x, bee.y)
  // Head faces the direction of travel and dips when descending
  if (bee.vx < 0) ctx.scale(-1, 1)
  ctx.rotate(clamp(bee.vy / 150, -0.4, 0.4))

  // Wings flicker between two states
  const open = Math.sin(time * 60 + s) > 0
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.strokeStyle = 'rgba(80, 100, 130, 0.35)'
  ctx.lineWidth = 0.5
  for (const dir of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(dir * s * 0.28, -s * 0.5, s * 0.32, open ? s * 0.5 : s * 0.38, dir * 0.5, 0, TAU)
    ctx.fill()
    ctx.stroke()
  }

  ctx.fillStyle = '#f6c343'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.62, s * 0.42, 0, 0, TAU)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = '#2b1d12'
  for (const x of [-0.12, 0.2]) ctx.fillRect(x * s, -s, s * 0.14, s * 2)
  ctx.restore()
  ctx.fillStyle = '#2b1d12'
  ctx.beginPath()
  ctx.arc(s * 0.6, -s * 0.04, s * 0.2, 0, TAU)
  ctx.fill()
  ctx.restore()
}

const drawButterfly = (ctx: CanvasRenderingContext2D, b: Butterfly, upper: Path2D, lower: Path2D) => {
  const unit = b.size / 22
  // Wing span narrows on the upstroke; never fully closed so the shape stays readable
  const open = 0.22 + 0.78 * Math.abs(Math.cos(b.flap))
  ctx.save()
  ctx.translate(b.x, b.y)
  ctx.rotate(b.heading + Math.PI / 2)
  ctx.scale(unit, unit)

  ctx.strokeStyle = 'rgba(40, 20, 30, 0.3)'
  ctx.lineWidth = 0.5
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.scale(side * open, 1)
    ctx.fillStyle = b.upper
    ctx.fill(upper)
    ctx.stroke(upper)
    ctx.fillStyle = b.lower
    ctx.fill(lower)
    ctx.stroke(lower)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.arc(7.6, -5.2, 1.3, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = '#3b2a20'
  ctx.beginPath()
  ctx.ellipse(0, 1.2, 0.95, 6, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#3b2a20'
  ctx.lineWidth = 0.55
  ctx.beginPath()
  ctx.moveTo(-0.3, -4.4)
  ctx.quadraticCurveTo(-1.2, -7, -2.6, -8.6)
  ctx.moveTo(0.3, -4.4)
  ctx.quadraticCurveTo(1.2, -7, 2.6, -8.6)
  ctx.stroke()
  ctx.restore()
}
