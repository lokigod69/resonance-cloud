// api/suggest-words.ts
// Vercel Serverless Function: LLM-powered word suggestions by category.
// Called by CategoryPicker.tsx in the generate flow.
// Local dev: Vite proxy forwards /api/* to localhost:8090 (FastAPI orchestrator).
// Production: this serverless function handles the request directly.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const SUGGEST_MODEL = 'deepseek/deepseek-v3.2'
const MAX_TOKENS = 500

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
    `- For phrases: keep them short (2-5 words in target language)`
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

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request): Promise<Response> {
  let body: { category?: string; target_language?: string; base_language?: string; count?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ detail: 'Invalid JSON body' }, 400)
  }

  const category = body.category
  const targetLanguage = body.target_language
  const baseLang = body.base_language || 'English'
  const count = body.count ?? 5

  if (!category || typeof category !== 'string' || category.length > 100) {
    return jsonResponse({ detail: 'Invalid or missing category' }, 400)
  }
  if (!targetLanguage || typeof targetLanguage !== 'string' || targetLanguage.length > 50) {
    return jsonResponse({ detail: 'Invalid or missing target_language' }, 400)
  }
  if (typeof baseLang !== 'string' || baseLang.length > 50) {
    return jsonResponse({ detail: 'Invalid base_language' }, 400)
  }
  if (typeof count !== 'number' || count < 1 || count > 10) {
    return jsonResponse({ detail: 'count must be between 1 and 10' }, 400)
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return jsonResponse({ detail: 'OPENROUTER_API_KEY not set' }, 500)
  }

  const systemPrompt = buildSystemPrompt(count, baseLang)
  const userPrompt = buildUserPrompt(count, category, targetLanguage)

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
      return jsonResponse({ detail }, status)
    }

    const llmData = await llmRes.json()
    const content = llmData?.choices?.[0]?.message?.content
    if (!content) {
      return jsonResponse({ detail: 'Invalid response from word suggestion service' }, 502)
    }

    const stripped = stripCodeFences(content)

    let parsed: { words?: unknown }
    try {
      parsed = JSON.parse(stripped)
    } catch {
      console.error('suggest-words: failed to parse LLM JSON:', stripped)
      return jsonResponse({ detail: 'Invalid response from word suggestion service' }, 502)
    }

    const rawWords = parsed.words
    if (!Array.isArray(rawWords) || rawWords.length === 0) {
      return jsonResponse({ detail: 'Invalid response from word suggestion service' }, 502)
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
      return jsonResponse({ detail: 'No valid word entries in LLM response' }, 502)
    }

    return jsonResponse({ words: cleaned }, 200)

  } catch (err) {
    console.error('suggest-words error:', err)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return jsonResponse({ detail: 'Word suggestion service unreachable' }, 502)
    }
    return jsonResponse({ detail: 'Word suggestion service unavailable' }, 502)
  }
}
