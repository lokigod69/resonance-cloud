#!/usr/bin/env node
// wave-pixel-gate runner.
//
// 1. Builds the standalone harness page with Vite (programmatic API).
// 2. Serves dist/ from a throwaway static server.
// 3. Launches headless Chrome (CDP pattern cribbed from scripts/perf/benchmark.mjs).
// 4. Polls Runtime.evaluate for the #result JSON, prints it, exits 1 on failure.
//
// No npm installs: only node built-ins + vite/@vitejs-plugin-react from
// frontend/node_modules.

import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(DIR, 'dist')
const CONFIG = path.join(DIR, 'vite.config.mjs')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

async function buildHarness() {
  const { build } = await import('vite')
  await build({ configFile: CONFIG })
}

function startStaticServer(rootDir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      let rel = decodeURIComponent(url.pathname)
      if (rel === '/' || rel === '') rel = '/index.html'
      const file = path.join(rootDir, rel)
      if (!file.startsWith(rootDir)) {
        res.writeHead(403).end('forbidden')
        return
      }
      const body = await fs.readFile(file)
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections?.()
            server.close(done)
          }),
      })
    })
  })
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean)
  return candidates.find((c) => existsSync(c)) ?? null
}

async function findOpenPort(start) {
  for (let port = start; port < start + 200; port++) {
    const free = await new Promise((resolve) => {
      const probe = createNetServer()
      probe.once('error', () => resolve(false))
      probe.once('listening', () => probe.close(() => resolve(true)))
      probe.listen(port, '127.0.0.1')
    })
    if (free) return port
  }
  throw new Error(`No open port found starting at ${start}`)
}

async function waitForBrowser(versionUrl) {
  const deadline = Date.now() + 20000
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(versionUrl)
      if (response.ok) return response.json()
    } catch (error) {
      lastError = error
    }
    await new Promise((r) => setTimeout(r, 120))
  }
  throw new Error(`Chrome DevTools never became ready: ${lastError}`)
}

