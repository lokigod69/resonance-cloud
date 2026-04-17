// Vercel Serverless Function - Gemini voice sample lookup
// POST /api/voice-sample
// Body: { voice_name, language }
// Returns: { url }
//
// Read-only cache: samples are pre-generated offline and stored in Supabase.
// This endpoint never calls Gemini TTS. Cache miss => 404.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const NEUTRAL_CHARACTER_MODE_ID = '_neutral'
const NEUTRAL_ACCENT_ID = 'none'
const SAMPLE_VERSION = 1

// KEEP IN SYNC with src/data/geminiVoices.ts
const GEMINI_VOICE_NAMES: ReadonlySet<string> = new Set([
  'Achernar', 'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Aoede', 'Autonoe',
  'Callirrhoe', 'Charon', 'Enceladus', 'Erinome', 'Fenrir', 'Gacrux', 'Iapetus',
  'Kore', 'Laomedeia', 'Leda', 'Pulcherrima', 'Rasalgethi', 'Sadachbia',
  'Sadaltager', 'Schedar', 'Sulafat', 'Umbriel', 'Zephyr', 'Zubenelgenubi',
])

// KEEP IN SYNC with src/data/geminiVoiceSampleSentences.ts
const SUPPORTED_SAMPLE_LANGUAGES = new Set([
  'en', 'de', 'fr', 'it', 'es', 'ko', 'ceb', 'fil', 'id',
])

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request): Promise<Response> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: 'Supabase service credentials not configured' }, 500)
  }

  let body: { voice_name?: string; language?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const voice_name = body.voice_name ?? ''
  const language = body.language ?? ''

  if (!GEMINI_VOICE_NAMES.has(voice_name)) return json({ error: `Unknown voice: ${voice_name}` }, 400)
  if (!SUPPORTED_SAMPLE_LANGUAGES.has(language)) return json({ error: `Unsupported language: ${language}` }, 400)

  const admin = createClient(supabaseUrl, supabaseServiceKey)
  const { data: existing } = await admin
    .from('voice_samples')
    .select('storage_url')
    .eq('voice_name', voice_name)
    .eq('language', language)
    .eq('character_mode_id', NEUTRAL_CHARACTER_MODE_ID)
    .eq('version', SAMPLE_VERSION)
    .eq('accent_id', NEUTRAL_ACCENT_ID)
    .is('invalidated_at', null)
    .maybeSingle()

  if (!existing?.storage_url) {
    return json({ error: 'Sample not yet available for this voice/language' }, 404)
  }

  return json({ url: existing.storage_url }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
