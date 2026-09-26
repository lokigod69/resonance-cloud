// Finds dead references in the project skills (orchestrator/.claude/skills/*/SKILL.md):
// backticked repo paths that no longer exist, and backticked ALL_CAPS / camelCase
// identifiers that no longer appear anywhere in frontend/src, frontend/api,
// frontend/scripts or the Python worker. Run at language-work checkpoints:
//   npm run check:skills
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const frontend = resolve('.')
const orchestrator = resolve('..')
const skillsDir = join(orchestrator, '.claude', 'skills')

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|mjs|py|sql|json)$/.test(name) && stat.size < 4_000_000) out.push(full)
  }
  return out
}

const corpus = [
  ...walk(join(frontend, 'src')), ...walk(join(frontend, 'api')), ...walk(join(frontend, 'scripts')),
  ...walk(join(frontend, 'supabase', 'migrations')), ...walk(join(orchestrator, 'src')),
  ...walk(join(orchestrator, 'cloud_engines')), ...walk(join(orchestrator, 'scripts')),
].map(file => readFileSync(file, 'utf8')).join('\n')
const packageScripts = Object.keys(JSON.parse(readFileSync(join(frontend, 'package.json'), 'utf8')).scripts)

// A path may be written relative to frontend/, orchestrator/ or the workspace root.
function pathExists(ref: string) {
  const clean = ref.replace(/[:#].*$/, '').replace(/\/$/, '')
  if (/[{*<>]/.test(clean)) return true // templates such as src/data/guided/{lang}A1.ts
  return [frontend, orchestrator, resolve(orchestrator, '..')].some(base =>
    existsSync(join(base, clean)) || existsSync(join(base, clean.replace(/^orchestrator\//, ''))))
}

let dead = 0
for (const skill of readdirSync(skillsDir)) {
  const file = join(skillsDir, skill, 'SKILL.md')
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  const problems = new Set<string>()
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const ref = token.trim()
    if (/^(frontend\/|orchestrator\/|src\/|scripts\/|api\/|docs\/|supabase\/|tests\/|\.\.\/docs\/)[\w./{}*<>-]+$/.test(ref)) {
      if (!pathExists(ref)) problems.add(`missing path: ${ref}`)
    } else if (/^npm run [\w:-]+$/.test(ref)) {
      const name = ref.slice('npm run '.length)
      if (!packageScripts.includes(name)) problems.add(`missing npm script: ${name}`)
    } else if (/^[A-Z][A-Z0-9_]{4,}$/.test(ref) || /^[a-z]+[A-Z][A-Za-z0-9]+$/.test(ref)) {
      if (!corpus.includes(ref)) problems.add(`unknown identifier: ${ref}`)
    }
  }
  for (const problem of problems) console.log(`${skill}: ${problem}`)
  dead += problems.size
}
console.log(dead ? `\n${dead} dead skill reference(s)` : 'Skill references: all resolve')
process.exit(dead ? 1 : 0)
