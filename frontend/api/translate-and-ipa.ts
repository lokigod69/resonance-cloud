// api/translate-and-ipa.ts
// Vercel Serverless Function: translate learner-provided target-language items
// and attach IPA for image-less text decks.

import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'

const TRANSLATE_MODEL = 'deepseek/deepseek-v4-flash'
const MAX_TOKENS = 3000
const MAX_ITEMS = 50
const MAX_ATTEMPTS = 2
const TRANSLATE_BODY_MAX_BYTES = 32 * 1024
const MAX_LANGUAGE_LENGTH = 50
const MAX_WORD_LENGTH = 240

interface TranslateInputItem {
  word: string
  is_phrase: boolean
}

interface TranslateBody {
  items: TranslateInputItem[]
  target_language: string
  base_language: string
}

interface TranslatedItem {
  word: string
  translation: string
  ipa: string
  is_phrase: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stripCodeFences(s: string): string {
  let stripped = s.trim()
  if (stripped.startsWith('```')) {
    stripped = stripped.replace(/^```[a-zA-Z]*\n?/, '')
    stripped = stripped.replace(/\n?```$/, '')
  }
  return stripped
}

function readTrimmedString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new ApiError(400, `Invalid or missing ${field}`)
  const trimmed = value.trim()
  if (!trimmed) throw new ApiError(400, `Invalid or missing ${field}`)
  if (trimmed.length > maxLength) throw new ApiError(400, `${field} is too long`)
  return trimmed
}

function validateBody(raw: unknown): TranslateBody {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  const allowedKeys = new Set(['items', 'target_language', 'base_language'])
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) throw new ApiError(400, `Unexpected field: ${key}`)
  }

  if (!Array.isArray(raw.items)) throw new ApiError(400, 'items must be an array')
  if (raw.items.length === 0) throw new ApiError(400, 'items must contain at least one item')
  if (raw.items.length > MAX_ITEMS) throw new ApiError(400, `items must contain at most ${MAX_ITEMS} items`)

  return {
    target_language: readTrimmedString(raw.target_language, 'target_language', MAX_LANGUAGE_LENGTH),
    base_language: readTrimmedString(raw.base_language, 'base_language', MAX_LANGUAGE_LENGTH),
    items: raw.items.map((entry, index) => {
      if (!isObject(entry)) throw new ApiError(400, `items[${index}] must be an object`)
      const isPhrase = entry.is_phrase === undefined ? false : entry.is_phrase
      if (typeof isPhrase !== 'boolean') throw new ApiError(400, `items[${index}].is_phrase must be boolean`)
      return {
        word: readTrimmedString(entry.word, `items[${index}].word`, MAX_WORD_LENGTH),
        is_phrase: isPhrase,
      }
    }),
  }
}

function buildSystemPrompt(): string {
  return [
    'You are a precise lexicographer for language learners.',
    'For each input item, return an accurate translation into the base language and an IPA phonetic transcription appropriate for the target language.',
    'Phrases must be translated and transcribed in full.',
    'If you cannot produce reliable IPA, return an empty string for ipa rather than guessing.',
    'Respond with only valid JSON. No markdown, no explanation, no code fences.',
    'Output format: {"items":[{"word":"...","translation":"...","ipa":"...","is_phrase":false}]}',
    'Preserve input order. Preserve each input word string verbatim. Never add, remove, or replace input items.',
  ].join('\n')
}

function buildUserPrompt(body: TranslateBody): string {
  return JSON.stringify({
    target_language: body.target_language,
    base_language: body.base_language,
    items: body.items,
  })
}

async function callOpenRouter(apiKey: string, systemPrompt: string, userPrompt: string): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
}

function parseTranslatedItems(content: string, inputs: TranslateInputItem[]): TranslatedItem[] | null {
  let parsed: { items?: unknown }
  try {
    parsed = JSON.parse(stripCodeFences(content))
  } catch {
    return null
  }

  if (!Array.isArray(parsed.items) || parsed.items.length !== inputs.length) {
    return null
  }

  const output: TranslatedItem[] = []
  for (let index = 0; index < inputs.length; index++) {
    const raw = parsed.items[index]
    if (!isObject(raw)) return null
    const translation = typeof raw.translation === 'string' ? raw.translation.trim() : ''
    if (!translation) return null
    output.push({
      word: inputs[index].word,
      translation,
      ipa: typeof raw.ipa === 'string' ? raw.ipa.trim() : '',
      is_phrase: inputs[index].is_phrase,
    })
  }
  return output
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  let body: TranslateBody
  try {
    const user = await requireSupabaseUser(req)
    const rawBody = await readJsonWithLimit<unknown>(req, TRANSLATE_BODY_MAX_BYTES)
    body = validateBody(rawBody)
    await consumeApiQuota(user.id, 'suggest_words')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('[translate-and-ipa] request gate failed:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return errorResponse(req, 500, 'Translation service is not configured')
  }

  const baseSystemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(body)
  let lastDetail = 'Translation service unavailable'

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const systemPrompt = attempt === 0
      ? baseSystemPrompt
      : `${baseSystemPrompt}\n\nYour previous response was invalid. Return exactly ${body.items.length} items in the same order, preserving every input word verbatim.`

    try {
      const llmRes = await callOpenRouter(apiKey, systemPrompt, userPrompt)
      if (!llmRes.ok) {
        lastDetail = llmRes.status === 429
          ? 'Too many requests. Please wait a moment.'
          : 'Translation service unavailable'
        continue
      }

      const llmData = await llmRes.json()
      const content = llmData?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        lastDetail = 'Invalid response from translation service'
        continue
      }

      const items = parseTranslatedItems(content, body.items)
      if (!items) {
        lastDetail = 'Translation service returned malformed or mismatched items'
        continue
      }

      return jsonResponse(req, { items }, 200)
    } catch (err) {
      console.error('[translate-and-ipa] OpenRouter attempt failed:', err instanceof Error ? err.message : err)
      lastDetail = err instanceof TypeError && err.message.includes('fetch')
        ? 'Translation service unreachable'
        : 'Translation service unavailable'
    }
  }

  return jsonResponse(req, { detail: lastDetail }, 502)
}
