/**
 * Script-tag entry. Reads options from the tag's data attributes:
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/four-seasons-fx/dist/auto.js"
 *           data-four-seasons-fx data-season="auto" data-density="1"></script>
 */
import { createSeasonalEffect } from './index.js'
import type { Hemisphere, SeasonInput, SeasonalController } from './index.js'

declare global {
  interface Window {
    fourSeasonsFx?: SeasonalController
  }
}

const num = (value: string | undefined): number | undefined => {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const start = () => {
  if (window.fourSeasonsFx) return
  const data = document.querySelector<HTMLScriptElement>('script[data-four-seasons-fx]')?.dataset ?? {}
  window.fourSeasonsFx = createSeasonalEffect({
    season: (data.season as SeasonInput | undefined) ?? 'auto',
    hemisphere: (data.hemisphere as Hemisphere | undefined) ?? 'north',
    density: num(data.density),
    speed: num(data.speed),
    zIndex: num(data.zIndex),
    colors: data.colors ? data.colors.split(',').map((c) => c.trim()) : undefined,
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
