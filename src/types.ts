export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

/** `fall` is an alias of `autumn`; `auto` picks the season from the current date. */
export type SeasonInput = Season | 'fall' | 'auto'

export type Hemisphere = 'north' | 'south'

export interface SceneOptions {
  /** Particle count multiplier. 1 is the default look, 0.5 is calmer, 2 is busy. */
  density?: number
  /** Replaces the scene's default palette. */
  colors?: readonly string[]
}

/**
 * A scene owns its particles and draws them into a 2D context sized in CSS pixels.
 * `dt` and `time` are in seconds; the caller scales them for speed.
 */
export interface Scene {
  resize(width: number, height: number): void
  update(dt: number, time: number): void
  draw(ctx: CanvasRenderingContext2D, time: number): void
}

export type SceneFactory = (options: Required<Pick<SceneOptions, 'density'>> & SceneOptions) => Scene
