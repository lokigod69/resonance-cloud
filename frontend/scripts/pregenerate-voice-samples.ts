// Run with:
//   npx tsx scripts/pregenerate-voice-samples.ts
//   npx tsx scripts/pregenerate-voice-samples.ts --dry-run
//
// Requires env vars:
//   GOOGLE_AI_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { GEMINI_VOICES } from '../src/data/geminiVoices.ts'
import { VOICE_SAMPLE_SENTENCES } from '../src/data/geminiVoiceSampleSentences.ts'

const BUCKET = 'voice-samples'
const NEUTRAL_CHARACTER_MODE_ID = '_neutral'
const NEUTRAL_ACCENT_ID = 'none'
const SAMPLE_VERSION = 1
const GEMINI_TTS_MODEL = 'gemini-3.1-flash-tts-preview'
const GEMINI_TTS_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`

// Official Google pricing page currently publishes Gemini 2.5 Flash Preview TTS
// rates at $0.50 / 1M input text tokens and $10.00 / 1M output audio tokens.
// This repo uses gemini-3.1-flash-tts-preview, so treat this as a reference
// estimate until Google publishes a distinct 3.1 TTS rate.
const REFERENCE_INPUT_RATE_PER_MILLION = 0.5
const REFERENCE_OUTPUT_RATE_PER_MILLION = 10

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = loadEnv('', ROOT_DIR, '')

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? env.GOOGLE_AI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY

const dryRun = process.argv.includes('--dry-run')

interface VoiceSampleRow {
  storage_url: string
}

interface GeminiTtsUsage {
  promptTokenCount?: number
  candidatesTokenCount?: number
}

interface GeminiTtsApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string
        }
      }>
    }
  }>
  usageMetadata?: GeminiTtsUsage
}

// KEEP IN SYNC with api/_shared/geminiTts.ts. The script uses a local copy
// because tsx intermittently fails to resolve the shared helper from scripts/.
function wrapPcmAsWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, sampleWidth = 2): Buffer {
  const pcmLength = pcmBuffer.length
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + pcmLength, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * sampleWidth, 28)
  header.writeUInt16LE(channels * sampleWidth, 32)
  header.writeUInt16LE(sampleWidth * 8, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcmLength, 40)
  return Buffer.concat([header, pcmBuffer])
}

async function generateGeminiTtsFromPrompt(
  prompt: string,
  voiceName: string,
  apiKey: string,
): Promise<{ audio: Buffer; usage: GeminiTtsUsage }> {
  let response: Response | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)

    try {
      response = await fetch(GEMINI_TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Gemini TTS timed out after 20s')
      }
      throw err
    }

    clearTimeout(timer)
    if (response.ok) break
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(() => '') : ''
    throw new Error(`Gemini TTS failed: ${response?.status ?? 'unknown'} ${errText.slice(0, 200)}`)
  }

  const data = await response.json() as GeminiTtsApiResponse
  const inline = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
  if (!inline?.data) throw new Error('Gemini TTS returned no inlineData')

  return {
    audio: wrapPcmAsWav(Buffer.from(inline.data, 'base64')),
    usage: data.usageMetadata ?? {},
  }
}

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function getStoragePath(language: string, voiceName: string) {
  return `neutral/${language}/${voiceName}.wav`
}

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`
}

async function main() {
  const googleAiApiKey = dryRun ? GOOGLE_AI_API_KEY ?? 'dry-run' : requireEnv('GOOGLE_AI_API_KEY', GOOGLE_AI_API_KEY)
  const supabaseUrl = dryRun ? SUPABASE_URL ?? '' : requireEnv('SUPABASE_URL', SUPABASE_URL)
  const supabaseServiceRoleKey = dryRun
    ? SUPABASE_SERVICE_ROLE_KEY ?? ''
    : requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)
  const admin = supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null

  const languages = Object.entries(VOICE_SAMPLE_SENTENCES)
  const total = GEMINI_VOICES.length * languages.length
  let completed = 0
  let skipped = 0
  let created = 0
  let promptTokens = 0
  let candidateTokens = 0

  console.log(`Preparing ${total} neutral samples (${GEMINI_VOICES.length} voices x ${languages.length} languages)`)
  if (dryRun) {
    console.log('Dry run enabled - Gemini generation and Supabase uploads are skipped.')
  }

  for (const voice of GEMINI_VOICES) {
    for (const [language, sentence] of languages) {
      completed += 1

      let existingRow: VoiceSampleRow | null = null

      if (admin) {
        const { data: existing, error: lookupError } = await admin
          .from('voice_samples')
          .select('storage_url')
          .eq('voice_name', voice.name)
          .eq('language', language)
          .eq('character_mode_id', NEUTRAL_CHARACTER_MODE_ID)
          .eq('version', SAMPLE_VERSION)
          .eq('accent_id', NEUTRAL_ACCENT_ID)
          .is('invalidated_at', null)
          .maybeSingle()

        if (lookupError) {
          throw new Error(`Lookup failed for ${voice.name}/${language}: ${lookupError.message}`)
        }

        existingRow = existing as VoiceSampleRow | null
      }
      if (existingRow?.storage_url) {
        skipped += 1
        console.log(`[${completed}/${total}] skip ${language}/${voice.name} - row already exists`)
        continue
      }

      const storagePath = getStoragePath(language, voice.name)
      console.log(`[${completed}/${total}] ${dryRun ? 'plan' : 'generate'} ${language}/${voice.name} -> ${storagePath}`)

      if (dryRun) {
        continue
      }

      if (!admin) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for a real run')
      }

      const { audio, usage } = await generateGeminiTtsFromPrompt(sentence, voice.name, googleAiApiKey)
      promptTokens += usage.promptTokenCount ?? 0
      candidateTokens += usage.candidatesTokenCount ?? 0

      const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, audio, {
        contentType: 'audio/wav',
        upsert: true,
      })
      if (uploadError) {
        throw new Error(`Upload failed for ${voice.name}/${language}: ${uploadError.message}`)
      }

      const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
      const storageUrl = publicUrl.publicUrl

      const { error: insertError } = await admin.from('voice_samples').upsert({
        voice_name: voice.name,
        language,
        character_mode_id: NEUTRAL_CHARACTER_MODE_ID,
        version: SAMPLE_VERSION,
        accent_id: NEUTRAL_ACCENT_ID,
        storage_url: storageUrl,
        invalidated_at: null,
      })
      if (insertError) {
        throw new Error(`Row insert failed for ${voice.name}/${language}: ${insertError.message}`)
      }

      created += 1
    }
  }

  console.log('')
  console.log(`Completed: ${completed}/${total}`)
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)

  if (dryRun) {
    console.log('Estimated cost: skipped in dry-run mode.')
    return
  }

  const estimatedCost =
    (promptTokens / 1_000_000) * REFERENCE_INPUT_RATE_PER_MILLION
    + (candidateTokens / 1_000_000) * REFERENCE_OUTPUT_RATE_PER_MILLION

  console.log(`Prompt tokens: ${promptTokens}`)
  console.log(`Audio output tokens: ${candidateTokens}`)
  console.log(`Reference cost estimate: ${formatUsd(estimatedCost)}`)
  console.log('Reference estimate uses the published Gemini 2.5 Flash Preview TTS rates; adjust if Google publishes a different Gemini 3.1 TTS price.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
