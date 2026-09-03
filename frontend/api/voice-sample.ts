// Vercel Serverless Function - Gemini voice sample lookup
// POST /api/voice-sample
// Body: { voice_name, language }
// Returns: { url }
//
// Read-only cache: samples are pre-generated offline and stored in Supabase.
// This endpoint never calls Gemini TTS. Cache miss => 404.
//
// Signed-in callers only (audit 2026-09-03 A-04): the lookup runs with the
// service role, so it must not be an anonymous surface, and the body is
// size-capped like every other handler.

import { createClient } from '@supabase/supabase-js'
import { optionsResponse } from './_shared/cors'
import { requireSupabaseUser } from './_shared/auth'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'

const VOICE_SAMPLE_BODY_MAX_BYTES = 1024

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

export async function OPTIONS(req: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireSupabaseUser(req)

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new ApiError(503, 'Voice samples are not configured')
    }

    const body = await readJsonWithLimit<{ voice_name?: unknown; language?: unknown }>(
      req,
      VOICE_SAMPLE_BODY_MAX_BYTES,
    )
    const voiceName = typeof body.voice_name === 'string' ? body.voice_name : ''
    const language = typeof body.language === 'string' ? body.language : ''

    // Static messages on purpose: never echo caller input back.
    if (!GEMINI_VOICE_NAMES.has(voiceName)) throw new ApiError(400, 'Unknown voice')
    if (!SUPPORTED_SAMPLE_LANGUAGES.has(language)) throw new ApiError(400, 'Unsupported language')

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: existing, error } = await admin
      .from('voice_samples')
      .select('storage_url')
      .eq('voice_name', voiceName)
      .eq('language', language)
      .eq('character_mode_id', NEUTRAL_CHARACTER_MODE_ID)
      .eq('version', SAMPLE_VERSION)
      .eq('accent_id', NEUTRAL_ACCENT_ID)
      .is('invalidated_at', null)
      .maybeSingle()

    if (error) {
      console.error('[voice-sample] lookup failed:', error.message)
      return errorResponse(req, 502, 'Voice sample lookup failed')
    }
    if (!existing?.storage_url) {
      return errorResponse(req, 404, 'Sample not yet available for this voice/language')
    }

    return jsonResponse(req, { url: existing.storage_url })
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[voice-sample] failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 500, 'Voice sample lookup failed')
  }
}
