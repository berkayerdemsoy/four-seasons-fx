// Renders assets/templates/preview.html frame by frame into scripts/.frames/.
// scripts/encode.py then turns the frames into animated WebP previews and the social PNG.
// Needs a local Chrome/Chromium: set CHROME_PATH if it is not at a common location.
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { serve } from './serve.mjs'

const FRAMES_DIR = fileURLToPath(new URL('./.frames', import.meta.url))
const FPS = 20
const SECONDS = 4
const WARM_SECONDS = 7

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!executablePath) {
  console.error('Chrome not found. Set CHROME_PATH.')
  process.exit(1)
}

const JOBS = [
  ...['winter', 'spring', 'summer', 'autumn'].map((season) => ({
    name: season,
    query: `season=${season}&w=640&h=320`,
    width: 640,
    height: 320,
    scale: 1.25,
    frames: FPS * SECONDS,
  })),
  { name: 'social', query: 'layout=social', width: 1280, height: 640, scale: 1, frames: 1 },
]

rmSync(FRAMES_DIR, { recursive: true, force: true })
const server = await serve(0)
const base = `http://127.0.0.1:${server.address().port}/assets/templates/preview.html`
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars'] })

try {
  for (const job of JOBS) {
    const page = await browser.newPage()
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: job.scale })
    await page.goto(`${base}?capture&${job.query}`, { waitUntil: 'networkidle0' })
    await page.waitForFunction('window.__ready === true')
    await page.evaluate((s) => window.__warm(s), WARM_SECONDS)

    const dir = join(FRAMES_DIR, job.name)
    mkdirSync(dir, { recursive: true })
    for (let i = 0; i < job.frames; i++) {
      await page.evaluate((dt) => window.__advance(dt), 1 / FPS)
      await page.screenshot({ path: join(dir, `${String(i).padStart(4, '0')}.png`) })
    }
    await page.close()
    console.log(`${job.name}: ${job.frames} frame(s)`)
  }
} finally {
  await browser.close()
  server.close()
}
