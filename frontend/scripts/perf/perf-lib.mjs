export const DEFAULT_RUNS = 5

export const ROUTES = [
  { path: '/', label: 'Landing', protected: false },
  { path: '/login', label: 'Login', protected: false },
  { path: '/dashboard', label: 'Dashboard', protected: true },
  { path: '/today', label: 'Today', protected: true },
  { path: '/categories', label: 'Categories', protected: true },
  { path: '/games', label: 'Games', protected: true },
  { path: '/decks', label: 'Decks', protected: true },
  { path: '/generate', label: 'Generate', protected: true },
  { path: '/study', label: 'Study selector', protected: true },
  { path: '/study/video', label: 'Study video', protected: true },
  { path: '/study/image', label: 'Study image', protected: true },
  { path: '/study/flashcard', label: 'Study flashcard', protected: true },
  { path: '/study/audio', label: 'Study audio', protected: true },
  { path: '/music', label: 'Music', protected: true },
  { path: '/speak', label: 'Speak', protected: true },
]

export function median(values) {
  const numbers = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .slice()
    .sort((a, b) => a - b)

  if (numbers.length === 0) return null

  const midpoint = Math.floor(numbers.length / 2)
  const value = numbers.length % 2 === 1
    ? numbers[midpoint]
    : (numbers[midpoint - 1] + numbers[midpoint]) / 2

  return roundMetric(value)
}

export function roundMetric(value, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Number(value.toFixed(digits))
}

export function bytesToKiB(bytes) {
  return roundMetric(bytes / 1024)
}

export function bytesToMiB(bytes) {
  return roundMetric(bytes / 1024 / 1024, 2)
}

export function basename(input) {
  return String(input ?? '').replace(/\\/g, '/').split('/').pop() ?? ''
}

export function classifyChunkName(fileName) {
  const name = basename(fileName)
  if (/^index-[\w-]+\.js$/.test(name) || name === 'index.js') return 'entry'
  if (name.startsWith('vendor-phaser')) return 'vendor-phaser'
  if (name.startsWith('vendor-')) return 'vendor'
  if (name.endsWith('.css')) return 'css'
  if (name.endsWith('.js')) return 'route'
  return 'asset'
}

export function countBy(values) {
  const counts = {}
  for (const value of values) {
    const key = String(value ?? 'unknown')
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function summarizeRouteRuns(route, runs) {
  return {
    route,
    runs: runs.length,
    median: {
      ttfbMs: median(runs.map((run) => run.ttfbMs)),
      fcpMs: median(runs.map((run) => run.fcpMs)),
      largestChunkWaitMs: median(runs.map((run) => run.largestChunkWaitMs)),
      latestChunkWaitMs: median(runs.map((run) => run.latestChunkWaitMs)),
      routeRenderedMs: median(runs.map((run) => run.routeRenderedMs)),
      transferKiB: median(runs.map((run) => run.transferKiB)),
    },
    largestChunks: countBy(runs.map((run) => run.largestChunkName).filter(Boolean)),
    finalPaths: countBy(runs.map((run) => run.finalPath).filter(Boolean)),
    statuses: countBy(runs.map((run) => run.status).filter(Boolean)),
    authStatuses: countBy(runs.map((run) => run.authStatus).filter(Boolean)),
    errors: runs.flatMap((run) => run.errors ?? []),
  }
}

export function summarizeAllRuns(routes, allRuns, mode) {
  return routes.map((route) => {
    const runs = allRuns.filter((run) => run.mode === mode && run.route === route.path)
    return summarizeRouteRuns(route.path, runs)
  })
}

export function fmt(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a'
  return `${value}${suffix}`
}

export function compactCounts(counts) {
  const entries = Object.entries(counts ?? {})
  if (entries.length === 0) return 'n/a'
  return entries
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `${key} x${count}`)
    .join(', ')
}

export function mergeCounts(...countsList) {
  const merged = {}
  for (const counts of countsList) {
    for (const [key, count] of Object.entries(counts ?? {})) {
      merged[key] = (merged[key] ?? 0) + count
    }
  }
  return merged
}

export function toMarkdownTable(rows) {
  const lines = [
    '| Route | Cold TTFB | Cold FCP | Cold largest chunk wait | Cold rendered | Warm chunk wait | Warm rendered | Auth | Final paths |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ]

  for (const row of rows) {
    const authStatuses = compactCounts(mergeCounts(row.cold?.authStatuses, row.warm?.authStatuses))
    lines.push([
      row.route,
      fmt(row.cold?.median.ttfbMs, ' ms'),
      fmt(row.cold?.median.fcpMs, ' ms'),
      fmt(row.cold?.median.largestChunkWaitMs, ' ms'),
      fmt(row.cold?.median.routeRenderedMs, ' ms'),
      fmt(row.warm?.median.largestChunkWaitMs, ' ms'),
      fmt(row.warm?.median.routeRenderedMs, ' ms'),
      authStatuses,
      compactCounts(mergeCounts(row.cold?.finalPaths, row.warm?.finalPaths)),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
  }

  return lines.join('\n')
}

export function groupPackageFromSource(source) {
  const normalized = String(source ?? '').replace(/\\/g, '/')
  const marker = '/node_modules/'
  const index = normalized.lastIndexOf(marker)
  if (index === -1) return null

  const rest = normalized.slice(index + marker.length)
  const parts = rest.split('/')
  if (parts[0]?.startsWith('@')) return `${parts[0]}/${parts[1] ?? ''}`
  return parts[0] ?? null
}

export function sourceIncludes(source, needle) {
  return String(source ?? '').replace(/\\/g, '/').includes(needle)
}
