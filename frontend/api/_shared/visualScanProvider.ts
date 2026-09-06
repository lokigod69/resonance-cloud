import { ApiError } from './http'
import { assertRequestActive, fetchWithRequestDeadline } from './requestDeadline'

export const GEMINI_VISION_MODEL = 'gemini-2.5-flash-lite'

const GEMINI_VISION_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`
const MAX_OUTPUT_TOKENS = 1800

export type VisualScanKind = 'object' | 'text' | 'menu' | 'scene' | 'unsupported'
export type VisualScanConfidence = 'high' | 'medium' | 'low'
export type VisualScanSafety = 'person' | 'sensitive_document'

export interface VisualScanAlternate {
  target_text: string
  base_text: string
}

export interface VisualScanItem {
  target_text: string
  base_text: string
  transliteration?: string
  ipa?: string
  pos?: string
  article?: string
  example?: string
  example_gloss?: string
  confidence: VisualScanConfidence
  alternates?: VisualScanAlternate[]
}

export interface VisualScanResponse {
  kind: VisualScanKind
  items: VisualScanItem[]
  safety?: VisualScanSafety | null
}

export interface VisualScanRequest {
  image: string
  targetLanguage: string
  baseLanguage: string
  level?: string
  hint?: 'object' | 'text'
}

export interface GeminiVisionUsageLike {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

export type VisualScanProviderResult = VisualScanResponse & {
  usage?: GeminiVisionUsageLike
  provider?: string
  model?: string
}

export interface VisualScanProvider {
  scan(request: VisualScanRequest): Promise<VisualScanProviderResult>
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    finishReason?: string
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  usageMetadata?: GeminiVisionUsageLike
}

function languageRules(): string {
  return [
    'Rules:',
    '- Identify the deliberately framed subject nearest center; ignore background and edge objects.',
    '- confidence covers visual identification only: high=unmistakable, medium=probable but ambiguous, low=uncertain/partial/blurry. For multiple plausible subjects, never use high; give alternates.',
    '- Use the natural target-language term a native speaker would learn. Keep article/classifier out of target_text and in article: include helpful gender/articles for German, French, Spanish, Italian, Portuguese, or Dutch, and common classifiers/measure words.',
    '- Add transliteration for Korean, Japanese, Chinese, Arabic, Hindi, Russian, or Thai. Add IPA only when reliable.',
    '- example is a short natural sentence in the target language; example_gloss is its meaning in the base language.',
    '- Match register and examples to the learner level when one is supplied.',
    '- object/scene: one useful item; alternates only when visually plausible. text/menu: at most 8 useful lines.',
    '- Target-language photo text: copy it exactly to target_text, put its base-language meaning in base_text, and transliterate non-Latin script. Do not translate it back to the target language.',
    '- Base-language photo text: translate the useful concept into the target language. Third-language text: do the same; mention its source language in base_text only if useful.',
    '- A person, face, ID, passport, payment card, medical/legal/financial document, or other sensitive personal material: return the matching safety value and no items.',
  ].join('\n')
}

export function buildVisualScanPrompt(request: VisualScanRequest): string {
  return [
    'You are Lingwave Lens, a visual lexicographer for language learners.',
    `target_text language: ${JSON.stringify(request.targetLanguage)}.`,
    `base_text language: ${JSON.stringify(request.baseLanguage)}.`,
    'Role example: with target German and base English, target_text is "Tasse", article is "die", and base_text is "cup". Never swap these roles.',
    request.level ? `Learner level: ${JSON.stringify(request.level)}.` : '',
    request.hint ? `User hint: ${JSON.stringify(request.hint)}.` : '',
    languageRules(),
    'Classify kind as one of object, text, menu, scene, unsupported.',
    'Return only schema-matching JSON.',
  ].filter(Boolean).join('\n\n')
}

export function visualScanResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      kind: { type: 'STRING', enum: ['object', 'text', 'menu', 'scene', 'unsupported'] },
      safety: { type: 'STRING', nullable: true, enum: ['person', 'sensitive_document'] },
      items: {
        type: 'ARRAY',
        maxItems: 8,
        items: {
          type: 'OBJECT',
          properties: {
            target_text: { type: 'STRING', description: 'Natural term in the target language.' },
            base_text: { type: 'STRING', description: 'Meaning in the base language.' },
            transliteration: { type: 'STRING' },
            ipa: { type: 'STRING' },
            pos: { type: 'STRING' },
            article: { type: 'STRING' },
            example: { type: 'STRING' },
            example_gloss: { type: 'STRING' },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
            alternates: {
              type: 'ARRAY',
              maxItems: 2,
              items: {
                type: 'OBJECT',
                properties: {
                  target_text: { type: 'STRING' },
                  base_text: { type: 'STRING' },
                },
                required: ['target_text', 'base_text'],
              },
            },
          },
          required: ['target_text', 'base_text', 'confidence'],
        },
      },
    },
    required: ['kind', 'items'],
  }
}

function stripCodeFences(value: string): string {
  let stripped = value.trim()
  if (stripped.startsWith('```')) {
    stripped = stripped.replace(/^```[a-zA-Z]*\n?/, '')
    stripped = stripped.replace(/\n?```$/, '')
  }
  return stripped
}

