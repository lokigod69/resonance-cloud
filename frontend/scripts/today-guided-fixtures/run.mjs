#!/usr/bin/env node
// Today/Guided fixture harness runner.
//
// 1. Builds the standalone harness page with Vite (programmatic API).
// 2. Serves dist/ from a throwaway static server.
// 3. Launches headless Chrome and drives it over CDP (pattern cribbed from
//    scripts/wave-pixel-gate/run.mjs).
// 4. Enumerates window.__fixtureList, then loads one document per fixture with
//    the right device metrics / emulated media, servicing screenshot requests
//    and collecting window.__verdict.
//
// No npm installs: node built-ins + vite/@vitejs-plugin-react/@tailwindcss-vite
// out of frontend/node_modules.
//
// Usage:
//   node scripts/today-guided-fixtures/run.mjs
//   node scripts/today-guided-fixtures/run.mjs --no-build --only=today-overview-390,today-wrong-reveal-320

import { createServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(DIR, 'dist')
const OUT = path.join(DIR, 'out')
const CONFIG = path.join(DIR, 'vite.config.mjs')
const PUBLIC = path.resolve(DIR, '../../public')

const FIXTURE_TIMEOUT_MS = 90_000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
}

function log(msg) {
  process.stdout.write(`[today-guided] ${msg}\n`)
}

async function buildHarness() {
  const { build } = await import('vite')
  await build({ configFile: CONFIG })
}

function resolveInside(rootDir, requestPath) {
  const root = path.resolve(rootDir)
  const resolved = path.resolve(root, requestPath.replace(/^[/\\]+/, ''))
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null
}

function startStaticServer(rootDir, publicDir) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      let rel = decodeURIComponent(url.pathname)
      if (rel === '/' || rel === '') rel = '/index.html'
      const candidates = [resolveInside(rootDir, rel), resolveInside(publicDir, rel)].filter(Boolean)
      if (candidates.length !== 2) {
        res.writeHead(403).end('forbidden')
        return
      }
      let file = null
      let body = null
      for (const candidate of candidates) {
        try {
          body = await fs.readFile(candidate)
          file = candidate
          break
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error
        }
      }
      if (!file || !body) {
        res.writeHead(404).end('not found')
        return
      }
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
    '/usr/bin/google-chrome',
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

  const port = await findOpenPort(9833)
  const userDataDir = path.join(DIR, `.chrome-profile-${process.pid}-${Date.now()}`)
  const resolvedUserDataDir = path.resolve(userDataDir)
  const expectedPrefix = `.chrome-profile-${process.pid}-`
  if (path.dirname(resolvedUserDataDir) !== path.resolve(DIR) || !path.basename(resolvedUserDataDir).startsWith(expectedPrefix)) {
    throw new Error(`Refusing unsafe Chrome profile path: ${resolvedUserDataDir}`)
  }
  await fs.mkdir(userDataDir, { recursive: true })

  const removeUserDataDir = () => fs.rm(resolvedUserDataDir, { recursive: true, force: true })

  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--force-color-profile=srgb',
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
    '--window-size=430,900',
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
      executable: chromePath,
      product: info.Browser,
      async dispose() {
        if (proc.exitCode === null && !proc.killed) proc.kill()
        stderrStream.end()
        await new Promise((r) => setTimeout(r, 300))
        await removeUserDataDir().catch(() => undefined)
      },
    }
  } catch (error) {
    if (proc.exitCode === null && !proc.killed) proc.kill()
    stderrStream.end()
    await removeUserDataDir().catch(() => undefined)
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
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {})
    }
  }

  send(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++
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
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, cb) {
    const set = this.listeners.get(method) ?? new Set()
    set.add(cb)
    this.listeners.set(method, set)
  }

  close() {
    this.ws?.close()
  }
}

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

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: false,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  }
  return result.result?.value
}

async function poll(cdp, expression, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    try {
      last = await evaluate(cdp, expression)
      if (predicate(last)) return last
    } catch {}
    await new Promise((r) => setTimeout(r, 120))
  }
  throw new Error(`timeout (${timeoutMs}ms) waiting for ${label}; last=${JSON.stringify(last)}`)
}

async function capture(cdp, file) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await fs.writeFile(file, Buffer.from(data, 'base64'))
}

