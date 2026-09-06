// api/extract-vocabulary.ts
// Vercel Serverless Function: extract useful target-language vocabulary from
// voice tutor transcripts for image-less text decks.

import { createClient } from '@supabase/supabase-js'
import { requestFetch, withRequestDeadline } from './_shared/requestDeadline'
import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, fetchWithTimeout, jsonResponse, readJsonWithLimit } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'
import { writeUsageEvent } from './_shared/usageEvents'
import { openRouterCost, type LlmUsage } from './_shared/usageCost'

const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash'
const EXTRACT_BODY_MAX_BYTES = 512 * 1024
const MAX_LANGUAGE_LENGTH = 50
const MAX_MESSAGE_LENGTH = 4_000
const DEFAULT_MAX_ITEMS = 10
const HARD_MAX_ITEMS = 25
const APPROX_TRANSCRIPT_TOKEN_LIMIT = 8_000

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ExtractBody {
  conversation_id?: string
  messages?: TranscriptMessage[]
  target_language: string
  base_language: string
  max_items: number
  include_words: boolean
  include_phrases: boolean
}

interface ExtractedItem {
  word: string
  translation: string
  ipa: string
  is_phrase: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readTrimmedString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new ApiError(400, `Invalid or missing ${field}`)
  const trimmed = value.trim()
  if (!trimmed) throw new ApiError(400, `Invalid or missing ${field}`)
  if (trimmed.length > maxLength) throw new ApiError(400, `${field} is too long`)
  return trimmed
}

function readOptionalBoolean(value: unknown, defaultValue: boolean, field: string): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value !== 'boolean') throw new ApiError(400, `${field} must be boolean`)
  return value
}

function validateMessages(value: unknown): TranscriptMessage[] {
  if (!Array.isArray(value)) throw new ApiError(400, 'messages must be an array')
  return value.map((entry, index) => {
    if (!isObject(entry)) throw new ApiError(400, `messages[${index}] must be an object`)
    if (entry.role !== 'user' && entry.role !== 'assistant') {
      throw new ApiError(400, `messages[${index}].role is invalid`)
    }
    return {
      role: entry.role,
      content: readTrimmedString(entry.content, `messages[${index}].content`, MAX_MESSAGE_LENGTH),
    }
  })
}

function validateBody(raw: unknown): ExtractBody {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  const allowedKeys = new Set([
    'conversation_id',
    'messages',
    'target_language',
    'base_language',
    'max_items',
    'include_words',
    'include_phrases',
  ])
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) throw new ApiError(400, `Unexpected field: ${key}`)
  }

  const hasConversationId = raw.conversation_id !== undefined && raw.conversation_id !== null
  const hasMessages = raw.messages !== undefined && raw.messages !== null
  if (hasConversationId === hasMessages) {
    throw new ApiError(400, 'Provide either conversation_id or messages, but not both')
  }

  let maxItems = DEFAULT_MAX_ITEMS
  if (raw.max_items !== undefined && raw.max_items !== null) {
    if (!Number.isInteger(raw.max_items) || (raw.max_items as number) < 1) {
      throw new ApiError(400, 'max_items must be a positive integer')
    }
    maxItems = Math.min(raw.max_items as number, HARD_MAX_ITEMS)
  }

  const includeWords = readOptionalBoolean(raw.include_words, true, 'include_words')
  const includePhrases = readOptionalBoolean(raw.include_phrases, true, 'include_phrases')
  if (!includeWords && !includePhrases) {
    throw new ApiError(400, 'At least one of include_words or include_phrases must be true')
  }

  return {
    conversation_id: hasConversationId
      ? readTrimmedString(raw.conversation_id, 'conversation_id', 80)
      : undefined,
    messages: hasMessages ? validateMessages(raw.messages) : undefined,
    target_language: readTrimmedString(raw.target_language, 'target_language', MAX_LANGUAGE_LENGTH),
    base_language: readTrimmedString(raw.base_language, 'base_language', MAX_LANGUAGE_LENGTH),
    max_items: maxItems,
    include_words: includeWords,
    include_phrases: includePhrases,
  }
}

function getSupabaseServiceEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  }
}

function createServiceClient() {
  const { url, key } = getSupabaseServiceEnv()
  if (!url || !key) throw new ApiError(500, 'Conversation service is not configured')
  return createClient(url, key, {
    global: { fetch: requestFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function loadConversationMessages(conversationId: string, userId: string): Promise<TranscriptMessage[]> {
  const supabase = createServiceClient()
  const { data: conversation, error: conversationError } = await supabase
    .from('speak_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (conversationError) {
    console.error('[extract-vocabulary] conversation ownership check failed:', conversationError.message)
    throw new ApiError(502, 'Unable to load conversation')
  }
  if (!conversation) {
    throw new ApiError(403, 'Conversation not found or not owned by user')
  }

  const { data, error } = await supabase
    .from('speak_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[extract-vocabulary] message fetch failed:', error.message)
    throw new ApiError(502, 'Unable to load conversation messages')
  }

  const messages: TranscriptMessage[] = []
  for (const row of data || []) {
    if (
      (row.role === 'user' || row.role === 'assistant') &&
      typeof row.content === 'string' &&
      row.content.trim().length > 0
    ) {
      messages.push({
        role: row.role,
        content: row.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      })
    }
  }
  return messages
}

function approximateTokens(message: TranscriptMessage): number {
  return Math.ceil(message.content.length / 4) + 4
}

function trimTranscript(messages: TranscriptMessage[]): TranscriptMessage[] {
  const selected: TranscriptMessage[] = []
  let total = 0
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const cost = approximateTokens(message)
    if (selected.length > 0 && total + cost > APPROX_TRANSCRIPT_TOKEN_LIMIT) break
    selected.unshift(message)
    total += cost
  }
  return selected
}

function buildItemKindPhrase(body: ExtractBody): string {
  if (body.include_words && body.include_phrases) return 'words and phrases'
  if (body.include_words) return 'words only'
  return 'phrases only'
}

function buildSystemPrompt(body: ExtractBody): string {
  return `You are a language-learning assistant. The transcript is a conversation between a learner and an AI tutor. The learner is studying ${body.target_language}. The learner's base language is ${body.base_language}.

Identify up to ${body.max_items} of the most useful, distinctive, learnable ${body.target_language} items (${buildItemKindPhrase(body)}) that appeared in the conversation. Prefer items the learner is likely to encounter again. Skip greetings, filler, function words, and anything trivially basic.

For each item, return:
- word: the original target-language form, exactly as it appeared if possible
- translation: an accurate translation into ${body.base_language}
- ipa: an IPA transcription; use an empty string if you cannot produce reliable IPA
- is_phrase: true for multi-word expressions, otherwise false

Return only valid JSON of the form {"items":[{"word":"...","translation":"...","ipa":"...","is_phrase":false}]}. If the transcript contains no suitable items, return {"items":[]}.`
}

// A hung OpenRouter call must not pin the function (audit 2026-09-03 A-07).
const OPENROUTER_TIMEOUT_MS = 20_000

async function callOpenRouter(apiKey: string, systemPrompt: string, transcript: TranscriptMessage[]): Promise<Response> {
  return fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ transcript }) },
      ],
      response_format: { type: 'json_object' },
    }),
  }, OPENROUTER_TIMEOUT_MS)
}

function stripCodeFences(s: string): string {
  let stripped = s.trim()
  if (stripped.startsWith('```')) {
    stripped = stripped.replace(/^```[a-zA-Z]*\n?/, '')
    stripped = stripped.replace(/\n?```$/, '')
  }
  return stripped
}

