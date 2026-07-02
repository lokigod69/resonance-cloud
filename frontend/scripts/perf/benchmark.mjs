#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { promises as fs } from 'node:fs'
import { createWriteStream, existsSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_RUNS,
  ROUTES,
  basename,
  bytesToKiB,
  bytesToMiB,
  classifyChunkName,
  compactCounts,
  groupPackageFromSource,
  roundMetric,
  sourceIncludes,
  summarizeAllRuns,
  summarizeRouteRuns,
  toMarkdownTable,
} from './perf-lib.mjs'
import {
  makeBenchmarkAuthInjectionScript,
  prepareBenchmarkAuth,
} from './perf-auth.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
const BUILD_DIR = path.join(SCRIPT_DIR, 'dist')
const RESULTS_DIR = path.join(SCRIPT_DIR, 'results')
const DEFAULT_PORT = 4179
const DEFAULT_ROUTE_TIMEOUT_MS = 12000

const IMPORTANT_ENTRY_SOURCES = [
  'src/App.tsx',
  'src/pages/LandingPage.tsx',
  'src/pages/Login.tsx',
  'src/components/ui/LingwaveLoader.tsx',
  'src/components/layout/AppLayout.tsx',
  'src/components/layout/PolishGlassLayout.tsx',
  'src/components/ProfileModal.tsx',
  'src/components/RedeemCodeDialog.tsx',
  'src/contexts/ThemeProvider.tsx',
  'src/contexts/SkinProvider.tsx',
  'src/contexts/LanguageProvider.tsx',
  'src/hooks/useAuth.ts',
]

const ROUTE_CHUNK_MATCHERS = {
  '/dashboard': ['src/pages/Dashboard.tsx', 'src/pages/DashboardPG.tsx'],
  '/today': ['src/pages/Today.tsx'],
  '/categories': ['src/pages/categories/CategoryListPage.tsx'],
  '/games': ['src/pages/GamesHub.tsx'],
  '/decks': ['src/pages/Decks.tsx', 'src/pages/DecksPG.tsx'],
  '/generate': ['src/pages/Generate.tsx', 'src/pages/GenerateGO.tsx'],
  '/study': ['src/pages/StudyModeSelector.tsx'],
  '/study/video': ['src/pages/Study.tsx', 'src/pages/StudyPG.tsx'],
  '/study/image': ['src/pages/StudyImage.tsx', 'src/pages/StudyImagePG.tsx'],
  '/study/flashcard': ['src/pages/StudyFlashcard.tsx'],
  '/study/audio': ['src/pages/StudyAudio.tsx'],
  '/music': ['src/pages/Music.tsx', 'src/pages/MusicPG.tsx'],
  '/speak': ['src/pages/Speak.tsx'],
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
}

const PERF_INSTRUMENTATION = `
(() => {
  if (window.__routePerfInstalled) return;
  window.__routePerfInstalled = true;

  const state = {
    startedAt: performance.now(),
    previousHref: location.href,
    expectedPath: location.pathname,
    routePaintAt: null,
    routeReason: null,
    routeTextLength: 0,
    lastTextLength: 0,
    observerTarget: null,
  };

  function pickTarget() {
    return document.querySelector('#root main')
      || document.querySelector('#root [role="main"]')
      || document.querySelector('#root')
      || document.body;
  }

  function textLength() {
    const target = pickTarget();
    return (target?.innerText || '').replace(/\\s+/g, ' ').trim().length;
  }

  function mark(reason) {
    const len = textLength();
    state.lastTextLength = len;
    if (state.routePaintAt || len < 20) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const settledLen = textLength();
        state.lastTextLength = settledLen;
        if (state.routePaintAt || settledLen < 20) return;
        state.routePaintAt = performance.now();
        state.routeReason = reason;
        state.routeTextLength = settledLen;
        try {
          performance.mark('route-content-rendered');
        } catch {
          // Marking is best effort; the benchmark also reads this state directly.
        }
      });
    });
  }

  function installObserver() {
    const target = pickTarget();
    if (!target) {
      window.setTimeout(installObserver, 10);
      return;
    }

    state.observerTarget = target.tagName ? target.tagName.toLowerCase() : 'unknown';
    const observer = new MutationObserver(() => mark('mutation'));
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    state.observer = observer;
    mark('initial');
  }

  window.__routePerfReset = (expectedPath) => {
    state.startedAt = performance.now();
    state.previousHref = location.href;
    state.expectedPath = expectedPath;
    state.routePaintAt = null;
    state.routeReason = null;
    state.routeTextLength = 0;
    state.lastTextLength = 0;
    try {
      performance.mark('route-transition-start');
    } catch {
      // Optional marker only.
    }
    window.setTimeout(() => mark('route-reset'), 24);
  };

  window.__routePerfState = state;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installObserver, { once: true });
  } else {
    installObserver();
  }
})();
`

function parseArgs(argv) {
  const options = {
    runs: DEFAULT_RUNS,
    skipBuild: false,
    buildOnly: false,
    port: DEFAULT_PORT,
    routeTimeoutMs: DEFAULT_ROUTE_TIMEOUT_MS,
    chromePath: process.env.CHROME_PATH ?? null,
    browserUrl: process.env.PERF_BROWSER_URL ?? null,
    closeBrowser: false,
    authenticated: true,
  }

  for (const arg of argv) {
    if (arg === '--skip-build') options.skipBuild = true
    else if (arg === '--build-only') options.buildOnly = true
    else if (arg.startsWith('--runs=')) options.runs = Number(arg.slice('--runs='.length))
    else if (arg.startsWith('--port=')) options.port = Number(arg.slice('--port='.length))
    else if (arg.startsWith('--timeout=')) options.routeTimeoutMs = Number(arg.slice('--timeout='.length))
    else if (arg.startsWith('--chrome=')) options.chromePath = arg.slice('--chrome='.length)
    else if (arg.startsWith('--browser-url=')) options.browserUrl = arg.slice('--browser-url='.length)
    else if (arg === '--close-browser') options.closeBrowser = true
    else if (arg === '--unauthenticated') options.authenticated = false
    else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs must be a positive integer')
  }
  if (!Number.isInteger(options.port) || options.port < 1024) {
    throw new Error('--port must be an integer >= 1024')
  }
  if (!Number.isInteger(options.routeTimeoutMs) || options.routeTimeoutMs < 1000) {
    throw new Error('--timeout must be an integer >= 1000')
  }

  return options
}

