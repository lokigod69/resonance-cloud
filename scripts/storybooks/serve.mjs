// Loopback-only preview for offline storybook drafts. No application/backend state.
import { createServer } from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { contentDir } from './export.mjs'

const routes = new Map([
  ['/', ['preview/index.html', 'text/html']],
  ['/reader.js', ['preview/reader.js', 'text/javascript']],
  ['/style.css', ['preview/style.css', 'text/css']],
  ['/english.json', ['english.json', 'application/json']],
  ['/spanish.json', ['spanish.json', 'application/json']],
])
const port = Number(process.env.STORYBOOK_PREVIEW_PORT || 4318)
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  const route = routes.get(url.pathname)
  if (req.method !== 'GET' || !route) { res.writeHead(404).end(); return }
  try {
    const content = await fs.readFile(path.join(contentDir, route[0]))
    res.writeHead(200, { 'Content-Type': `${route[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self'; object-src 'none'; frame-ancestors 'none'" }).end(content)
  } catch { res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Preview content is being prepared.') }
})
server.listen(port, '127.0.0.1', () => console.log(`Storybook preview: http://127.0.0.1:${port}`))
