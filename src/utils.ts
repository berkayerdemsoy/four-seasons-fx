export const TAU = Math.PI * 2

export const rand = (min: number, max: number): number => min + Math.random() * (max - min)

export const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value))

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2

export const easeOutBack = (t: number): number => {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}

/** Shortest signed difference between two angles, in radians. */
export const angleDelta = (from: number, to: number): number => {
  let d = (to - from) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

/**
 * Particle count for a viewport relative to a 1440 x 900 reference.
 * The square root keeps phones from looking empty while still lowering the cost.
 */
export const scaledCount = (base: number, width: number, height: number, density: number, min = 3): number => {
  const area = (width * height) / (1440 * 900)
  return Math.max(min, Math.round(base * density * Math.min(1.25, Math.sqrt(area))))
}

/** Slowly varying horizontal wind in px/s. */
export const wind = (time: number): number => Math.sin(time * 0.11) * 14 + Math.sin(time * 0.37 + 1.3) * 6

/** Pre-renders a square sprite once so per-frame drawing is a single drawImage call. */
export const createSprite = (
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) paint(ctx, size)
  return canvas
}

/** Converts `#rrggbb` to `rgba(r, g, b, a)`. Other formats are returned unchanged. */
export const withAlpha = (color: string, alpha: number): string => {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (!hex) return color
  const n = parseInt(hex[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