function printHelp() {
  console.log(`Usage: node scripts/perf/benchmark.mjs [options]

Options:
  --runs=N          Runs per route/mode. Default: ${DEFAULT_RUNS}
  --skip-build     Reuse scripts/perf/dist instead of running npm run build.
  --build-only     Build and inspect bundle, but skip browser measurements.
  --port=N         Local static server port. Default: ${DEFAULT_PORT}
  --timeout=N      Route render timeout in ms. Default: ${DEFAULT_ROUTE_TIMEOUT_MS}
  --chrome=PATH    Chrome or Edge executable path. Defaults to common Windows paths or CHROME_PATH.
  --browser-url=URL Connect to an existing Chrome DevTools endpoint, e.g. http://127.0.0.1:9222.
  --close-browser  Close the connected browser through CDP when finished.
  --unauthenticated
                  Skip benchmark-user setup/session injection and measure redirects.
`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  await fs.mkdir(RESULTS_DIR, { recursive: true })

  const startedAt = new Date()
  const buildCommand = [
    'npm',
    'run',
    'build',
    '--',
    '--config',
    'scripts/perf/vite.perf.config.mjs',
    '--configLoader',
    'native',
  ]

  if (!options.skipBuild) {
    await cleanPerfTransients()
    await runCommand(npmCommand(), buildCommand.slice(1), FRONTEND_ROOT)
  }

  const build = await analyzeBuild(BUILD_DIR)

  if (options.buildOnly) {
    const payload = await writeResults({
      startedAt,
      options,
      buildCommand,
      build,
      browser: null,
      server: null,
      runs: [],
      routeRows: [],
      bottlenecks: rankBottlenecks(build, [], []),
      authNote: makeAuthNote([], options, null),
    })
    console.log(`Build-only report written to ${payload.markdownPath}`)
    return
  }

  let benchmarkAuth = null
  if (options.authenticated) {
    try {
      benchmarkAuth = await prepareBenchmarkAuth({ frontendRoot: FRONTEND_ROOT, scriptDir: SCRIPT_DIR })
    } catch (setupError) {
      const failureRuns = makeSetupFailureRuns(setupError, 'auth-setup-failed')
      const coldSummaries = summarizeAllRuns(ROUTES, failureRuns, 'cold')
      const warmSummaries = summarizeAllRuns(ROUTES, failureRuns, 'warm')
      const routeRows = makeRouteRows(coldSummaries, warmSummaries)
      const authNote = `Authenticated benchmark setup failed before browser measurement: ${setupError instanceof Error ? setupError.message : String(setupError)}`
      const bottlenecks = rankBottlenecks(build, failureRuns, routeRows)
      const output = await writeResults({
        startedAt,
        options,
        buildCommand,
        build,
        browser: null,
        server: null,
        runs: failureRuns,
        routeRows,
        bottlenecks,
        authNote,
      })
      console.error(`Benchmark auth setup failed; partial report written to ${output.markdownPath}`)
      throw setupError
    }
  }

  const allRuns = []
  let server = null
  let chrome = null
  let cdp = null
  try {
    server = await startStaticServer(BUILD_DIR, options.port)
    try {
      chrome = options.browserUrl
        ? await connectExternalBrowser(options.browserUrl)
        : await launchChrome(options.chromePath)
      cdp = new CDPConnection(chrome.webSocketDebuggerUrl)
      await cdp.connect()
    } catch (setupError) {
      const failureRuns = makeSetupFailureRuns(setupError, 'browser-unavailable')
      const coldSummaries = summarizeAllRuns(ROUTES, failureRuns, 'cold')
      const warmSummaries = summarizeAllRuns(ROUTES, failureRuns, 'warm')
      const routeRows = makeRouteRows(coldSummaries, warmSummaries)
      const authNote = [
        benchmarkAuth ? 'Authenticated benchmark session was prepared and ready for injection.' : makeAuthNote([], options, benchmarkAuth),
        `Browser measurements were not collected: ${setupError instanceof Error ? setupError.message : String(setupError)}`,
      ].join(' ')
      const bottlenecks = rankBottlenecks(build, failureRuns, routeRows)
      const output = await writeResults({
        startedAt,
        options,
        buildCommand,
        build,
        browser: chrome?.browserInfo ?? null,
        server: { baseUrl: server.baseUrl },
        runs: failureRuns,
        routeRows,
        bottlenecks,
        authNote,
      })
      console.error(`Browser setup failed; partial report written to ${output.markdownPath}`)
      throw setupError
    }

    for (let iteration = 1; iteration <= options.runs; iteration += 1) {
      for (const route of ROUTES) {
        const cold = await measureColdRoute(cdp, server.baseUrl, route, iteration, options, benchmarkAuth)
        allRuns.push(cold)
        logRun(cold)

        const warm = await measureWarmRoute(cdp, server.baseUrl, route, iteration, options, benchmarkAuth)
        allRuns.push(warm)
        logRun(warm)
      }
    }
  } finally {
    if (cdp) {
      if (chrome?.ownedProcess || options.closeBrowser) {
        await cdp.send('Browser.close').catch(() => undefined)
      }
      cdp.close()
    }
    if (chrome?.ownedProcess) await stopChrome(chrome)
    if (server) await server.close()
  }

  const coldSummaries = summarizeAllRuns(ROUTES, allRuns, 'cold')
  const warmSummaries = summarizeAllRuns(ROUTES, allRuns, 'warm')
  const routeRows = makeRouteRows(coldSummaries, warmSummaries)
  const bottlenecks = rankBottlenecks(build, allRuns, routeRows)
  const authNote = makeAuthNote(allRuns, options, benchmarkAuth)

  const output = await writeResults({
    startedAt,
    options,
    buildCommand,
    build,
    browser: chrome.browserInfo,
    server: { baseUrl: server.baseUrl },
    runs: allRuns,
    routeRows,
    bottlenecks,
    authNote,
  })

  console.log('')
  console.log(toMarkdownTable(routeRows))
  console.log('')
  console.log(`JSON: ${output.jsonPath}`)
  console.log(`Markdown: ${output.markdownPath}`)
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

async function cleanPerfTransients() {
  await fs.rm(BUILD_DIR, { recursive: true, force: true })
  const entries = await fs.readdir(SCRIPT_DIR, { withFileTypes: true })
  const transientPatterns = [
    /^\.chrome-profile-/,
    /^\.external-chrome-profile-/,
    /^chrome-launch-.*\.stderr\.log$/,
    /^external-chrome-.*\.(stdout|stderr)\.log$/,
  ]

  for (const entry of entries) {
    if (!transientPatterns.some((pattern) => pattern.test(entry.name))) continue
    await fs.rm(path.join(SCRIPT_DIR, entry.name), { recursive: true, force: true })
  }
}

async function analyzeBuild(buildDir) {
  const files = await listFiles(buildDir)
  const details = []
  const sourceMaps = new Map()

  for (const file of files) {
    const rel = slash(path.relative(buildDir, file))
    const buffer = await fs.readFile(file)
    const detail = {
      file: rel,
      kind: classifyChunkName(rel),
      bytes: buffer.length,
      rawKiB: bytesToKiB(buffer.length),
      gzipBytes: isCompressible(rel) ? gzipSync(buffer).length : null,
      gzipKiB: isCompressible(rel) ? bytesToKiB(gzipSync(buffer).length) : null,
    }
    details.push(detail)

    if (rel.endsWith('.js.map')) {
      try {
        sourceMaps.set(rel.replace(/\.map$/, ''), JSON.parse(buffer.toString('utf8')))
      } catch {
        sourceMaps.set(rel.replace(/\.map$/, ''), null)
      }
    }
  }

  details.sort((a, b) => b.bytes - a.bytes)

  const indexHtml = await fs.readFile(path.join(buildDir, 'index.html'), 'utf8')
  const entryScripts = unique([...indexHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => trimAssetPath(match[1])))
  const modulepreloads = unique([...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)].map((match) => trimAssetPath(match[1])))
  const manifest = await readManifest(buildDir)
  const manifestEntries = Object.entries(manifest ?? {})

  const entryFile = entryScripts[0] ?? manifestEntries.find(([, value]) => value?.isEntry)?.[1]?.file ?? null
  const entryDetail = details.find((detail) => detail.file === entryFile) ?? null
  const modulepreloadDetails = modulepreloads
    .map((file) => details.find((detail) => detail.file === file))
    .filter(Boolean)
    .sort((a, b) => b.bytes - a.bytes)
  const entryMap = entryFile ? sourceMaps.get(entryFile) : null
  const entryComposition = summarizeSourceMap(entryMap)
  const entryHighlights = entryComposition.sources
    .filter((source) => IMPORTANT_ENTRY_SOURCES.some((needle) => sourceIncludes(source, needle)))
    .sort()

  const jsDetails = details.filter((detail) => detail.file.endsWith('.js'))
  const chunkSources = jsDetails.map((detail) => {
    const mapJson = sourceMaps.get(detail.file)
    const summary = summarizeSourceMap(mapJson)
    return {
      ...detail,
      sources: summary.sources,
      packageWeights: summary.packageWeights,
      importantSources: summary.sources.filter((source) => sourceIncludes(source, 'src/')),
      containsGuidedLessons: summary.sources.some((source) => sourceIncludes(source, 'src/data/guidedLessons.ts')),
      containsFramerMotion: summary.sources.some((source) => sourceIncludes(source, '/node_modules/framer-motion/')),
      containsSupabase: summary.sources.some((source) => sourceIncludes(source, '/node_modules/@supabase/')),
      containsPhaser: summary.sources.some((source) => sourceIncludes(source, '/node_modules/phaser/')),
    }
  })

  const routeChunks = mapRouteChunks(manifest, chunkSources)
  const oversizedChunks = chunkSources
    .filter((chunk) => chunk.bytes >= 250 * 1024)
    .map(trimChunkForReport)
  const guidedLessonsChunks = chunkSources
    .filter((chunk) => chunk.containsGuidedLessons)
    .map(trimChunkForReport)

  return {
    buildDir,
    index: {
      entryScripts,
      modulepreloads,
      modulepreloadDetails: modulepreloadDetails.map((detail) => ({
        file: detail.file,
        rawKiB: detail.rawKiB,
        gzipKiB: detail.gzipKiB,
      })),
      modulepreloadRawKiB: roundMetric(modulepreloadDetails.reduce((sum, detail) => sum + detail.rawKiB, 0)),
      modulepreloadGzipKiB: roundMetric(modulepreloadDetails.reduce((sum, detail) => sum + (detail.gzipKiB ?? 0), 0)),
      modulepreloadCount: modulepreloads.length,
    },
    files: details.map((detail) => ({
      file: detail.file,
      kind: detail.kind,
      bytes: detail.bytes,
      rawKiB: detail.rawKiB,
      gzipBytes: detail.gzipBytes,
      gzipKiB: detail.gzipKiB,
    })),
    entry: entryDetail ? {
      ...entryDetail,
      sourceCount: entryComposition.sources.length,
      topPackages: entryComposition.packageWeights.slice(0, 12),
      highlights: entryHighlights,
      containsGuidedLessons: entryComposition.sources.some((source) => sourceIncludes(source, 'src/data/guidedLessons.ts')),
      containsFramerMotion: entryComposition.sources.some((source) => sourceIncludes(source, '/node_modules/framer-motion/')),
      containsSupabase: entryComposition.sources.some((source) => sourceIncludes(source, '/node_modules/@supabase/')),
      containsCapacitor: entryComposition.sources.some((source) => sourceIncludes(source, '/node_modules/@capacitor/')),
    } : null,
    chunks: chunkSources.map(trimChunkForReport),
    routeChunks,
    oversizedChunks,
    guidedLessonsChunks,
  }
}

async function readManifest(buildDir) {
  const candidates = [
    path.join(buildDir, '.vite', 'manifest.json'),
    path.join(buildDir, 'manifest.json'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return JSON.parse(await fs.readFile(candidate, 'utf8'))
    }
  }
  return null
}

function summarizeSourceMap(mapJson) {
  if (!mapJson || !Array.isArray(mapJson.sources)) {
    return { sources: [], packageWeights: [] }
  }

  const weights = new Map()
  for (let index = 0; index < mapJson.sources.length; index += 1) {
    const source = mapJson.sources[index]
    const pkg = groupPackageFromSource(source)
    if (!pkg) continue
    const content = Array.isArray(mapJson.sourcesContent) ? mapJson.sourcesContent[index] : null
    const bytes = content ? Buffer.byteLength(content, 'utf8') : 1
    weights.set(pkg, (weights.get(pkg) ?? 0) + bytes)
  }

  return {
    sources: mapJson.sources.map(slash),
    packageWeights: [...weights.entries()]
      .map(([pkg, bytes]) => ({ package: pkg, sourceBytes: bytes, sourceKiB: bytesToKiB(bytes) }))
      .sort((a, b) => b.sourceBytes - a.sourceBytes),
  }
}

function mapRouteChunks(manifest, chunkSources) {
  const byFile = new Map(chunkSources.map((chunk) => [chunk.file, chunk]))
  const result = {}

  for (const [route, matchers] of Object.entries(ROUTE_CHUNK_MATCHERS)) {
    const matchedFiles = new Set()

    if (manifest) {
      for (const [key, value] of Object.entries(manifest)) {
        if (!value?.file) continue
        if (matchers.some((matcher) => slash(key).endsWith(matcher))) {
          matchedFiles.add(value.file)
        }
      }
    }

    for (const chunk of chunkSources) {
      if (chunk.sources.some((source) => matchers.some((matcher) => sourceIncludes(source, matcher)))) {
        matchedFiles.add(chunk.file)
      }
    }

    result[route] = [...matchedFiles]
      .map((file) => byFile.get(file))
      .filter(Boolean)
      .map(trimChunkForReport)
      .sort((a, b) => b.bytes - a.bytes)
  }

  return result
}

function trimChunkForReport(chunk) {
  return {
    file: chunk.file,
    kind: chunk.kind,
    bytes: chunk.bytes,
    rawKiB: chunk.rawKiB,
    gzipBytes: chunk.gzipBytes,
    gzipKiB: chunk.gzipKiB,
    containsGuidedLessons: Boolean(chunk.containsGuidedLessons),
    containsFramerMotion: Boolean(chunk.containsFramerMotion),
    containsSupabase: Boolean(chunk.containsSupabase),
    containsPhaser: Boolean(chunk.containsPhaser),
  }
}

function isCompressible(rel) {
  return /\.(html|js|css|json|map|svg|txt)$/i.test(rel)
}

async function listFiles(root) {
  const output = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else output.push(full)
    }
  }
  await walk(root)
  return output
}

