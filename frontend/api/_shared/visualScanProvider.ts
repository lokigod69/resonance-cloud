import { ApiError } from './http'

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
    'Language-learning rules:',
    '- The learner framed this photo deliberately: the subject is the item nearest the center of the frame. Name that item; ignore background or edge objects.',
    '- Report confidence for the visual identification only. high = the subject is unmistakable; medium = probable but visually ambiguous; low = uncertain, partially visible, blurry, or several different objects could be the intended subject. Never use high when more than one distinct object could plausibly be the subject — use medium or low and offer alternates instead.',
    '- Return the natural target-language word or phrase a native speaker would learn, not a literal visual label.',
    '- For German, French, Spanish, Italian, Portuguese, and Dutch nouns, include the article/gender marker in article when it helps the learner.',
    '- For languages with classifiers or measure words, put the common classifier in article.',
    '- For Korean, Japanese, Chinese, Arabic, Hindi, Russian, and Thai, include transliteration/romanization.',
    '- Include IPA when reliable; otherwise omit ipa.',
    '- Use register and examples appropriate to the learner level.',
    '- For object/scene, return the single most useful learnable item unless there are obvious alternates.',
    '- For text/menu, return up to 8 useful line items.',
    '- Text/menu source-language edge cases:',
    '  - If photographed text is already in the target language, use reading/meaning mode: target_text is the text exactly as written, base_text is its meaning in the base language, and transliteration is included when the script is non-Latin. Do not re-translate it into the target language.',
    '  - If photographed text is in the base language, translate the useful concept into the target language as usual.',
    '  - If photographed text is in a third language, classify kind appropriately, translate the concept into the target language, and optionally mention the source language in base_text when it helps the learner.',
    '- If the frame focuses on a person, face, ID, passport, payment card, medical/legal/financial document, or other sensitive personal material, return safety and no items.',
  ].join('\n')
}

function buildPrompt(request: VisualScanRequest): string {
  return [
    'You are Lingwave Lens, a visual lexicographer for language learners.',
    `Target language: ${request.targetLanguage}.`,
    `Base language: ${request.baseLanguage}.`,
    `Learner level: ${request.level || 'beginner'}.`,
    request.hint ? `User hint: ${request.hint}.` : '',
    languageRules(),
    'Classify kind as one of object, text, menu, scene, unsupported.',
    'Return only JSON that matches the schema. Use snake_case keys exactly.',
  ].filter(Boolean).join('\n\n')
}

function responseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      kind: { type: 'STRING', enum: ['object', 'text', 'menu', 'scene', 'unsupported'] },
      safety: { type: 'STRING', nullable: true, enum: ['person', 'sensitive_document'] },
      items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            target_text: { type: 'STRING' },
            base_text: { type: 'STRING' },
            transliteration: { type: 'STRING' },
            ipa: { type: 'STRING' },
            pos: { type: 'STRING' },
            article: { type: 'STRING' },
            example: { type: 'STRING' },
            example_gloss: { type: 'STRING' },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
            alternates: {
              type: 'ARRAY',
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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    let response: Response
    try {
      response = await fetchImpl(GEMINI_VISION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey as string,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: buildPrompt(request) },
              { inlineData: { mimeType: 'image/jpeg', data: request.image } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema(),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(502, 'Vision service timed out')
      }
      throw new ApiError(502, 'Vision service unavailable')
    } finally {
      clearTimeout(timeout)
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
