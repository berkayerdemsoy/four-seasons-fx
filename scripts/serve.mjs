// Minimal static server for the demo site and image templates. Usage: node scripts/serve.mjs [port]
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

export function serve(port = 0) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let path = normalize(join(ROOT, decodeURIComponent(url.pathname)))
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end()
      return
    }
    try {
      if (statSync(path).isDirectory()) path = join(path, 'index.html')
      statSync(path)
    } catch {
      res.writeHead(404).end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    createReadStream(path).pipe(res)
  })
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.argv[2] ?? 4173))
  const { port } = server.address()
  console.log(`Demo:      http://127.0.0.1:${port}/site/?dev`)
  console.log(`Templates: http://127.0.0.1:${port}/assets/templates/preview.html?season=winter`)
}