function startStaticServer(root, preferredPort) {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`)
      let pathname = decodeURIComponent(requestUrl.pathname)
      if (pathname === '/') pathname = '/index.html'

      let filePath = path.resolve(root, `.${pathname}`)
      if (!filePath.startsWith(path.resolve(root))) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = path.join(root, 'index.html')
      }

      const ext = path.extname(filePath).toLowerCase()
      const buffer = await fs.readFile(filePath)
      const isAsset = slash(path.relative(root, filePath)).startsWith('assets/')
      res.writeHead(200, {
        'content-type': MIME_TYPES[ext] ?? 'application/octet-stream',
        'cache-control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
      res.end(buffer)
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(error instanceof Error ? error.stack : String(error))
    }
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(preferredPort, '127.0.0.1', () => {
      server.off('error', reject)
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : preferredPort
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}

async function launchChrome(configuredPath) {
  const chromePath = configuredPath ?? findChrome()
  if (!chromePath) {
    throw new Error('Could not find Chrome or Edge. Set CHROME_PATH or pass --chrome=PATH.')
  }

  const port = await findOpenPort(9222)
  const userDataDir = path.join(SCRIPT_DIR, `.chrome-profile-${process.pid}-${Date.now()}`)
  await fs.mkdir(userDataDir, { recursive: true })

  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--no-default-browser-check',
    '--no-first-run',
    '--window-size=1365,768',
    'about:blank',
  ]

  const stderrPath = path.join(SCRIPT_DIR, `chrome-launch-${Date.now()}.stderr.log`)
  const stderrStream = createWriteStream(stderrPath, { flags: 'a' })
  let proc
  try {
    proc = spawn(chromePath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (error) {
    stderrStream.end()
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
  proc.stderr?.pipe(stderrStream)

  try {
    const versionUrl = `http://127.0.0.1:${port}/json/version`
    const browserInfo = await Promise.race([
      waitForBrowser(versionUrl),
      new Promise((_, reject) => proc.once('error', reject)),
      new Promise((_, reject) => proc.once('exit', (code, signal) => {
        reject(new Error(`Chrome exited before DevTools was ready (code=${code}, signal=${signal}, stderr=${stderrPath})`))
      })),
    ])
    return {
      ownedProcess: true,
      proc,
      userDataDir,
      stderrPath,
      webSocketDebuggerUrl: browserInfo.webSocketDebuggerUrl,
      browserInfo: {
        product: browserInfo.Browser,
        protocolVersion: browserInfo['Protocol-Version'],
        userAgent: browserInfo['User-Agent'],
        executable: chromePath,
        stderrPath,
      },
    }
  } catch (error) {
    if (proc.exitCode === null && !proc.killed) proc.kill()
    stderrStream.end()
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

async function connectExternalBrowser(browserUrl) {
  const browserInfo = browserUrl.startsWith('ws:')
    || browserUrl.startsWith('wss:')
    ? null
    : await waitForBrowser(toVersionEndpoint(browserUrl))

  return {
    ownedProcess: false,
    proc: null,
    userDataDir: null,
    stderrPath: null,
    webSocketDebuggerUrl: browserInfo?.webSocketDebuggerUrl ?? browserUrl,
    browserInfo: browserInfo ? {
      product: browserInfo.Browser,
      protocolVersion: browserInfo['Protocol-Version'],
      userAgent: browserInfo['User-Agent'],
      executable: 'external',
      externalBrowserUrl: browserUrl,
    } : {
      product: 'external',
      protocolVersion: null,
      userAgent: null,
      executable: 'external',
      externalBrowserUrl: browserUrl,
    },
  }
}

function toVersionEndpoint(browserUrl) {
  const url = new URL(browserUrl)
  if (url.pathname.endsWith('/json/version')) return url.toString()
  return `${url.origin}/json/version`
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

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

async function waitForBrowser(versionUrl) {
  const deadline = Date.now() + 12000
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(versionUrl)
      if (response.ok) return response.json()
    } catch (error) {
      lastError = error
    }
    await sleep(100)
  }
  throw new Error(`Chrome did not expose DevTools in time: ${lastError?.message ?? 'timeout'}`)
}

