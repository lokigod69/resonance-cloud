// Runs every offline contract test (no Supabase, no network, no paid calls) in
// sequence and prints one line per script. Exits non-zero if any failed.
// Scripts that reach Supabase or need credentials (test:api:paid, test:phase1e:rls,
// test:phase1f0:credits, test:phase1f:admin, test:phase1h1:*) are deliberately
// excluded, as is verify:grok-ios-audio:dist, which needs a fresh build.
import { spawnSync } from 'node:child_process'

const SCRIPTS = [
  'test',
  'check:i18n',
  'test:ui-locales',
  'test:base-languages',
  'test:guided-today',
  'test:guided-base',
  'test:script-lab',
  'test:word-stream',
  'test:stripe-billing',
  'test:lane-payload',
  'test:premium-style-assets',
  'test:generate-responsive-layout',
  'test:i18n-display-labels',
  'test:speak-polish',
  'test:speak-personas',
  'test:lens',
  'test:oauth-onboarding',
  'test:admin-layer2-lab',
  'test:card-generation-progress',
  'test:word-metadata',
  'test:static-category-translations',
  'test:vocabulary-library',
  'test:static-thematic-tts',
  'test:phase1g:storage-cleanup',
  'verify:grok-ios-audio',
]

// Source-grep contracts written for code that has since been removed or
// redesigned (found 2026-09-25). They fail on main and are skipped so a red
// result always means a new regression. Run them with --all; delete or rewrite
// each one when its area is next touched.
const KNOWN_STALE = {
  'test:dashboard-home-glass': 'asserts on the retired classic dashboard (dashboardLibraryHref)',
  'test:landing-polish': 'reads HeroSection.tsx, deleted by the Tide landing redesign (cccfef59)',
  'test:study-flashcard-pronunciation': 'regexes predate the t() aria labels and the object feedbackPulse; features still exist',
  'test:generate-category-picker-flow': 'expects a Categories-page Generate entry point removed in b31917e2',
  'test:regressions': 'regex predates the DeckView isVideoDeck rename (118b0311); the viewer still exists',
}

const args = process.argv.slice(2)
const runAll = args.includes('--all')
const only = args.filter((arg) => !arg.startsWith('--'))
const candidates = [...SCRIPTS, ...Object.keys(KNOWN_STALE)]
const unknown = only.filter((name) => !candidates.includes(name))
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}`)
  process.exit(2)
}
const selected = only.length
  ? candidates.filter((name) => only.includes(name))
  : runAll ? candidates : SCRIPTS

if (!only.length && !runAll) {
  for (const [name, reason] of Object.entries(KNOWN_STALE)) {
    console.log(`skip  ${name.padEnd(36)} known stale: ${reason}`)
  }
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const results = []

for (const name of selected) {
  const started = Date.now()
  // The guided suites print tens of thousands of "ok" lines; the default 1 MB
  // buffer would kill them mid-run and report a false failure.
  const run = spawnSync(npm, ['run', '--silent', name], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    shell: process.platform === 'win32',
  })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  results.push({ name, code: run.status ?? 1, seconds })
  console.log(`${run.status === 0 ? 'pass' : 'FAIL'}  ${name.padEnd(36)} ${seconds}s`)
  if (run.status !== 0) {
    const output = `${run.error ? `${run.error.message}\n` : ''}${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-15).join('\n')
    console.log(output.replace(/^/gm, '      '))
  }
}

const failed = results.filter((result) => result.code !== 0)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
