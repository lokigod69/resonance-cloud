// api/suggest-words.ts
// Vercel Serverless Function: LLM-powered word suggestions by category.
// Called by CategoryPicker.tsx in the generate flow.
// Local dev: Vite proxy forwards /api/* to localhost:8090 (FastAPI orchestrator).
// Production: this serverless function handles the request directly.

import { optionsResponse } from './_shared/cors'
import { ApiError, apiErrorResponse, errorResponse, jsonResponse, readJsonWithLimit } from './_shared/http'
import { requireSupabaseUser } from './_shared/auth'
import { consumeApiQuota } from './_shared/quota'

const SUGGEST_MODEL = 'deepseek/deepseek-v3.2'
const MAX_TOKENS = 500
const SUGGEST_WORDS_BODY_MAX_BYTES = 16 * 1024
const MAX_CATEGORY_LENGTH = 100
const MAX_LANGUAGE_LENGTH = 50

function buildSystemPrompt(count: number, baseLang: string): string {
  return (
    `You are a vocabulary suggestion engine. Given a category and target language, ` +
    `suggest exactly ${count} words or short phrases that a language learner would find ` +
    `interesting and useful.\n\n` +
    `CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation, no code blocks.\n\n` +
    `Output format:\n` +
    `{\n` +
    `  "words": [\n` +
    `    {\n` +
    `      "word": "word/phrase in target language",\n` +
    `      "translation": "translation in ${baseLang}"\n` +
    `    }\n` +
    `  ]\n` +
    `}\n\n` +
    `Rules:\n` +
    `- Choose culturally authentic, interesting vocabulary — not boring textbook words\n` +
    `- For "Random Mix": pick from varied categories and difficulty levels\n` +
    `- All ${count} entries must be unique\n` +
    `- Keep translations concise (1-4 words)\n` +
    `- For phrases: keep them short (2-5 words in target language)\n` +
    `- If suggesting acronyms or abbreviations (e.g. FOMO, ASAP, IYKYK), spell them with dots between letters (e.g. "F.O.M.O." not "FOMO")`
  )
}

function buildUserPrompt(count: number, category: string, targetLang: string): string {
  return (
    `Suggest ${count} ${category} words/phrases for learning ${targetLang}.\n` +
    `Make them interesting, natural, and actually useful for real conversations.`
  )
}

function stripCodeFences(s: string): string {
  let stripped = s.trim()
  if (stripped.startsWith('```')) {
    stripped = stripped.replace(/^```[a-zA-Z]*\n?/, '')
    stripped = stripped.replace(/\n?```$/, '')
  }
  return stripped
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readTrimmedString(value: unknown, field: string, maxLength: number, required: boolean): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `Invalid or missing ${field}`)
    return undefined
  }
  if (typeof value !== 'string') throw new ApiError(400, `Invalid ${field}`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new ApiError(400, `Invalid or missing ${field}`)
  if (trimmed.length > maxLength) throw new ApiError(400, `${field} is too long`)
  return trimmed
}

interface SuggestWordsBody {
  category: string
  target_language: string
  base_language: string
  count: number
}

function validateBody(raw: unknown): SuggestWordsBody {
  if (!isObject(raw)) throw new ApiError(400, 'Request body must be an object')
  const allowedKeys = new Set(['category', 'target_language', 'base_language', 'count'])
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) throw new ApiError(400, `Unexpected field: ${key}`)
  }

  const count = raw.count ?? 5
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 10) {
    throw new ApiError(400, 'count must be between 1 and 10')
  }

  return {
    category: readTrimmedString(raw.category, 'category', MAX_CATEGORY_LENGTH, true)!,
    target_language: readTrimmedString(raw.target_language, 'target_language', MAX_LANGUAGE_LENGTH, true)!,
    base_language: readTrimmedString(raw.base_language, 'base_language', MAX_LANGUAGE_LENGTH, false) || 'English',
    count: count as number,
  }
}

export async function OPTIONS(req?: Request): Promise<Response> {
  return optionsResponse(req)
}

export async function POST(req: Request): Promise<Response> {
  let body: SuggestWordsBody
  try {
    const user = await requireSupabaseUser(req)
    const rawBody = await readJsonWithLimit<unknown>(req, SUGGEST_WORDS_BODY_MAX_BYTES)
    body = validateBody(rawBody)
    await consumeApiQuota(user.id, 'suggest_words')
  } catch (err) {
    if (err instanceof ApiError) return apiErrorResponse(req, err)
    console.error('suggest-words gate error:', err instanceof Error ? err.message : err)
    return errorResponse(req, 400, 'Invalid request')
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return errorResponse(req, 500, 'Word suggestion service is not configured')
  }

  const systemPrompt = buildSystemPrompt(body.count, body.base_language)
  const userPrompt = buildUserPrompt(body.count, body.category, body.target_language)

  try {
    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SUGGEST_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!llmRes.ok) {
      const status = llmRes.status === 429 ? 429 : 502
      const detail = status === 429
        ? 'Too many requests. Please wait a moment.'
        : 'Word suggestion service unavailable'
      return jsonResponse(req, { detail }, status)
    }

    const llmData = await llmRes.json()
    const content = llmData?.choices?.[0]?.message?.content
    if (!content) {
      return jsonResponse(req, { detail: 'Invalid response from word suggestion service' }, 502)
    }

    const stripped = stripCodeFences(content)

    let parsed: { words?: unknown }
    try {
      parsed = JSON.parse(stripped)
    } catch {
      console.error('suggest-words: failed to parse LLM JSON')
      return jsonResponse(req, { detail: 'Invalid response from word suggestion service' }, 502)
    }

    const rawWords = parsed.words
    if (!Array.isArray(rawWords) || rawWords.length === 0) {
      return jsonResponse(req, { detail: 'Invalid response from word suggestion service' }, 502)
    }

    const cleaned = rawWords
      .filter((w: unknown): w is Record<string, unknown> =>
        typeof w === 'object' && w !== null && 'word' in w
      )
      .map(w => ({
        word: String(w.word || '').trim(),
        translation: String(w.translation || '').trim(),
      }))
      .filter(w => w.word.length > 0)

    if (cleaned.length === 0) {
      return jsonResponse(req, { detail: 'No valid word entries in LLM response' }, 502)
    }

    return jsonResponse(req, { words: cleaned }, 200)

  } catch (err) {
    console.error('suggest-words error:', err instanceof Error ? err.message : err)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return jsonResponse(req, { detail: 'Word suggestion service unreachable' }, 502)
    }
    return jsonResponse(req, { detail: 'Word suggestion service unavailable' }, 502)
  }
}