async function stopChrome(chrome) {
  if (!chrome?.proc) return
  if (chrome.proc.exitCode === null && !chrome.proc.killed) {
    chrome.proc.kill()
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2000)
      chrome.proc.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }
  if (chrome.userDataDir) {
    await fs.rm(chrome.userDataDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function findOpenPort(start) {
  for (let port = start; port < start + 100; port += 1) {
    const available = await new Promise((resolve) => {
      const probe = createServer()
      probe.once('error', () => resolve(false))
      probe.once('listening', () => probe.close(() => resolve(true)))
      probe.listen(port, '127.0.0.1')
    })
    if (available) return port
  }
  throw new Error(`No open port found starting at ${start}`)
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
      const key = listenerKey(message.sessionId, message.method)
      for (const listener of this.listeners.get(key) ?? []) listener(message.params ?? {})
      const wildcard = listenerKey(message.sessionId, '*')
      for (const listener of this.listeners.get(wildcard) ?? []) listener(message)
    }
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId
    this.nextId += 1
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params }
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify(payload))
    })
  }

  on(sessionId, method, callback) {
    const key = listenerKey(sessionId, method)
    const listeners = this.listeners.get(key) ?? new Set()
    listeners.add(callback)
    this.listeners.set(key, listeners)
    return () => listeners.delete(callback)
  }

  close() {
    this.ws?.close()
  }
}