function parseItems(content: string, body: ExtractBody): ExtractedItem[] {
  let parsed: { items?: unknown }
  try {
    parsed = JSON.parse(stripCodeFences(content))
  } catch {
    return []
  }

  if (!Array.isArray(parsed.items)) return []

  const cleaned: ExtractedItem[] = []
  for (const raw of parsed.items) {
    if (!isObject(raw)) continue
    const word = typeof raw.word === 'string' ? raw.word.trim() : ''
    const translation = typeof raw.translation === 'string' ? raw.translation.trim() : ''
    if (!word || !translation) continue
    const isPhrase = typeof raw.is_phrase === 'boolean'
      ? raw.is_phrase
      : /\s/.test(word)
    if (isPhrase && !body.include_phrases) continue
    if (!isPhrase && !body.include_words) continue
    cleaned.push({
      word,
      translation,
      ipa: typeof raw.ipa === 'string' ? raw.ipa.trim() : '',
      is_phrase: isPhrase,
    })
    if (cleaned.length >= body.max_items) break
  }
  return cleaned
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  return withRequestDeadline(req, handlePost)
}

async function handlePost(req: Request): Promise<Response> {
  let body: ExtractBody
  let userId: string
  try {
    const user = await requireSupabaseUser(req)
    userId = user.id
    const rawBody = await readJsonWithLimit<unknown>(req, EXTRACT_BODY_MAX_BYTES)
    body = validateBody(rawBody)
    if (!process.env.OPENROUTER_API_KEY) throw new ApiError(503, 'Vocabulary extraction service is not configured')
    await consumeApiQuota(user.id, 'voice_chat')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[extract-vocabulary] request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  let transcript: TranscriptMessage[]
  try {
    transcript = body.messages ?? await loadConversationMessages(body.conversation_id!, userId)
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[extract-vocabulary] transcript load failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 502, 'Unable to load transcript')
  }

  const cleanTranscript = trimTranscript(
    transcript.filter(message => message.content.trim().length > 0),
  )
  if (cleanTranscript.length === 0) {
    return jsonResponse(req, { items: [], ...(body.conversation_id ? { conversation_id: body.conversation_id } : {}) }, 200)
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return errorResponse(req, 503, 'Vocabulary extraction service is not configured')
  }

  const startedAt = Date.now()
  try {
    const llmRes = await callOpenRouter(apiKey, buildSystemPrompt(body), cleanTranscript)
    if (!llmRes.ok) {
      await writeUsageEvent({
        userId, feature: 'extract_vocab', stage: 'enrichment', status: 'failed',
        modelProvider: 'openrouter', modelName: OPENROUTER_MODEL,
        latencyMs: Date.now() - startedAt, errorType: `http_${llmRes.status}`,
      })
      return jsonResponse(req, { detail: 'Vocabulary extraction service unavailable' }, 502)
    }

    const llmJson = await llmRes.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: LlmUsage }
    const content = llmJson.choices?.[0]?.message?.content?.trim() || '{"items":[]}'
    const items = parseItems(content, body)

    const cost = openRouterCost(OPENROUTER_MODEL, llmJson.usage)
    await writeUsageEvent({
      userId, feature: 'extract_vocab', stage: 'enrichment', status: 'success',
      modelProvider: 'openrouter', modelName: OPENROUTER_MODEL,
      costUsd: cost.costUsd, tokensIn: cost.tokensIn, tokensOut: cost.tokensOut,
      latencyMs: Date.now() - startedAt, metadata: { items_returned: items.length },
    })

    return jsonResponse(req, {
      items,
      ...(body.conversation_id ? { conversation_id: body.conversation_id } : {}),
    }, 200)
  } catch (err) {
    console.error('[extract-vocabulary] OpenRouter call failed:', err instanceof Error ? err.message : err)
    await writeUsageEvent({
      userId, feature: 'extract_vocab', stage: 'enrichment', status: 'failed',
      modelProvider: 'openrouter', modelName: OPENROUTER_MODEL,
      latencyMs: Date.now() - startedAt,
      errorType: err instanceof Error ? err.name : 'unknown',
    })
    return jsonResponse(req, { detail: 'Vocabulary extraction service unavailable' }, 502)
  }
}