async function main() {
  const startedAt = Date.now()
  const skipBuild = process.argv.includes('--no-build')
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean) : null

  if (skipBuild) log('skipping build (--no-build)')
  else {
    log('building harness...')
    await buildHarness()
  }

  await fs.mkdir(OUT, { recursive: true })

  const server = await startStaticServer(DIST, PUBLIC)
  log(`serving ${server.baseUrl}`)

  const chrome = await launchChrome(`${server.baseUrl}/`)
  log(`${chrome.product} @ ${chrome.executable}`)

  const target = await findPageTarget(chrome.port, server.baseUrl)
  const cdp = new CDPConnection(target.webSocketDebuggerUrl)
  await cdp.connect()

  const consoleLines = []
  cdp.on('Runtime.consoleAPICalled', (e) => {
    consoleLines.push(`console.${e.type}: ${(e.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ')}`)
  })
  cdp.on('Runtime.exceptionThrown', (e) => {
    const d = e.exceptionDetails ?? {}
    consoleLines.push(`pageerror: ${d.exception?.description ?? d.text ?? JSON.stringify(d)}`)
  })

  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Network.enable')
  // Deterministic offline typography: the app CSS @imports Google Fonts.
  await cdp.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })

  try {
    await poll(cdp, 'window.__listReady === true', (v) => v === true, 30000, 'fixture list')
  } catch (error) {
    // A module that throws at evaluation never reaches main() — surface the
    // page's own console/exception lines instead of a bare timeout.
    for (const line of consoleLines) log(`   ${line}`)
    throw error
  }
  const list = await evaluate(cdp, 'JSON.stringify(window.__fixtureList)')
  const fixtures = JSON.parse(list).filter((f) => !only || only.some((token) => f.id.startsWith(token)))
  log(`${fixtures.length} fixture(s) to run`)

  const results = []

  for (const fixture of fixtures) {
    if (fixture.notRun) {
      log(`── ${fixture.id} — ${fixture.name}`)
      log(`   NOT-RUN: ${fixture.notRun}`)
      results.push({ id: fixture.id, name: fixture.name, status: 'not-run', note: fixture.notRun, checks: [], screenshots: [] })
      continue
    }
    const fixtureStart = Date.now()
    log(`── ${fixture.id} — ${fixture.name}`)
    const shots = []
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: fixture.viewport.width,
        height: fixture.viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-reduced-motion', value: fixture.reduceMotion ? 'reduce' : 'no-preference' },
          { name: 'prefers-color-scheme', value: 'dark' },
        ],
      })

      const url = `${server.baseUrl}/?f=${encodeURIComponent(fixture.id)}`
      await cdp.send('Page.navigate', { url })
      await poll(
        cdp,
        `location.search === ${JSON.stringify(`?f=${fixture.id}`)} && document.readyState !== 'loading'`,
        (v) => v === true,
        20000,
        'document load',
      )

      // Service screenshot requests until the fixture reports done.
      const deadline = Date.now() + FIXTURE_TIMEOUT_MS
      let done = false
      while (Date.now() < deadline) {
        const state = await evaluate(cdp, 'JSON.stringify({shot: window.__shotRequest ?? null, key: window.__keyRequest ?? null, done: window.__done === true})')
        const parsed = JSON.parse(state ?? '{}')
        if (parsed.shot) {
          const file = path.join(OUT, `${fixture.id}-${parsed.shot}.png`)
          await capture(cdp, file)
          shots.push(path.basename(file))
          await evaluate(cdp, 'window.__shotRequest = null')
          continue
        }
        if (parsed.key) {
          if (parsed.key.selector) {
            await evaluate(cdp, `document.querySelector(${JSON.stringify(parsed.key.selector)})?.focus()`)
          }
          const requestedKey = parsed.key.key
          const enter = requestedKey === 'Enter'
          const keyParams = {
            key: requestedKey,
            code: requestedKey,
            windowsVirtualKeyCode: enter ? 13 : undefined,
            nativeVirtualKeyCode: enter ? 13 : undefined,
            text: enter ? '\r' : undefined,
            unmodifiedText: enter ? '\r' : undefined,
          }
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...keyParams })
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...keyParams })
          await evaluate(cdp, 'window.__keyRequest = null')
          continue
        }
        if (parsed.done) {
          done = true
          break
        }
        await new Promise((r) => setTimeout(r, 150))
      }

      const finalFile = path.join(OUT, `${fixture.id}-final.png`)
      await capture(cdp, finalFile)
      if (!shots.includes(path.basename(finalFile))) shots.push(path.basename(finalFile))

      if (!done) {
        results.push({
          id: fixture.id,
          name: fixture.name,
          status: 'fail',
          note: `harness timed out after ${FIXTURE_TIMEOUT_MS}ms without a verdict`,
          screenshots: shots,
          checks: [],
        })
        log('   TIMEOUT')
        continue
      }

      const verdictRaw = await evaluate(cdp, 'JSON.stringify(window.__verdict)')
      const verdict = JSON.parse(verdictRaw)
      const failed = (verdict.checks ?? []).filter((c) => !c.ok)
      results.push({
        id: fixture.id,
        name: fixture.name,
        status: verdict.status,
        checks: verdict.checks,
        notes: verdict.notes,
        error: verdict.error,
        failed,
        screenshots: shots,
        ms: Date.now() - fixtureStart,
      })
      log(`   ${verdict.status.toUpperCase()} (${verdict.checks.length} checks, ${failed.length} failed, ${Date.now() - fixtureStart}ms)`)
      for (const check of failed) log(`     ✗ ${check.name} :: ${check.detail}`)
      for (const note of verdict.notes ?? []) log(`     · ${note}`)
    } catch (error) {
      results.push({
        id: fixture.id,
        name: fixture.name,
        status: 'fail',
        note: `runner error: ${error?.message ?? error}`,
        screenshots: shots,
        checks: [],
      })
      log(`   RUNNER ERROR: ${error?.message ?? error}`)
    }
  }

  cdp.close()
  await chrome.dispose()
  await server.close()

  const summary = {
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    results,
  }
  await fs.writeFile(path.join(OUT, 'verdict.json'), JSON.stringify(summary, null, 2))

  const passed = results.filter((r) => r.status === 'pass').length
  log(`done: ${passed}/${results.length} passed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  log(`verdicts → ${path.join(OUT, 'verdict.json')}`)
  if (consoleLines.length) {
    const errors = consoleLines.filter((line) => line.startsWith('pageerror') || line.startsWith('console.error'))
    for (const line of errors.slice(0, 40)) process.stdout.write(`  ${line}\n`)
  }
  process.exitCode = passed === results.length ? 0 : 1
}

main().catch((error) => {
  process.stderr.write(`[today-guided] fatal: ${error?.stack ?? error}\n`)
  process.exitCode = 1
})