function listenerKey(sessionId, method) {
  return `${sessionId ?? 'browser'}:${method}`
}

async function createPage(cdp, { cacheDisabled, benchmarkAuth }) {
  const context = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true })
  const target = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId: context.browserContextId,
    width: 1365,
    height: 768,
  })
  const attached = await cdp.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  })
  const sessionId = attached.sessionId
  const tracker = createNetworkTracker(cdp, sessionId)

  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Network.enable', {}, sessionId)
  await cdp.send('Network.setCacheDisabled', { cacheDisabled }, sessionId)
  if (benchmarkAuth) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: makeBenchmarkAuthInjectionScript(benchmarkAuth),
    }, sessionId)
  }
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PERF_INSTRUMENTATION }, sessionId)

  return {
    contextId: context.browserContextId,
    targetId: target.targetId,
    sessionId,
    tracker,
    async close() {
      await cdp.send('Target.closeTarget', { targetId: target.targetId }).catch(() => undefined)
      await cdp.send('Target.disposeBrowserContext', { browserContextId: context.browserContextId }).catch(() => undefined)
    },
  }
}

function createNetworkTracker(cdp, sessionId) {
  const requests = new Map()
  const failures = []

  cdp.on(sessionId, 'Network.requestWillBeSent', (event) => {
    requests.set(event.requestId, {
      requestId: event.requestId,
      url: event.request.url,
      method: event.request.method,
      type: event.type,
      startTimestamp: event.timestamp,
      documentURL: event.documentURL,
    })
  })

  cdp.on(sessionId, 'Network.responseReceived', (event) => {
    const record = requests.get(event.requestId) ?? { requestId: event.requestId }
    record.type = event.type
    record.url = event.response.url
    record.status = event.response.status
    record.mimeType = event.response.mimeType
    record.responseTimestamp = event.timestamp
    record.encodedDataLength = event.response.encodedDataLength
    record.fromDiskCache = event.response.fromDiskCache
    record.fromPrefetchCache = event.response.fromPrefetchCache
    requests.set(event.requestId, record)
  })

  cdp.on(sessionId, 'Network.loadingFinished', (event) => {
    const record = requests.get(event.requestId) ?? { requestId: event.requestId }
    record.endTimestamp = event.timestamp
    record.encodedDataLength = event.encodedDataLength
    requests.set(event.requestId, record)
  })

  cdp.on(sessionId, 'Network.loadingFailed', (event) => {
    failures.push({
      requestId: event.requestId,
      errorText: event.errorText,
      canceled: event.canceled,
      type: event.type,
    })
  })

  return {
    requests,
    failures,
    snapshot() {
      return [...requests.values()]
    },
  }
}

async function measureColdRoute(cdp, baseUrl, route, iteration, options, benchmarkAuth) {
  const page = await createPage(cdp, { cacheDisabled: true, benchmarkAuth })
  const url = `${baseUrl}${route.path}`
  try {
    await navigateAndWait(cdp, page.sessionId, url, options.routeTimeoutMs)
    const metrics = await readMetrics(cdp, page.sessionId, { mode: 'cold', routeStart: 0 })
    return makeRunRecord({
      mode: 'cold',
      route,
      iteration,
      metrics,
      tracker: page.tracker,
      cacheDisabled: true,
      benchmarkAuth,
    })
  } catch (error) {
    return makeErrorRun({ mode: 'cold', route, iteration, error, tracker: page.tracker, cacheDisabled: true })
  } finally {
    await page.close()
  }
}

async function measureWarmRoute(cdp, baseUrl, route, iteration, options, benchmarkAuth) {
  const page = await createPage(cdp, { cacheDisabled: false, benchmarkAuth })
  try {
    await navigateAndWait(cdp, page.sessionId, `${baseUrl}/dashboard`, options.routeTimeoutMs)
    await evaluate(cdp, page.sessionId, `window.__routePerfReset(${JSON.stringify(route.path)})`)
    await evaluate(cdp, page.sessionId, `
      history.pushState({}, '', ${JSON.stringify(route.path)});
      window.dispatchEvent(new PopStateEvent('popstate'));
      true;
    `)
    await waitForRoutePaint(cdp, page.sessionId, options.routeTimeoutMs)
    const state = await getRouteState(cdp, page.sessionId)
    const metrics = await readMetrics(cdp, page.sessionId, { mode: 'warm', routeStart: state.startedAt })
    return makeRunRecord({
      mode: 'warm',
      route,
      iteration,
      metrics,
      tracker: page.tracker,
      cacheDisabled: false,
      benchmarkAuth,
    })
  } catch (error) {
    return makeErrorRun({ mode: 'warm', route, iteration, error, tracker: page.tracker, cacheDisabled: false })
  } finally {
    await page.close()
  }
}

