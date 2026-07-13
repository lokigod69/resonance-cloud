/**
 * Wave Rider SFX batch — generates the game's sound effects via the ElevenLabs
 * sound-generation API into public/games/surf/sfx/<name>.mp3.
 *
 * Run from frontend/:
 *   npx tsx scripts/generate-surf-sfx.ts [--dry-run] [--only=<name>]
 *
 * ELEVENLABS_API_KEY is read from the environment, falling back to
 * orchestrator/.env (same key the guided-TTS batches use).
 *
 * Idempotent: existing MP3s are kept — delete a file to force regeneration.
 * The scene loads these by fixed name (src/games/surf/scene/audio.ts); if a
 * file is missing at runtime the game stays silent for that cue, never throws.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SFX_DIR = path.join(__dirname, '../public/games/surf/sfx')
const ORCHESTRATOR_ENV = path.join(__dirname, '../../.env')

const API_URL = 'https://api.elevenlabs.io/v1/sound-generation'
const DRY_RUN = process.argv.includes('--dry-run')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)

type SfxSpec = {
  name: string
  text: string
  durationSeconds: number
}

// Shared style tail keeps the set coherent: soft, watery, warm, no harshness.
const STYLE =
  'short, soft and warm, high fidelity game sound design, no music, no harsh clicks, no distortion'

const SFX: SfxSpec[] = [
  {
    name: 'correct',
    text: `Bright cheerful water-droplet chime with a tiny sparkle shimmer and a small splash of success, playful arcade reward, ${STYLE}`,
    durationSeconds: 1.2,
  },
  {
    name: 'wrong',
    text: `Soft dull underwater thud with a muted low splash, gentle round failure feedback, not scary, no alarm, ${STYLE}`,
    durationSeconds: 1.0,
  },
  {
    name: 'combo',
    text: `Quick rising three-note watery shimmer arpeggio, escalating sparkle, playful momentum building, soft bells with a wet texture, ${STYLE}`,
    durationSeconds: 1.2,
  },
  {
    name: 'levelup',
    text: `Warm triumphant swell with a gentle ocean wave crash and a bright chime flourish, uplifting level-up moment, ${STYLE}`,
    durationSeconds: 1.8,
  },
  {
    name: 'pass',
    text: `Soft airy whoosh of gliding over water, smooth surf swish with light spray, subtle, ${STYLE}`,
    durationSeconds: 0.9,
  },
  {
    name: 'complete',
    text: `Celebratory warm wave crash followed by sparkling chimes settling into calm, joyful victory finish, ${STYLE}`,
    durationSeconds: 2.2,
  },
  {
    name: 'start',
    text: `Anticipatory soft ocean swell rising with a gentle sparkling lift, ready-set-go energy, subtle, ${STYLE}`,
    durationSeconds: 1.5,
  },
]

function resolveApiKey(): string | null {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  try {
    const env = fs.readFileSync(ORCHESTRATOR_ENV, 'utf8')
    const line = env.split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='))
    const value = line?.slice('ELEVENLABS_API_KEY='.length).trim()
    return value || null
  } catch {
    return null
  }
}

async function generate(apiKey: string, spec: SfxSpec, filepath: string): Promise<boolean> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: spec.text,
      duration_seconds: spec.durationSeconds,
      prompt_influence: 0.4,
    }),
  })
  if (!response.ok) {
    console.error(`  FAIL ${spec.name}: ${response.status} ${await response.text()}`)
    return false
  }
  const audio = Buffer.from(await response.arrayBuffer())
  if (audio.length < 1024) {
    console.error(`  FAIL ${spec.name}: suspiciously small payload (${audio.length} B)`)
    return false
  }
  fs.writeFileSync(filepath, audio)
  return true
}

async function main() {
  const apiKey = resolveApiKey()
  if (!apiKey && !DRY_RUN) {
    console.error('ELEVENLABS_API_KEY not set and not found in orchestrator/.env')
    process.exitCode = 1
    return
  }

  fs.mkdirSync(SFX_DIR, { recursive: true })
  const specs = ONLY ? SFX.filter((s) => s.name === ONLY) : SFX
  if (ONLY && specs.length === 0) {
    console.error(`Unknown --only name: ${ONLY} (valid: ${SFX.map((s) => s.name).join(', ')})`)
    process.exitCode = 1
    return
  }

  let generated = 0
  let skipped = 0
  let failed = 0
  for (const spec of specs) {
    const filepath = path.join(SFX_DIR, `${spec.name}.mp3`)
    if (fs.existsSync(filepath)) {
      console.log(`  keep ${spec.name}.mp3 (exists)`)
      skipped += 1
      continue
    }
    if (DRY_RUN) {
      console.log(`  would generate ${spec.name}.mp3 (${spec.durationSeconds}s): ${spec.text}`)
      continue
    }
    console.log(`  generating ${spec.name}.mp3 (${spec.durationSeconds}s)…`)
    if (await generate(apiKey!, spec, filepath)) {
      const size = fs.statSync(filepath).size
      console.log(`  ok   ${spec.name}.mp3 (${(size / 1024).toFixed(1)} KiB)`)
      generated += 1
    } else {
      failed += 1
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} kept, ${failed} failed${DRY_RUN ? ' (dry run)' : ''}`)
  if (failed > 0) process.exitCode = 1
}

void main()