async function launchChrome(pageUrl) {
  const chromePath = findChrome()
  if (!chromePath) throw new Error('Could not find Chrome or Edge. Set CHROME_PATH.')

  const port = await findOpenPort(9333)
  const userDataDir = path.join(DIR, `.chrome-profile-${process.pid}-${Date.now()}`)
  await fs.mkdir(userDataDir, { recursive: true })

  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--force-color-profile=srgb',
    '--disable-lcd-text',
    '--hide-scrollbars',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-component-update',
    '--no-default-browser-check',
    '--no-first-run',
    '--mute-audio',
    '--window-size=1200,1000',
    pageUrl,
  ]

  const stderrPath = path.join(DIR, 'chrome-launch.stderr.log')
  const stderrStream = createWriteStream(stderrPath, { flags: 'w' })
  const proc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  proc.stderr?.pipe(stderrStream)

  try {
    const info = await Promise.race([
      waitForBrowser(`http://127.0.0.1:${port}/json/version`),
      new Promise((_, reject) => proc.once('error', reject)),
      new Promise((_, reject) =>
        proc.once('exit', (code, signal) =>
          reject(new Error(`Chrome exited early (code=${code}, signal=${signal}, stderr=${stderrPath})`)),
        ),
      ),
    ])
    return {
      proc,
      port,
      userDataDir,
      executable: chromePath,
      product: info.Browser,
      webSocketDebuggerUrl: info.webSocketDebuggerUrl,
      async dispose() {
        if (proc.exitCode === null && !proc.killed) proc.kill()
        stderrStream.end()
        await new Promise((r) => setTimeout(r, 300))
        await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
      },
    }
  } catch (error) {
    if (proc.exitCode === null && !proc.killed) proc.kill()
    stderrStream.end()
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

class CDPConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.addEventListener('open', () => resolve())
      this.ws.addEventListener('error', reject, { once: true })
      this.ws.addEventListener('message', (event) => this.handleMessage(event.data))
      this.ws.addEventListener('close', () => {
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('CDP connection closed'))
        }
        this.pending.clear()
      })
    })
  }

  handleMessage(raw) {
    const message = JSON.parse(raw)
    if (message.id) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(`${message.error.message}: ${message.error.data ?? ''}`))
      else pending.resolve(message.result)
      return
    }
    if (message.method) {
      const key = `${message.sessionId ?? 'browser'}:${message.method}`
      for (const listener of this.listeners.get(key) ?? []) listener(message.params ?? {})
    }
  }

  send(method, params = {}, sessionId = null, timeoutMs = 20000) {
    const id = this.nextId++
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timeout after ${timeoutMs}ms: ${method}`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })
      this.ws.send(JSON.stringify(payload))
    })
  }

  on(sessionId, method, cb) {
    const key = `${sessionId ?? 'browser'}:${method}`
    const set = this.listeners.get(key) ?? new Set()
    set.add(cb)
    this.listeners.set(key, set)
  }

  close() {
    this.ws?.close()
  }
}

function log(msg) {
  process.stdout.write(`[wave-pixel-gate] ${msg}\n`)
}

// Attach straight to the page target's own websocket (no Target.createTarget,
// no flattened session): fewer moving parts, and the browser-level endpoint
// stays out of the way.
async function findPageTarget(port, urlPrefix) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.url.startsWith(urlPrefix))
      if (page?.webSocketDebuggerUrl) return page
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('page target never appeared')
}

async function main() {
  const startedAt = Date.now()
  const skipBuild = process.argv.includes('--no-build')

  if (skipBuild) {
    log('skipping build (--no-build)')
  } else {
    log('building harness...')
    await buildHarness()
  }

  const server = await startStaticServer(DIST)
  log(`serving ${server.baseUrl}`)

  const chrome = await launchChrome(server.baseUrl)
  log(`${chrome.product} @ ${chrome.executable}`)

  const page = await findPageTarget(chrome.port, server.baseUrl)
  log(`attached to page target ${page.id}`)

  const cdp = new CDPConnection(page.webSocketDebuggerUrl)
  await cdp.connect()

  const consoleLines = []
  cdp.on(null, 'Runtime.consoleAPICalled', (e) => {
    consoleLines.push(`console.${e.type}: ${(e.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ')}`)
  })
  cdp.on(null, 'Runtime.exceptionThrown', (e) => {
    const d = e.exceptionDetails ?? {}
    consoleLines.push(`pageerror: ${d.exception?.description ?? d.text ?? JSON.stringify(d)}`)
  })
  await cdp.send('Runtime.enable')
  log('Runtime.enable ok — polling for #result')

  const deadline = Date.now() + 600000
  let blob = null
  let polls = 0
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000))
    polls += 1
    let res
    try {
      res = await cdp.send(
        'Runtime.evaluate',
        {
          expression: "(document.getElementById('result')||{}).textContent || ''",
          returnByValue: true,
        },
        null,
        30000,
      )
    } catch (error) {
      // A blocked renderer main thread shows up here as a per-call timeout.
      log(`poll ${polls}: ${error.message}`)
      continue
    }
    const text = res?.result?.value
    if (typeof text === 'string' && text.trim().length) {
      blob = text
      break
    }
    if (polls % 15 === 0) log(`poll ${polls}: still empty (${((Date.now() - startedAt) / 1000).toFixed(0)}s)`)
  }

  cdp.close()
  await chrome.dispose()
  await server.close()

  if (consoleLines.length) {
    log('page messages:')
    for (const line of consoleLines) process.stdout.write(`  ${line}\n`)
  }

  if (!blob) {
    log('TIMED OUT waiting for #result')
    process.exitCode = 1
    return
  }

  process.stdout.write(`[wave-pixel-gate] result (${((Date.now() - startedAt) / 1000).toFixed(1)}s):\n`)
  process.stdout.write(blob + '\n')

  let parsed
  try {
    parsed = JSON.parse(blob)
  } catch {
    process.stdout.write('[wave-pixel-gate] result was not valid JSON\n')
    process.exitCode = 1
    return
  }

  process.stdout.write(`[wave-pixel-gate] VERDICT: ${parsed.pass ? 'PASS' : 'FAIL'}\n`)
  process.exitCode = parsed.pass ? 0 : 1
}

main().catch((error) => {
  process.stderr.write(`[wave-pixel-gate] fatal: ${error?.stack ?? error}\n`)
  process.exitCode = 1
})
