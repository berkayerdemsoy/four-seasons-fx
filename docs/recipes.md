# Recipes

Copy-paste setups for `seasonal-fx`. Every snippet mounts the effect once and cleans up on unmount.

- [Next.js App Router](#nextjs-app-router)
- [Next.js Pages Router](#nextjs-pages-router)
- [Vite + React](#vite--react)
- [Vue 3](#vue-3) · [Nuxt 3](#nuxt-3)
- [Svelte 5 / SvelteKit](#svelte-5--sveltekit)
- [Astro](#astro)
- [Angular](#angular)
- [WordPress, Shopify, Webflow, static HTML](#wordpress-shopify-webflow-static-html)
- [Only on certain dates](#only-on-certain-dates)
- [Only inside a hero section](#only-inside-a-hero-section)
- [Brand colors](#brand-colors)
- [Toggle button that remembers the choice](#toggle-button-that-remembers-the-choice)

## Next.js App Router

```tsx
// app/layout.tsx
import { SeasonalEffect } from 'seasonal-fx/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SeasonalEffect />
      </body>
    </html>
  )
}
```

`seasonal-fx/react` ships with `'use client'`. No `dynamic(() => ..., { ssr: false })` is needed.

## Next.js Pages Router

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app'
import { SeasonalEffect } from 'seasonal-fx/react'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <SeasonalEffect />
    </>
  )
}
```

## Vite + React

```tsx
// src/App.tsx
import { SeasonalEffect } from 'seasonal-fx/react'

export default function App() {
  return (
    <>
      <SeasonalEffect season="winter" density={1.2} />
      {/* your app */}
    </>
  )
}
```

## Vue 3

```vue
<!-- App.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { createSeasonalEffect, type SeasonalController } from 'seasonal-fx'

let fx: SeasonalController | undefined
onMounted(() => { fx = createSeasonalEffect({ season: 'auto' }) })
onBeforeUnmount(() => fx?.destroy())
</script>
```

## Nuxt 3

```ts
// plugins/seasonal-fx.client.ts
import { createSeasonalEffect } from 'seasonal-fx'

export default defineNuxtPlugin(() => {
  createSeasonalEffect()
})
```

The `.client.ts` suffix runs it in the browser only.

## Svelte 5 / SvelteKit

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { createSeasonalEffect } from 'seasonal-fx'

  let { children } = $props()

  onMount(() => {
    const fx = createSeasonalEffect()
    return () => fx.destroy()
  })
</script>

{@render children()}
```

## Astro

```astro
---
// src/layouts/Layout.astro
---
<html lang="en">
  <body>
    <slot />
    <script>
      import { createSeasonalEffect } from 'seasonal-fx'
      createSeasonalEffect()
    </script>
  </body>
</html>
```

With View Transitions, guard against double mounting:

```ts
import { createSeasonalEffect } from 'seasonal-fx'
if (!document.querySelector('canvas[data-seasonal-fx]')) createSeasonalEffect()
```

## Angular

```ts
// app.component.ts
import { AfterViewInit, Component, OnDestroy } from '@angular/core'
import { createSeasonalEffect, type SeasonalController } from 'seasonal-fx'

@Component({ selector: 'app-root', standalone: true, template: '<router-outlet />' })
export class AppComponent implements AfterViewInit, OnDestroy {
  private fx?: SeasonalController
  ngAfterViewInit() { this.fx = createSeasonalEffect() }
  ngOnDestroy() { this.fx?.destroy() }
}
```

With SSR, wrap the call in `afterNextRender(() => ...)`.

## WordPress, Shopify, Webflow, static HTML

Paste before `</body>` (WordPress: a "header and footer scripts" plugin or the theme's `footer.php`;
Shopify: `theme.liquid`; Webflow: Site settings → Custom code → Footer):

```html
<script type="module"
        src="https://cdn.jsdelivr.net/npm/seasonal-fx/dist/auto.js"
        data-seasonal-fx
        data-season="auto"
        data-density="1"></script>
```

Pin a version in production: `https://cdn.jsdelivr.net/npm/seasonal-fx@0.1/dist/auto.js`.

## Only on certain dates

Snow only in December, leaves in autumn, nothing otherwise:

```tsx
import { SeasonalEffect, getSeason } from 'seasonal-fx/react'

export function Decorations() {
  const now = new Date()
  if (now.getMonth() === 11) return <SeasonalEffect season="winter" />
  if (getSeason(now) === 'autumn') return <SeasonalEffect season="autumn" density={0.7} />
  return null
}
```

During SSR the server date is used for the first render; that is fine for month-level rules.

## Only inside a hero section

```ts
import { createSeasonalEffect } from 'seasonal-fx'

const hero = document.querySelector<HTMLElement>('#hero')!
const fx = createSeasonalEffect({ season: 'spring', container: hero, zIndex: 0 })
```

The container gets `position: relative` if it was static. The effect pauses when the section scrolls out of view.
Put the hero content above it with `position: relative; z-index: 1`.

## Brand colors

```tsx
<SeasonalEffect season="autumn" colors={['#7c3aed', '#a78bfa', '#c4b5fd']} />
<SeasonalEffect season="winter" colors={['#ffffff', '#ffe4f1']} />
```

`colors` replaces the season palette: snowflakes, leaves, petals and butterfly wings, or sun glints.

## Toggle button that remembers the choice

```tsx
'use client'
import { useEffect, useState } from 'react'
import { SeasonalEffect } from 'seasonal-fx/react'

export function SeasonalToggle() {
  const [on, setOn] = useState(true)

  useEffect(() => {
    try { setOn(localStorage.getItem('seasonal-fx') !== 'off') } catch {}
  }, [])

  const toggle = () => {
    const next = !on
    setOn(next)
    try { localStorage.setItem('seasonal-fx', next ? 'on' : 'off') } catch {}
  }

  return (
    <>
      <button type="button" onClick={toggle} aria-pressed={on}>
        {on ? 'Hide' : 'Show'} seasonal effect
      </button>
      {on && <SeasonalEffect />}
    </>
  )
}
```
