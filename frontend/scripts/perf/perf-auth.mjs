import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

export const BENCHMARK_EMAIL = 'perf-bench@lingwave-bench.local'
export const BENCHMARK_CREDENTIALS_FILE = '.benchmark-user.json'

const BENCHMARK_PROFILE = {
  display_name: 'Lingwave Perf Benchmark',
  base_language: 'English',
  role: 'learner',
  credits: 100,
  new_words_per_day: 10,
  seen_tutorials: {},
  avatar_path: null,
  avatar_updated_at: null,
}

export function getSupabaseAuthStorageKey(supabaseUrl) {
  const { hostname } = new URL(supabaseUrl)
  const projectRef = hostname.endsWith('.supabase.co')
    ? hostname.split('.')[0]
    : hostname.replace(/[^a-zA-Z0-9-]/g, '-')
  return `sb-${projectRef}-auth-token`
}

export function makeSupabaseAuthStorageValue(session) {
  return {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  }
}

export function makeBenchmarkAuthInjectionScript(auth) {
  const storageValue = JSON.stringify(makeSupabaseAuthStorageValue(auth.session))
  const profileValue = JSON.stringify(auth.profileCacheValue)

  return `
(() => {
  try {
    window.localStorage.setItem(${JSON.stringify(auth.storageKey)}, ${JSON.stringify(storageValue)});
    window.localStorage.setItem(${JSON.stringify(auth.profileCacheKey)}, ${JSON.stringify(profileValue)});
  } catch {
    // Storage injection is best effort; the route will redirect if auth cannot read it.
  }
})();
`
}

export async function prepareBenchmarkAuth({ frontendRoot, scriptDir }) {
  const env = await loadBenchmarkEnv(frontendRoot)
  const credentialsPath = path.join(scriptDir, BENCHMARK_CREDENTIALS_FILE)
  const credentials = await readOrCreateBenchmarkCredentials(credentialsPath)

  const admin = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const anon = createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const user = await ensureBenchmarkUser(admin, credentials)
  await persistBenchmarkCredentials(credentialsPath, { ...credentials, userId: user.id })
  await ensureBenchmarkProfile(admin, user.id, credentials.email)

  const { data, error } = await anon.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    throw new Error(`Benchmark user sign-in failed: ${error.message}`)
  }
  if (!data.session) {
    throw new Error('Benchmark user sign-in did not return a session')
  }

  return {
    email: credentials.email,
    userId: user.id,
    session: data.session,
    storageKey: getSupabaseAuthStorageKey(env.supabaseUrl),
    profileCacheKey: `resonance_auth_profile_${user.id}`,
    profileCacheValue: BENCHMARK_PROFILE,
  }
}

async function loadBenchmarkEnv(frontendRoot) {
  const fileEnv = {
    ...(await readEnvFile(path.join(frontendRoot, '.env'))),
    ...(await readEnvFile(path.join(frontendRoot, '.env.local'))),
  }
  const env = { ...fileEnv, ...process.env }
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL or VITE_SUPABASE_URL')
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    throw new Error(`Missing benchmark Supabase environment variable(s): ${missing.join(', ')}`)
  }

  return { supabaseUrl, anonKey, serviceRoleKey }
}

async function readEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return parseEnv(content)
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
}

function parseEnv(content) {
  const values = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsIndex = line.indexOf('=')
    if (equalsIndex <= 0) continue

    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

async function readOrCreateBenchmarkCredentials(credentialsPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(credentialsPath, 'utf8'))
    if (parsed?.email === BENCHMARK_EMAIL && typeof parsed.password === 'string' && parsed.password.length >= 24) {
      return parsed
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Benchmark credentials file is invalid: ${credentialsPath}`)
    }
  }

  const credentials = {
    email: BENCHMARK_EMAIL,
    password: generateBenchmarkPassword(),
    createdAt: new Date().toISOString(),
  }
  await persistBenchmarkCredentials(credentialsPath, credentials)
  return credentials
}

async function persistBenchmarkCredentials(credentialsPath, credentials) {
  await fs.writeFile(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
}

function generateBenchmarkPassword() {
  return `LwPerf_${randomBytes(30).toString('base64url')}!9`
}

async function ensureBenchmarkUser(admin, credentials) {
  let user = credentials.userId ? await getUserById(admin, credentials.userId) : null
  if (!user || user.email !== credentials.email) {
    user = await findUserByEmail(admin, credentials.email)
  }

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: credentials.email,
      password: credentials.password,
      email_confirm: true,
      user_metadata: { full_name: BENCHMARK_PROFILE.display_name },
    })
    if (error) {
      if (!/already|registered|exists/i.test(error.message ?? '')) {
        throw new Error(`Could not create benchmark user: ${error.message}`)
      }
      user = await findUserByEmail(admin, credentials.email)
    } else {
      user = data.user
    }
  }

  if (!user) {
    throw new Error('Could not resolve benchmark user after create/find attempt')
  }

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password: credentials.password,
    email_confirm: true,
    user_metadata: { full_name: BENCHMARK_PROFILE.display_name },
  })
  if (error) {
    throw new Error(`Could not update benchmark user: ${error.message}`)
  }

  return data.user ?? user
}

async function getUserById(admin, userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error) return null
  return data.user ?? null
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      throw new Error(`Could not list users for benchmark setup: ${error.message}`)
    }

    const user = data.users.find((candidate) => candidate.email === email)
    if (user) return user
    if (data.users.length < 1000) return null
  }

  return null
}

async function ensureBenchmarkProfile(admin, userId, email) {
  const { error } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        ...BENCHMARK_PROFILE,
      },
      { onConflict: 'id' },
    )

  if (error) {
    throw new Error(`Could not upsert benchmark profile: ${error.message}`)
  }
}
