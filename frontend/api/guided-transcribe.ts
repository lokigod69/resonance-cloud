import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit, sanitizedProviderError } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'

type GuidedTranscribeBody = {
  audio_base64: string
  mime_type: string
  language?: 'en-US' | 'en-GB'
}

const GUIDED_TRANSCRIBE_BODY_MAX_BYTES = 4 * 1024 * 1024
const MAX_AUDIO_BASE64_LENGTH = 3_200_000
const MAX_DECODED_AUDIO_BYTES = 2.4 * 1024 * 1024
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mp4;codecs=mp4a',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/ogg;codecs=opus',
]

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  let body: GuidedTranscribeBody
  try {
    const user = await requireSupabaseUser(req)
    const rawBody = await readJsonWithLimit<unknown>(req, GUIDED_TRANSCRIBE_BODY_MAX_BYTES)
    body = validateGuidedTranscribeBody(rawBody)
    await consumeApiQuota(user.id, 'voice_chat')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[guided-transcribe] Request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    return errorResponse(req, 500, 'Speech transcription service is not configured')
  }

  try {
    const audioBuffer = Buffer.from(body.audio_base64, 'base64')
    const extension = getAudioExtension(body.mime_type)
    const audioBlob = new Blob([audioBuffer], { type: body.mime_type })
    const formData = new FormData()
    formData.append('file', audioBlob, `guided-today.${extension}`)
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'json')
    formData.append('language', 'en')

    const sttRes = await fetchWithTimeout('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    }, 15000)

    if (!sttRes.ok) {
      return sanitizedProviderError(req, 'Speech transcription service unavailable')
    }

    const sttJson = await sttRes.json() as { text?: string }
    return jsonResponse(req, { transcript: sttJson.text?.trim() ?? '' }, 200)
  } catch (err) {
    console.error('[guided-transcribe] STT failed:', err instanceof Error ? err.message : err)
    return sanitizedProviderError(req, 'Speech transcription service unavailable')
  }
}

function validateGuidedTranscribeBody(raw: unknown): GuidedTranscribeBody {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  if ('history' in raw || 'transcript' in raw || 'messages' in raw) {
    throw new ApiError(400, 'Conversation history is not supported')
  }

  const audioBase64 = readString(raw.audio_base64, 'audio_base64', MAX_AUDIO_BASE64_LENGTH, true)
  const decodedLength = decodedBase64Length(audioBase64)
  if (decodedLength < 100) {
    throw new ApiError(400, 'audio_base64 is too small')
  }
  if (decodedLength > MAX_DECODED_AUDIO_BYTES) {
    throw new ApiError(413, 'audio_base64 is too large')
  }

  const mimeType = normalizeMimeType(readString(raw.mime_type, 'mime_type', 128, true))
  if (!isSupportedMimeType(mimeType)) {
    throw new ApiError(400, 'Unsupported mime_type')
  }

  let language: GuidedTranscribeBody['language']
  if (raw.language !== undefined) {
    const rawLanguage = readString(raw.language, 'language', 16, true)
    if (rawLanguage !== 'en-US' && rawLanguage !== 'en-GB') {
      throw new ApiError(400, 'Unsupported language')
    }
    language = rawLanguage
  }

  return {
    audio_base64: audioBase64,
    mime_type: mimeType,
    language,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, field: string, maxLength: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${field} is required`)
    return ''
  }
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be a string`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new ApiError(400, `${field} is required`)
  if (trimmed.length > maxLength) throw new ApiError(400, `${field} is too long`)
  return trimmed
}

function decodedBase64Length(value: string): number {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new ApiError(400, 'audio_base64 is malformed')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

function normalizeMimeType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType)
    || mimeType.startsWith('audio/webm;codecs=')
    || mimeType.startsWith('audio/mp4;codecs=')
    || mimeType.startsWith('audio/ogg;codecs=')
}

function getAudioExtension(mimeType: string): 'webm' | 'mp4' | 'mp3' | 'wav' | 'ogg' {
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}
