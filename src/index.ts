import { autumn } from './scenes/autumn.js'
import { spring } from './scenes/spring.js'
import { summer } from './scenes/summer.js'
import { winter } from './scenes/winter.js'
import type { Hemisphere, Scene, SceneFactory, SceneOptions, Season, SeasonInput } from './types.js'

export type { Hemisphere, Scene, SceneFactory, SceneOptions, Season, SeasonInput } from './types.js'

export const SEASONS: readonly Season[] = ['winter', 'spring', 'summer', 'autumn']

const FACTORIES: Record<Season, SceneFactory> = { winter, spring, summer, autumn }

const OPPOSITE: Record<Season, Season> = { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }

export interface SeasonalOptions extends SceneOptions {
  /** Which effect to show. Default `auto`: picked from today's date and `hemisphere`. */
  season?: SeasonInput
  /** Used by `auto`. Default `north`. */
  hemisphere?: Hemisphere
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** z-index of the canvas. Default 30, which keeps it under most sticky headers and modals. */
  zIndex?: number
  /**
   * Element to fill. Default: the whole viewport (a fixed canvas on `document.body`).
   * A statically positioned container is switched to `position: relative`.
   */
  container?: HTMLElement
  /** Class added to the canvas. */
  className?: string
  /** Render nothing while the user prefers reduced motion. Default true. */
  respectReducedMotion?: boolean
  /** Upper bound for devicePixelRatio, trading sharpness for speed. Default 2. */
  maxPixelRatio?: number
}

export interface SeasonalController {
  /** The season currently drawn. */
  readonly season: Season
  /** Cross-fades to another season. */
  setSeason(season: SeasonInput): void
  pause(): void
  resume(): void
  /** Stops the animation and removes the canvas. */
  destroy(): void
}

/** Meteorological seasons: winter is Dec-Feb in the north and Jun-Aug in the south. */
export function getSeason(date: Date = new Date(), hemisphere: Hemisphere = 'north'): Season {
  const m = date.getMonth()
  const north: Season = m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
  return hemisphere === 'south' ? OPPOSITE[north] : north
}

export function resolveSeason(input: SeasonInput = 'auto', hemisphere: Hemisphere = 'north', date?: Date): Season {
  if (input === 'fall') return 'autumn'
  if ((SEASONS as readonly string[]).includes(input)) return input as Season
  return getSeason(date, hemisphere)
}

/**
 * Low-level access for drawing a season into your own canvas (video export, OG images, games).
 * Call `resize` before the first `update`.
 */
export function createScene(season: SeasonInput, options: SceneOptions = {}): Scene {
  return FACTORIES[resolveSeason(season)]({ density: options.density ?? 1, colors: options.colors })
}

const FADE_MS = 400

const noop: SeasonalController = {
  season: 'winter',
  setSeason() {},
  pause() {},
  resume() {},
  destroy() {},
}

/**
 * Adds a full-screen (or container-sized) canvas that animates a seasonal effect.
 * Safe to call during SSR: it returns a no-op controller when `window` is missing.
 */
export function createSeasonalEffect(options: SeasonalOptions = {}): SeasonalController {
  if (typeof window === 'undefined' || typeof document === 'undefined') return noop

  const {
    hemisphere = 'north',
    density = 1,
    speed = 1,
    zIndex = 30,
    container,
    className,
    colors,
    respectReducedMotion = true,
    maxPixelRatio = 2,
  } = options

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return noop

  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('data-seasonal-fx', '')
  if (className) canvas.className = className
  Object.assign(canvas.style, {
    position: container ? 'absolute' : 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: String(zIndex),
    transition: `opacity ${FADE_MS}ms ease`,
  })

  const host = container ?? document.body
  if (container && getComputedStyle(container).position === 'static') container.style.position = 'relative'
  host.appendChild(canvas)

  let season = resolveSeason(options.season, hemisphere)
  let scene = FACTORIES[season]({ density, colors })
  let width = 0
  let height = 0
  let raf = 0
  let last = 0
  let time = 0
  let userPaused = false
  let offscreen = false
  let fadeTimer: ReturnType<typeof setTimeout> | undefined

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const blocked = () => userPaused || offscreen || document.hidden || (respectReducedMotion && motion.matches)

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio)
    width = container ? container.clientWidth : window.innerWidth
    height = container ? container.clientHeight : window.innerHeight
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    scene.resize(width, height)
  }

  const frame = (now: number) => {
    // Clamp so a long frame does not teleport particles
    const dt = Math.min((now - last) / 1000, 0.05) * speed
    last = now
    time += dt
    scene.update(dt, time)
    ctx.clearRect(0, 0, width, height)
    scene.draw(ctx, time)
    raf = requestAnimationFrame(frame)
  }

  const sync = () => {
    cancelAnimationFrame(raf)
    raf = 0
    if (blocked()) {
      if (respectReducedMotion && motion.matches) ctx.clearRect(0, 0, width, height)
      return
    }
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  let resizeObserver: ResizeObserver | undefined
  let intersection: IntersectionObserver | undefined
  if (container) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    intersection = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting
      sync()
    })
    intersection.observe(container)
  } else {
    window.addEventListener('resize', resize)
  }
  document.addEventListener('visibilitychange', sync)
  motion.addEventListener('change', sync)

  resize()
  sync()

  return {
    get season() {
      return season
    },
    setSeason(input) {
      const next = resolveSeason(input, hemisphere)
      if (next === season) return
      season = next
      clearTimeout(fadeTimer)
      canvas.style.opacity = '0'
      fadeTimer = setTimeout(() => {
        scene = FACTORIES[season]({ density, colors })
        scene.resize(width, height)
        canvas.style.opacity = '1'
      }, FADE_MS)
    },
    pause() {
      userPaused = true
      sync()
    },
    resume() {
      userPaused = false
      sync()
    },
    destroy() {
      cancelAnimationFrame(raf)
      clearTimeout(fadeTimer)
      resizeObserver?.disconnect()
      intersection?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
      canvas.remove()
    },
  }
}
