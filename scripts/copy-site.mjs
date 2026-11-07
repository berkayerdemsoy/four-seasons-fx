// Copies the built library next to the demo site so it can be deployed as a static folder.
import { cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const target = fileURLToPath(new URL('../site/lib', import.meta.url))

rmSync(target, { recursive: true, force: true })
cpSync(dist, target, { recursive: true, filter: (src) => !src.endsWith('.d.ts') })
console.log('site/lib updated')