async function navigateAndWait(cdp, sessionId, url, timeoutMs) {
  const loadPromise = waitForEvent(cdp, sessionId, 'Page.loadEventFired', timeoutMs)
  await cdp.send('Page.navigate', { url }, sessionId)
  await loadPromise.catch(() => undefined)
  await waitForRoutePaint(cdp, sessionId, timeoutMs)
}

async function waitForRoutePaint(cdp, sessionId, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastState = null
  while (Date.now() < deadline) {
    lastState = await getRouteState(cdp, sessionId).catch(() => null)
    if (lastState?.routePaintAt) return lastState
    await sleep(50)
  }
  throw new Error(`Route content did not paint within ${timeoutMs} ms; last state: ${JSON.stringify(lastState)}`)
}

function waitForEvent(cdp, sessionId, method, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      off()
      reject(new Error(`${method} timed out after ${timeoutMs} ms`))
    }, timeoutMs)
    const off = cdp.on(sessionId, method, (params) => {
      clearTimeout(timeout)
      off()
      resolve(params)
    })
  })
}

async function getRouteState(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const state = window.__routePerfState || {};
    return {
      startedAt: state.startedAt ?? 0,
      routePaintAt: state.routePaintAt ?? null,
      routeReason: state.routeReason ?? null,
      routeTextLength: state.routeTextLength ?? 0,
      lastTextLength: state.lastTextLength ?? 0,
      observerTarget: state.observerTarget ?? null,
      locationPath: location.pathname,
      locationHref: location.href,
      readyState: document.readyState,
      now: performance.now(),
    };
  })()`)
}

async function readMetrics(cdp, sessionId, { mode, routeStart }) {
  const expression = `(() => {
    const routeStart = ${Number(routeStart) || 0};
    const nav = performance.getEntriesByType('navigation')[0] || null;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find((entry) => entry.name === 'first-contentful-paint') || null;
    const state = window.__routePerfState || {};
    const resources = performance.getEntriesByType('resource');
    const chunks = resources
      .filter((entry) => entry.name.includes('/assets/') && entry.name.endsWith('.js') && entry.responseEnd >= routeStart)
      .map((entry) => ({
        name: entry.name.split('/').pop(),
        startTime: entry.startTime,
        responseEnd: entry.responseEnd,
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
      }));
    const largestChunk = chunks
      .slice()
      .sort((a, b) => (b.decodedBodySize || b.encodedBodySize || b.transferSize) - (a.decodedBodySize || a.encodedBodySize || a.transferSize))[0] || null;
    const latestChunk = chunks
      .slice()
      .sort((a, b) => b.responseEnd - a.responseEnd)[0] || null;
    const transferBytes = resources
      .filter((entry) => entry.responseEnd >= routeStart)
      .reduce((sum, entry) => sum + (entry.transferSize || 0), 0);

    return {
      mode: ${JSON.stringify(mode)},
      finalPath: location.pathname,
      finalHref: location.href,
      documentReadyState: document.readyState,
      ttfbMs: nav && ${JSON.stringify(mode)} === 'cold' ? nav.responseStart - nav.requestStart : null,
      fcpMs: fcp && ${JSON.stringify(mode)} === 'cold' ? fcp.startTime : null,
      routeRenderedMs: state.routePaintAt ? state.routePaintAt - (routeStart || 0) : null,
      routePaintAt: state.routePaintAt ?? null,
      routeReason: state.routeReason ?? null,
      routeTextLength: state.routeTextLength ?? 0,
      observerTarget: state.observerTarget ?? null,
      largestChunkWaitMs: largestChunk ? largestChunk.responseEnd - (routeStart || 0) : null,
      largestChunkName: largestChunk ? largestChunk.name : null,
      largestChunkDecodedKiB: largestChunk ? Math.round((largestChunk.decodedBodySize || 0) / 102.4) / 10 : null,
      latestChunkWaitMs: latestChunk ? latestChunk.responseEnd - (routeStart || 0) : null,
      latestChunkName: latestChunk ? latestChunk.name : null,
      transferKiB: Math.round((transferBytes / 1024) * 10) / 10,
      chunks,
    };
  })()`

  return evaluate(cdp, sessionId, expression)
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId)
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed')
  }
  return result.result?.value
}

function classifyAuthStatus(route, metrics, benchmarkAuth) {
  if (!route.protected) return 'public'
  if (metrics.finalPath === '/login') return 'redirected'
  if (benchmarkAuth) return 'authenticated'
  return 'unknown-session'
}

function makeRunRecord({ mode, route, iteration, metrics, tracker, cacheDisabled, benchmarkAuth }) {
  const requests = tracker.snapshot()
  const redirectedUnauth = route.protected && metrics.finalPath === '/login'
  const authStatus = classifyAuthStatus(route, metrics, benchmarkAuth)
  return {
    mode,
    route: route.path,
    label: route.label,
    protected: route.protected,
    iteration,
    cacheDisabled,
    status: redirectedUnauth ? 'redirected-or-auth-shell' : 'measured-route',
    authStatus,
    finalPath: metrics.finalPath,
    finalHref: metrics.finalHref,
    documentReadyState: metrics.documentReadyState,
    ttfbMs: roundMetric(metrics.ttfbMs),
    fcpMs: roundMetric(metrics.fcpMs),
    largestChunkWaitMs: roundMetric(metrics.largestChunkWaitMs),
    largestChunkName: metrics.largestChunkName,
    largestChunkDecodedKiB: metrics.largestChunkDecodedKiB,
    latestChunkWaitMs: roundMetric(metrics.latestChunkWaitMs),
    latestChunkName: metrics.latestChunkName,
    routeRenderedMs: roundMetric(metrics.routeRenderedMs),
    routeReason: metrics.routeReason,
    routeTextLength: metrics.routeTextLength,
    observerTarget: metrics.observerTarget,
    transferKiB: metrics.transferKiB,
    chunks: metrics.chunks,
    requestCount: requests.length,
    failedRequests: tracker.failures,
    errors: [],
  }
}

function makeErrorRun({ mode, route, iteration, error, tracker, cacheDisabled }) {
  return {
    mode,
    route: route.path,
    label: route.label,
    protected: route.protected,
    iteration,
    cacheDisabled,
    status: 'error',
    authStatus: route.protected ? 'error' : 'public',
    finalPath: null,
    finalHref: null,
    ttfbMs: null,
    fcpMs: null,
    largestChunkWaitMs: null,
    largestChunkName: null,
    latestChunkWaitMs: null,
    latestChunkName: null,
    routeRenderedMs: null,
    transferKiB: null,
    chunks: [],
    requestCount: tracker.snapshot().length,
    failedRequests: tracker.failures,
    errors: [error instanceof Error ? error.message : String(error)],
  }
}

function makeRouteRows(coldSummaries, warmSummaries) {
  return ROUTES.map((route, index) => ({
    route: route.path,
    protected: route.protected,
    cold: coldSummaries[index],
    warm: warmSummaries[index],
  }))
}

function makeSetupFailureRuns(error, status) {
  const message = error instanceof Error ? error.message : String(error)
  return ROUTES.flatMap((route) => ['cold', 'warm'].map((mode) => ({
    mode,
    route: route.path,
    label: route.label,
    protected: route.protected,
    iteration: 0,
    cacheDisabled: mode === 'cold',
    status,
    authStatus: route.protected ? status : 'public',
    finalPath: null,
    finalHref: null,
    ttfbMs: null,
    fcpMs: null,
    largestChunkWaitMs: null,
    largestChunkName: null,
    latestChunkWaitMs: null,
    latestChunkName: null,
    routeRenderedMs: null,
    transferKiB: null,
    chunks: [],
    requestCount: 0,
    failedRequests: [],
    errors: [message],
  })))
}

function logRun(run) {
  const route = run.route.padEnd(17, ' ')
  console.log([
    `[${run.iteration}]`,
    run.mode.padEnd(4, ' '),
    route,
    `render=${run.routeRenderedMs ?? 'n/a'}ms`,
    `chunk=${run.largestChunkWaitMs ?? 'n/a'}ms`,
    `auth=${run.authStatus ?? 'n/a'}`,
    `final=${run.finalPath ?? 'n/a'}`,
    run.status,
  ].join(' '))
}

function rankBottlenecks(build, allRuns, routeRows) {
  const items = []
  const entry = build.entry
  if (entry) {
    items.push({
      rank: 0,
      title: 'Entry chunk carries too much first-load surface',
      severity: entry.bytes >= 350 * 1024 ? 'high' : 'medium',
      evidence: [
        `${entry.file}: ${entry.rawKiB} KiB raw, ${entry.gzipKiB} KiB gzip`,
        `entry source count: ${entry.sourceCount}`,
        `entry highlights: ${entry.highlights.slice(0, 8).join(', ') || 'none detected'}`,
      ],
    })

    if (entry.containsFramerMotion) {
      const framer = entry.topPackages.find((pkg) => pkg.package === 'framer-motion')
      items.push({
        rank: 0,
        title: 'framer-motion is eagerly loaded by public entry imports',
        severity: 'high',
        evidence: [
          `entry includes framer-motion${framer ? ` source weight ${framer.sourceKiB} KiB` : ''}`,
          'LandingPage and Login are static imports in src/App.tsx, so landing animation dependencies join the entry path.',
        ],
      })
    }

    if (entry.containsSupabase || entry.containsCapacitor) {
      items.push({
        rank: 0,
        title: 'Auth/provider stack is part of the public first paint path',
        severity: 'medium',
        evidence: [
          `entry contains Supabase: ${entry.containsSupabase}`,
          `entry contains Capacitor: ${entry.containsCapacitor}`,
          'AuthProvider, ThemeProvider, SkinProvider, LanguageProvider, DialogProvider, ProfileModal, and RedeemCodeDialog are mounted above all routes.',
        ],
      })
    }
  }

  if (build.index.modulepreloadRawKiB > 300) {
    items.push({
      rank: 0,
      title: 'Initial modulepreloads add a second large first-load payload',
      severity: 'high',
      evidence: [
        `${build.index.modulepreloadCount} modulepreload files: ${build.index.modulepreloadRawKiB} KiB raw, ${build.index.modulepreloadGzipKiB} KiB gzip`,
        `largest preloads: ${build.index.modulepreloadDetails.slice(0, 5).map((item) => `${item.file} ${item.rawKiB} KiB raw`).join(', ')}`,
      ],
    })
  }

  if (build.guidedLessonsChunks.length > 0) {
    const chunks = build.guidedLessonsChunks.map((chunk) => `${chunk.file}: ${chunk.rawKiB} KiB raw, ${chunk.gzipKiB} KiB gzip`)
    const inEntry = entry?.containsGuidedLessons
    items.push({
      rank: 0,
      title: inEntry
        ? 'guidedLessons leaked into the entry chunk'
        : 'guidedLessons is isolated from entry but still creates oversized async route chunks',
      severity: inEntry ? 'critical' : 'high',
      evidence: chunks,
    })
  }

  const oversizedRouteChunks = build.oversizedChunks
    .filter((chunk) => chunk.kind === 'route' || chunk.containsGuidedLessons)
    .slice(0, 8)
  if (oversizedRouteChunks.length > 0) {
    items.push({
      rank: 0,
      title: 'Oversized async route chunks dominate route-load cost',
      severity: 'high',
      evidence: oversizedRouteChunks.map((chunk) => `${chunk.file}: ${chunk.rawKiB} KiB raw, ${chunk.gzipKiB} KiB gzip`),
    })
  }

  const modulepreloadCount = build.index.modulepreloadCount
  const largeRouteChunkCount = oversizedRouteChunks.length
  if (largeRouteChunkCount > 0 && modulepreloadCount === 0) {
    items.push({
      rank: 0,
      title: 'No initial modulepreload coverage for large lazy route chunks',
      severity: 'medium',
      evidence: [
        `index.html modulepreload count: ${modulepreloadCount}`,
        `large lazy chunks detected: ${largeRouteChunkCount}`,
      ],
    })
  }

  const protectedRuns = allRuns.filter((run) => run.protected)
  const redirected = protectedRuns.filter((run) => run.authStatus === 'redirected')
  if (protectedRuns.length > 0 && redirected.length / protectedRuns.length > 0.8) {
    items.push({
      rank: 0,
      title: 'Protected-route timings are auth-shell timings in this baseline',
      severity: 'measurement-limit',
      evidence: [
        `${redirected.length}/${protectedRuns.length} protected measurements ended at /login`,
        'Protected routes did not render their authenticated content for these measurements.',
      ],
    })
  }

  const slowCold = routeRows
    .filter((row) => row.cold?.median.routeRenderedMs !== null)
    .sort((a, b) => b.cold.median.routeRenderedMs - a.cold.median.routeRenderedMs)
    .slice(0, 3)
  if (slowCold.length > 0) {
    items.push({
      rank: 0,
      title: 'Slowest observed cold route renders',
      severity: 'observed',
      evidence: slowCold.map((row) => `${row.route}: ${row.cold.median.routeRenderedMs} ms rendered, ${row.cold.median.fcpMs ?? 'n/a'} ms FCP, final ${compactCounts(row.cold.finalPaths)}`),
    })
  }

  return items.map((item, index) => ({ ...item, rank: index + 1 }))
}

function makeAuthNote(allRuns, options, benchmarkAuth) {
  if (!options.authenticated) {
    return 'Unauthenticated benchmark mode requested; protected routes are expected to redirect or measure the auth shell.'
  }

  const protectedRuns = allRuns.filter((run) => run.protected)
  if (protectedRuns.length === 0) {
    return 'Build-only report; no browser auth behavior measured.'
  }

  const authenticated = protectedRuns.filter((run) => run.authStatus === 'authenticated').length
  const redirected = protectedRuns.filter((run) => run.authStatus === 'redirected').length
  const setupFailures = protectedRuns.filter((run) => run.authStatus === 'auth-setup-failed').length
  const browserUnavailable = protectedRuns.filter((run) => run.authStatus === 'browser-unavailable').length

  if (setupFailures > 0) {
    return `${setupFailures}/${protectedRuns.length} protected-route measurements could not run because benchmark auth setup failed.`
  }
  if (browserUnavailable > 0) {
    return `${browserUnavailable}/${protectedRuns.length} protected-route measurements could not run because the browser was unavailable.`
  }
  if (redirected > 0) {
    return `${authenticated}/${protectedRuns.length} protected-route measurements rendered with the injected benchmark session; ${redirected}/${protectedRuns.length} redirected to /login or measured only the auth shell.`
  }
  if (benchmarkAuth && authenticated === protectedRuns.length) {
    return `${authenticated}/${protectedRuns.length} protected-route measurements rendered with the injected benchmark session.`
  }
  return `${authenticated}/${protectedRuns.length} protected-route measurements rendered without redirect.`
}

async function writeResults(payload) {
  const endedAt = new Date()
  const stamp = timestamp(payload.startedAt)
  const jsonPath = path.join(RESULTS_DIR, `baseline-${stamp}.json`)
  const markdownPath = path.join(RESULTS_DIR, `baseline-${stamp}.md`)
  const table = toMarkdownTable(payload.routeRows)

  const json = {
    generatedAt: payload.startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds: roundMetric((endedAt.getTime() - payload.startedAt.getTime()) / 1000),
    frontendRoot: FRONTEND_ROOT,
    benchmark: {
      routes: ROUTES,
      runsPerRoute: payload.options.runs,
      authMode: payload.options.authenticated ? 'authenticated benchmark user' : 'unauthenticated redirects',
      cold: 'Fresh browser context with Network.setCacheDisabled(true), full-page load to the route.',
      warm: 'Fresh browser context, full-page load to /dashboard, then client-side history.pushState + popstate to the target route.',
      routeRendered: 'MutationObserver on #root main, #root [role=main], #root, or body, with double requestAnimationFrame before marking content painted.',
      largestChunkWait: 'responseEnd, relative to navigation/transition start, of the largest loaded /assets/*.js resource by decoded size.',
      buildCommand: payload.buildCommand.join(' '),
    },
    environment: {
      node: process.version,
      platform: `${os.platform()} ${os.release()}`,
      browser: payload.browser,
      server: payload.server,
    },
    authNote: payload.authNote,
    build: payload.build,
    routeRows: payload.routeRows,
    runs: payload.runs,
    bottlenecks: payload.bottlenecks,
  }

  const markdown = [
    '# Production Performance Baseline',
    '',
    `Generated: ${payload.startedAt.toISOString()}`,
    '',
    '## Benchmark Definition',
    '',
    `- Build command: \`${payload.buildCommand.join(' ')}\``,
    `- Cold: fresh Chrome browser context, cache disabled, full-page route load.`,
    `- Warm: fresh Chrome browser context, load \`/dashboard\`, then client-side \`history.pushState\` + \`popstate\` to the route.`,
    `- Runs: ${payload.options.runs} per route/mode; table reports medians.`,
    `- Route rendered mark: MutationObserver on the route/root container, settled through double \`requestAnimationFrame\`.`,
    `- Auth mode: ${payload.options.authenticated ? 'dedicated benchmark Supabase user with real session injected before navigation' : 'unauthenticated redirect/auth-shell measurement'}.`,
    `- Auth note: ${payload.authNote}`,
    '',
    '## Route Medians',
    '',
    table,
    '',
    '## Bundle Summary',
    '',
    payload.build.entry
      ? `- Entry: \`${payload.build.entry.file}\` - ${payload.build.entry.rawKiB} KiB raw, ${payload.build.entry.gzipKiB} KiB gzip.`
      : '- Entry: not detected.',
    `- Modulepreloads in index.html: ${payload.build.index.modulepreloadCount} files - ${payload.build.index.modulepreloadRawKiB} KiB raw, ${payload.build.index.modulepreloadGzipKiB} KiB gzip.`,
    `- Oversized JS chunks >= 250 KiB: ${payload.build.oversizedChunks.length}.`,
    `- guidedLessons chunks: ${payload.build.guidedLessonsChunks.length ? payload.build.guidedLessonsChunks.map((chunk) => `\`${chunk.file}\` (${chunk.rawKiB} KiB raw)`).join(', ') : 'none detected'}.`,
    '',
    '## Ranked Bottlenecks',
    '',
    ...payload.bottlenecks.flatMap((item) => [
      `${item.rank}. ${item.title} (${item.severity})`,
      ...item.evidence.map((line) => `   - ${line}`),
    ]),
    '',
  ].join('\n')

  await fs.writeFile(jsonPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8')
  await fs.writeFile(markdownPath, markdown, 'utf8')
  return { jsonPath, markdownPath }
}

function timestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function trimAssetPath(value) {
  return slash(value).replace(/^\//, '')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function slash(value) {
  return String(value ?? '').replace(/\\/g, '/')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
