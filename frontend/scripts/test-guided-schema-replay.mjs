import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(scriptDir, '..')
const tempRoot = path.resolve(os.tmpdir())
const prefix = 'resonance-guided-schema-replay-'
const workDir = path.join(tempRoot, `${prefix}${process.pid}-${Date.now()}`)
const dataDir = path.join(workDir, 'data')
const logPath = path.join(workDir, 'postgres.log')
const stubPath = path.join(workDir, 'supabase-stubs.sql')
const baselinePath = path.join(frontendDir, 'supabase', 'migrations', '20260517010000_guided_tts_v1.sql')
const catalogPath = path.join(frontendDir, 'supabase', 'migrations', '20260907130000_guided_phrase_catalog.sql')
const localeCatalogPath = path.join(frontendDir, 'supabase', 'migrations', '20260907131000_guided_phrase_catalog_locales.sql')
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
    timeout: 120_000,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.error?.code})\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
  return (result.stdout ?? '').trim()
}

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

function psql(port, args) {
  return run('psql.exe', ['-X', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', '-d', 'postgres', ...args])
}

if (!safeWorkDir()) throw new Error(`Unsafe replay directory: ${workDir}`)
fs.mkdirSync(workDir, { recursive: false })

try {
  const port = await availablePort()
  run('initdb.exe', ['-D', dataDir, '-A', 'trust', '-U', 'postgres', '--no-locale', '--encoding=UTF8'])
  run('pg_ctl.exe', ['-D', dataDir, '-l', logPath, '-o', `-p ${port} -h 127.0.0.1`, '-w', 'start'], { stdio: 'ignore' })
  started = true

  fs.writeFileSync(stubPath, `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key);
create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
create table storage.objects (id bigint generated always as identity primary key, bucket_id text not null);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create function public.is_admin() returns boolean language sql stable as $$ select false $$;
create function public.phase1f_require_admin() returns uuid language sql as $$ select null::uuid $$;
create function public.phase1f_audit_admin_action(uuid,text,text,text,text,jsonb,jsonb,jsonb)
  returns void language sql as $$ select $$;
`)
  psql(port, ['-f', stubPath])
  psql(port, ['-f', baselinePath])
  psql(port, ['-f', catalogPath])
  if (fs.existsSync(localeCatalogPath)) psql(port, ['-f', localeCatalogPath])

  const count = psql(port, ['-A', '-t', '-c', 'select count(*) from public.guided_phrase_catalog'])
  if (count !== '2700') throw new Error(`Expected 2700 catalog rows, received ${count}`)
  const invoker = psql(port, ['-A', '-t', '-c', "select coalesce(array_to_string(reloptions, ','), '') from pg_class where oid = 'public.guided_tts_playback'::regclass"])
  if (!invoker.includes('security_invoker=true')) throw new Error(`Playback view is not security_invoker: ${invoker}`)
  const functionCount = psql(port, ['-A', '-t', '-c', "select count(*) from pg_proc where oid = 'public.keep_guided_phrase(text,text,text,text,text,text,text,text)'::regprocedure"])
  if (functionCount !== '1') throw new Error('keep_guided_phrase did not compile in the focused empty schema')
  if (fs.existsSync(localeCatalogPath)) {
    const localizedCount = psql(port, ['-A', '-t', '-c', 'select count(*) from public.guided_phrase_catalog where jsonb_object_length(translations) = 12'])
    if (localizedCount !== '2700') throw new Error(`Expected 2700 fully localized catalog rows, received ${localizedCount}`)
  }

  console.log(`Guided schema replay passed on isolated PostgreSQL ${port}: baseline + 2700 catalog rows${fs.existsSync(localeCatalogPath) ? ' × 12 locales' : ''} + RPC.`)
} finally {
  if (started) {
    spawnSync('pg_ctl.exe', ['-D', dataDir, '-m', 'immediate', '-w', 'stop'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
  }
  if (!safeWorkDir()) throw new Error(`Refusing unsafe cleanup: ${workDir}`)
  fs.rmSync(workDir, { recursive: true, force: true })
}
