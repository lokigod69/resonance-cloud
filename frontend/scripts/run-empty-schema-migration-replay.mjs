import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const execute = process.argv.includes('--execute')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(scriptDir, '..')
const sourceMigrations = path.join(frontendDir, 'supabase', 'migrations')
const tempRoot = path.resolve(os.tmpdir())
const prefix = 'resonance-supabase-empty-replay-'
const projectId = `${prefix}${process.pid}-${Date.now()}`
const workDir = path.join(tempRoot, projectId)
let started = false

function safeWorkDir() {
  const resolved = path.resolve(workDir)
  return path.dirname(resolved) === tempRoot && path.basename(resolved).startsWith(prefix)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: frontendDir,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15 * 60_000,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.error?.code})\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
  return (result.stdout ?? '').trim()
}

async function canListen(port) {
  return await new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

async function availablePortBlock() {
  for (let base = 54000 + (process.pid % 500); base < 65000; base += 509) {
    const available = await Promise.all(Array.from({ length: 10 }, (_, offset) => canListen(base + offset)))
    if (available.every(Boolean)) return base
  }
  throw new Error('Could not reserve an available local port block for the replay project')
}

function assignUniquePorts(config, base) {
  const replacements = new Map([
    ['54321', String(base)],
    ['54322', String(base + 1)],
    ['54323', String(base + 2)],
    ['54324', String(base + 3)],
    ['54327', String(base + 6)],
    ['54329', String(base + 8)],
  ])
  let output = config.replace(/^project_id\s*=.*$/m, `project_id = "${projectId}"`)
  for (const [standard, unique] of replacements) output = output.replaceAll(standard, unique)
  return output
}

if (!safeWorkDir()) throw new Error(`Unsafe replay directory: ${workDir}`)
if (!fs.existsSync(sourceMigrations)) throw new Error(`Migration source is missing: ${sourceMigrations}`)
fs.mkdirSync(workDir, { recursive: false })

try {
  run('supabase.exe', ['init', '--workdir', workDir, '--force'])
  const scratchSupabase = path.join(workDir, 'supabase')
  const scratchMigrations = path.join(scratchSupabase, 'migrations')
  fs.cpSync(sourceMigrations, scratchMigrations, { recursive: true })
  const linkedMarker = path.join(scratchSupabase, '.temp', 'project-ref')
  if (fs.existsSync(linkedMarker)) throw new Error('Scratch replay unexpectedly contains a linked-project marker')

  const configPath = path.join(scratchSupabase, 'config.toml')
  const portBase = await availablePortBlock()
  fs.writeFileSync(configPath, assignUniquePorts(fs.readFileSync(configPath, 'utf8'), portBase))

  const migrationNames = fs.readdirSync(scratchMigrations).filter((name) => name.endsWith('.sql')).sort()
  if (!migrationNames.includes('20260517010000_guided_tts_v1.sql')) throw new Error('Restored Guided TTS baseline is absent from scratch replay')
  if (!migrationNames.includes('20260907130000_guided_phrase_catalog.sql')) throw new Error('Guided phrase catalog migration is absent from scratch replay')

  if (!execute) {
    console.log(`Scratch replay prepared safely with ${migrationNames.length} migrations; pass --execute when Docker is available.`)
  } else {
    run('docker.exe', ['info'], { timeout: 30_000 })
    const excluded = 'gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'
    run('supabase.exe', ['start', '--workdir', workDir, '--exclude', excluded, '--yes'])
    started = true
    run('supabase.exe', ['db', 'reset', '--workdir', workDir, '--local', '--no-seed', '--yes'])
    console.log(`Full empty-schema migration replay passed in isolated project ${projectId}.`)
  }
} finally {
  if (started) {
    spawnSync('supabase.exe', ['stop', '--workdir', workDir, '--no-backup', '--yes'], {
      cwd: frontendDir, encoding: 'utf8', windowsHide: true, timeout: 120_000,
    })
  }
  if (!safeWorkDir()) throw new Error(`Refusing unsafe cleanup: ${workDir}`)
  fs.rmSync(workDir, { recursive: true, force: true })
}