export function parseGeminiVisionJson(text: string): VisualScanResponse {
  try {
    return JSON.parse(stripCodeFences(text)) as VisualScanResponse
  } catch {
    throw new ApiError(422, 'Vision model returned malformed JSON')
  }
}

const RETRY_DELAY_MS = 350
const RETRY_ELAPSED_BUDGET_MS = 8000

export function createGeminiVisualScanProvider(
  apiKey = process.env.GOOGLE_AI_API_KEY,
  fetchImpl: typeof fetch = fetch,
): VisualScanProvider {
  async function performScan(request: VisualScanRequest): Promise<VisualScanProviderResult> {
    let response: Response
    try {
      response = await fetchWithRequestDeadline(GEMINI_VISION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey as string,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: buildVisualScanPrompt(request) },
              { inlineData: { mimeType: 'image/jpeg', data: request.image } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: visualScanResponseSchema(),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
          },
        }),
      }, 20_000, fetchImpl)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(502, 'Vision service timed out')
      }
      throw new ApiError(502, 'Vision service unavailable')
    }

    if (!response.ok) {
      if (response.status === 400 || response.status === 422) {
        throw new ApiError(422, 'Image could not be processed')
      }
      throw new ApiError(502, 'Vision service unavailable')
    }

    const data = await response.json() as GeminiGenerateContentResponse
    const candidate = data.candidates?.[0]
    if (candidate?.finishReason === 'SAFETY') {
      throw new ApiError(422, 'Vision model refused the image')
    }
    const text = candidate?.content?.parts?.map((part) => part.text || '').join('').trim()
    if (!text) throw new ApiError(422, 'Vision model returned no content')

    return {
      ...parseGeminiVisionJson(text),
      usage: data.usageMetadata ?? {},
      provider: 'gemini',
      model: GEMINI_VISION_MODEL,
    }
  }

  return {
    async scan(request) {
      if (!apiKey) throw new ApiError(502, 'Vision service is not configured')

      const startedAt = Date.now()
      try {
        return await performScan(request)
      } catch (error) {
        // One silent retry for transient upstream failures (network blip or
        // Gemini 5xx). Timeouts already spent 20s and 4xx-class errors are
        // deterministic — both surface immediately. The quota was consumed
        // once for this scan, so retrying here never double-charges the user.
        const transient = error instanceof ApiError
          && error.status === 502
          && error.message === 'Vision service unavailable'
        if (!transient || Date.now() - startedAt > RETRY_ELAPSED_BUDGET_MS) throw error
        assertRequestActive()
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        return performScan(request)
      }
    },
  }
}

export function createOpenRouterVisionProviderStub(): VisualScanProvider {
  return {
    async scan() {
      throw new ApiError(502, 'OpenRouter vision fallback is not configured')
    },
  }
}
