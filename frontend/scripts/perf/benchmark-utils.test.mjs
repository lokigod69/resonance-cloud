import assert from 'node:assert/strict'

import {
  bytesToKiB,
  median,
  summarizeRouteRuns,
  classifyChunkName,
  toMarkdownTable,
} from './perf-lib.mjs'
import {
  getSupabaseAuthStorageKey,
  makeSupabaseAuthStorageValue,
} from './perf-auth.mjs'

assert.equal(median([3, 1, 2]), 2)
assert.equal(median([10, 2, 4, 8]), 6)
assert.equal(median([]), null)
assert.equal(bytesToKiB(1536), 1.5)

assert.equal(classifyChunkName('assets/vendor-phaser-Dk2s.js'), 'vendor-phaser')
assert.equal(classifyChunkName('assets/index-Bp2Q.js'), 'entry')
assert.equal(classifyChunkName('assets/Today-Cx1Q.js'), 'route')

const routeRuns = summarizeRouteRuns('/today', [
  {
    mode: 'cold',
    route: '/today',
    ttfbMs: 10,
    fcpMs: 120,
    routeRenderedMs: 180,
    largestChunkWaitMs: 160,
    largestChunkName: 'assets/Today-a.js',
    finalPath: '/login',
    status: 'redirected-or-auth-shell',
    authStatus: 'redirected',
  },
  {
    mode: 'cold',
    route: '/today',
    ttfbMs: 20,
    fcpMs: 100,
    routeRenderedMs: 220,
    largestChunkWaitMs: 180,
    largestChunkName: 'assets/Today-b.js',
    finalPath: '/login',
    status: 'redirected-or-auth-shell',
    authStatus: 'redirected',
  },
])

assert.equal(routeRuns.route, '/today')
assert.equal(routeRuns.runs, 2)
assert.equal(routeRuns.median.ttfbMs, 15)
assert.equal(routeRuns.median.fcpMs, 110)
assert.equal(routeRuns.median.routeRenderedMs, 200)
assert.equal(routeRuns.median.largestChunkWaitMs, 170)
assert.equal(routeRuns.finalPaths['/login'], 2)
assert.equal(routeRuns.statuses['redirected-or-auth-shell'], 2)
assert.equal(routeRuns.authStatuses.redirected, 2)

const table = toMarkdownTable([
  {
    route: '/today',
    cold: routeRuns,
    warm: routeRuns,
  },
])

assert.match(table, /\| Route \| Cold TTFB \|/)
assert.match(table, /\| Auth \|/)
assert.match(table, /\/today/)
assert.match(table, /200/)
assert.match(table, /redirected x4/)

assert.equal(
  getSupabaseAuthStorageKey('https://abc123xyz.supabase.co'),
  'sb-abc123xyz-auth-token',
)

const storageValue = makeSupabaseAuthStorageValue({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1780000000,
  user: { id: 'user-id', email: 'perf-bench@example.test' },
})
assert.equal(storageValue.access_token, 'access-token')
assert.equal(storageValue.refresh_token, 'refresh-token')
assert.equal(storageValue.token_type, 'bearer')
assert.equal(storageValue.expires_at, 1780000000)
assert.equal(storageValue.user.id, 'user-id')

console.log('benchmark utils tests passed')
