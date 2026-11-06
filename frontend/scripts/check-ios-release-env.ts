import { loadEnv } from 'vite'

// Vite's ios mode reads .env, .env.local and the mode-specific files.
// A release can compile successfully and then fail on first launch without these.
const env = loadEnv('ios', process.cwd(), 'VITE_')
const project = 'rkiucrrusrwgcviodysp'
const required = {
  VITE_SUPABASE_URL: `https://${project}.supabase.co`,
  VITE_PUBLIC_WEB_ORIGIN: 'https://lingwave.ai',
  VITE_PUBLIC_API_ORIGIN: 'https://lingwave.ai',
  VITE_NATIVE_AUTH_REDIRECT_URL: 'resonance://auth/callback',
}

for (const [name, expected] of Object.entries(required)) {
  if (env[name] !== expected) throw new Error(`Configure ${name} for the production Lingwave app before building iOS.`)
}

const key = env.VITE_SUPABASE_ANON_KEY ?? ''
function isPublicKey(): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return payload.role === 'anon' && payload.ref === project
  } catch {
    return false
  }
}
if (!isPublicKey()) {
  throw new Error('Set VITE_SUPABASE_ANON_KEY to the production project’s publishable key or legacy anon key in an ignored local env file.')
}
// A publishable key does not contain a project reference. Confirm it belongs
// to Lingwave with the public, read-only settings endpoint before archiving.
const settings = await fetch(`${required.VITE_SUPABASE_URL}/auth/v1/settings`, {
  headers: { apikey: key },
  redirect: 'error',
  signal: AbortSignal.timeout(15000),
})
if (!settings.ok || !(await settings.json()).external) {
  throw new Error(`Production auth settings check failed (HTTP ${settings.status}). Check the public client key and network, then rebuild.`)
}
console.log('Verified iOS production origins, native callback and access to the project’s public auth settings.')
