// api/_shared/usageCost.ts
//
// Rate table for the four frontend /api/* provider calls that write usage/cost
// rows into pipeline_events. This is the **single place to edit** Vercel-side
// provider rates.
//
// Twin module: the Python generation backend has its own rate table at
// `src/cost_logger.py`. The two runtimes cannot share a module, so when a rate
// changes, update **both**.
//
// Each rate carries a source + "last verified" date. Rates that could not be
// confirmed against a primary provider doc are marked UNVERIFIED — best-effort
// estimates, not invoice-accurate facts.
//
// Recorded `cost_usd` on an event is always the estimate computed here.
// `real_cost_usd` is reserved for providers that report actual billed cost and is
// not populated by these call sites.

// ── Rates ────────────────────────────────────────────────────────────────────

// OpenRouter LLM text — USD per 1M tokens. deepseek-v4-flash: $0.09 in / $0.18 out.
// Source: https://openrouter.ai/deepseek/deepseek-v4-flash — verified 2026-06-19.
const OPENROUTER_RATES_USD_PER_MTOKEN: Record<string, { in: number; out: number }> = {
  'deepseek/deepseek-v4-flash': { in: 0.09, out: 0.18 },
}
// Conservative fallback for an unmapped OpenRouter model (over- not under-estimate).
const OPENROUTER_DEFAULT_RATE_USD_PER_MTOKEN = { in: 0.5, out: 1.5 } // UNVERIFIED fallback

// Groq LLM — USD per 1M tokens. llama-3.3-70b-versatile: $0.59 in / $0.79 out.
// Source: groq.com/pricing — verified 2026-06-19.
const GROQ_LLM_RATES_USD_PER_MTOKEN: Record<string, { in: number; out: number }> = {
  'llama-3.3-70b-versatile': { in: 0.59, out: 0.79 },
}
const GROQ_LLM_DEFAULT_RATE_USD_PER_MTOKEN = { in: 0.59, out: 0.79 } // fallback = flagship rate

// Groq Whisper STT — USD per hour of audio. whisper-large-v3: $0.111 / audio-hour.
// Source: groq.com/pricing — verified 2026-06-19.
const GROQ_WHISPER_USD_PER_AUDIO_HOUR = 0.111

// Gemini 3.1 Flash TTS Preview — USD per 1M tokens: $1 input (text), $20 output (audio).
// Source: https://openrouter.ai/google/gemini-3.1-flash-tts-preview — verified 2026-06-19.
const GEMINI_TTS_INPUT_USD_PER_MTOKEN = 1
const GEMINI_TTS_OUTPUT_USD_PER_MTOKEN = 20

// Gemini Flash-Lite vision/text — USD per 1M tokens. Best-effort estimate for
// Lens scans; Gemini reports image input through promptTokenCount.
// Source: Google AI pricing — UNVERIFIED in-repo estimate 2026-07-06.
const GEMINI_FLASH_LITE_VISION_INPUT_USD_PER_MTOKEN = 0.1
const GEMINI_FLASH_LITE_VISION_OUTPUT_USD_PER_MTOKEN = 0.4

// Mistral Voxtral Mini TTS — USD per 1M characters ($0.016 / 1k chars).
// Source: https://openrouter.ai/mistralai/voxtral-mini-tts-2603 — verified 2026-06-19.
const VOXTRAL_TTS_USD_PER_MCHAR = 16

// xAI Grok Voice Agent API — flat USD per minute of connected audio.
// Source: x.ai/news/grok-voice-agent-api ("a simple flat rate of $0.05 per
// minute of audio duration") — VERIFIED 2026-07-28.
export const GROK_REALTIME_USD_PER_MINUTE = 0.05

// ── Usage shapes ─────────────────────────────────────────────────────────────

/** OpenAI-compatible usage block (OpenRouter and Groq both return this). */
export interface LlmUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

/** Gemini TTS usageMetadata (see _shared/geminiTts.ts). */
export interface GeminiTtsUsageLike {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

/** Gemini generateContent usageMetadata for Lens vision scans. */
export interface GeminiVisionUsageLike {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
}

export interface LlmCostResult {
  costUsd: number
  tokensIn: number
  tokensOut: number
}

// ── Cost helpers ─────────────────────────────────────────────────────────────

function num(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function openRouterCost(model: string, usage: LlmUsage | null | undefined): LlmCostResult {
  const tokensIn = num(usage?.prompt_tokens)
  const tokensOut = num(usage?.completion_tokens)
  const rate = OPENROUTER_RATES_USD_PER_MTOKEN[model] ?? OPENROUTER_DEFAULT_RATE_USD_PER_MTOKEN
  const costUsd = (tokensIn / 1_000_000) * rate.in + (tokensOut / 1_000_000) * rate.out
  return { costUsd, tokensIn, tokensOut }
}

export function groqLlmCost(model: string, usage: LlmUsage | null | undefined): LlmCostResult {
  const tokensIn = num(usage?.prompt_tokens)
  const tokensOut = num(usage?.completion_tokens)
  const rate = GROQ_LLM_RATES_USD_PER_MTOKEN[model] ?? GROQ_LLM_DEFAULT_RATE_USD_PER_MTOKEN
  const costUsd = (tokensIn / 1_000_000) * rate.in + (tokensOut / 1_000_000) * rate.out
  return { costUsd, tokensIn, tokensOut }
}

/** Groq Whisper STT cost from real audio duration in seconds. */
export function groqSttCost(audioSeconds: number | null | undefined): number {
  return (num(audioSeconds) / 3600) * GROQ_WHISPER_USD_PER_AUDIO_HOUR
}

/** Gemini TTS cost from usageMetadata (input text tokens + output audio tokens). */
export function geminiTtsCost(usage: GeminiTtsUsageLike | null | undefined): number {
  const inTokens = num(usage?.promptTokenCount)
  const outTokens = num(usage?.candidatesTokenCount)
  return (inTokens / 1_000_000) * GEMINI_TTS_INPUT_USD_PER_MTOKEN
    + (outTokens / 1_000_000) * GEMINI_TTS_OUTPUT_USD_PER_MTOKEN
}

/** Gemini Flash-Lite vision cost from usageMetadata. */
export function geminiVisionCost(usage: GeminiVisionUsageLike | null | undefined): LlmCostResult {
  const tokensIn = num(usage?.promptTokenCount)
  const tokensOut = num(usage?.candidatesTokenCount)
  const costUsd = (tokensIn / 1_000_000) * GEMINI_FLASH_LITE_VISION_INPUT_USD_PER_MTOKEN
    + (tokensOut / 1_000_000) * GEMINI_FLASH_LITE_VISION_OUTPUT_USD_PER_MTOKEN
  return { costUsd, tokensIn, tokensOut }
}

/** Voxtral TTS cost from character count of the synthesized text. */
export function voxtralTtsCost(chars: number | null | undefined): number {
  return (num(chars) / 1_000_000) * VOXTRAL_TTS_USD_PER_MCHAR
}
