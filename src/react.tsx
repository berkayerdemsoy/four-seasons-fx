'use client'

import { useEffect, useRef } from 'react'
import { createSeasonalEffect } from './index.js'
import type { SeasonalController, SeasonalOptions } from './index.js'

export type { Hemisphere, Season, SeasonInput, SeasonalOptions } from './index.js'
export { getSeason, resolveSeason } from './index.js'

export type SeasonalEffectProps = Omit<SeasonalOptions, 'container'>

/**
 * Full-screen seasonal effect. Renders nothing itself; the canvas is attached to `document.body`.
 * Place it once, for example in the root layout.
 */
export function SeasonalEffect({
  season = 'auto',
  hemisphere = 'north',
  density = 1,
  speed = 1,
  zIndex = 30,
  colors,
  className,
  respectReducedMotion = true,
  maxPixelRatio = 2,
}: SeasonalEffectProps) {
  const controller = useRef<SeasonalController | null>(null)
  const colorKey = colors?.join('|')

  useEffect(() => {
    const fx = createSeasonalEffect({
      season,
      hemisphere,
      density,
      speed,
      zIndex,
      colors,
      className,
      respectReducedMotion,
      maxPixelRatio,
    })
    controller.current = fx
    return () => {
      fx.destroy()
      controller.current = null
    }
    // `season` is applied below without recreating the canvas; `colors` is compared by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hemisphere, density, speed, zIndex, colorKey, className, respectReducedMotion, maxPixelRatio])

  useEffect(() => {
    controller.current?.setSeason(season)
  }, [season])

  return null
}

export default SeasonalEffect
