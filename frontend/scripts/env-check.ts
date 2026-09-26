// Names-only environment map: which variables the code reads (scanned live, so
// it never goes stale) and whether each is set in the local .env files.
// Never prints a value. Production values live in Vercel (api/, src/) and
// Railway (worker) and are not readable here.
//   npm run env:check
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const frontend = resolve('.')
const orchestrator = resolve('..')

function walk(dir: string, pattern: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.venv', '__pycache__'].includes(name) || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, pattern, out)
    else if (pattern.test(name)) out.push(full)
  }
  return out
}

function namesIn(files: string[], regex: RegExp) {
  const names = new Set<string>()
  for (const file of files) for (const match of readFileSync(file, 'utf8').matchAll(regex)) names.add(match[1])
  return [...names].sort()
}

const components = {
  'Vercel functions (frontend/api)': namesIn(walk(join(frontend, 'api'), /\.ts$/), /process\.env\.([A-Z][A-Z0-9_]+)/g),
  'Browser bundle (frontend/src, VITE_*)': namesIn(walk(join(frontend, 'src'), /\.(ts|tsx)$/), /import\.meta\.env\.(VITE_[A-Z0-9_]+)/g),
  'Railway worker (orchestrator/src, cloud_engines)': namesIn(
    [...walk(join(orchestrator, 'src'), /\.py$/), ...walk(join(orchestrator, 'cloud_engines'), /\.py$/), join(orchestrator, 'job_runner.py')].filter(existsSync),
    /(?:os\.environ\.get|os\.getenv|os\.environ\[)\(?["']([A-Z][A-Z0-9_]+)["']/g,
  ).filter(name => !['LOCALAPPDATA', 'WINDIR'].includes(name)),
}

const localFiles = [join(orchestrator, '.env'), join(frontend, '.env'), join(frontend, '.env.local')]
const localNames = new Set<string>()
for (const file of localFiles) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*\S/)
    if (match) localNames.add(match[1])
  }
}

for (const [component, names] of Object.entries(components)) {
  console.log(`\n${component}: ${names.length} names`)
  for (const name of names) console.log(`  ${localNames.has(name) ? 'set    ' : 'missing'} ${name}`)
}
console.log('\n"set" means present in a local .env file (orchestrator/.env, frontend/.env, frontend/.env.local); production is configured in Vercel and Railway.')
