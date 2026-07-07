// ⚠️ KEEP IN SYNC with the twin in orchestrator/frontend/api/voice-chat.ts
// (GEMINI_VOICES const). Voices are Google's Gemini TTS prebuilt names.
// Display order is alphabetical and preserved by array order here.

export interface GeminiVoice {
  name: string
  tone: string
}

export const GEMINI_VOICES: readonly GeminiVoice[] = [
  { name: 'Achernar',      tone: 'Soft' },
  { name: 'Achird',        tone: 'Friendly' },
  { name: 'Algenib',       tone: 'Gravelly' },
  { name: 'Algieba',       tone: 'Smooth' },
  { name: 'Alnilam',       tone: 'Firm' },
  { name: 'Aoede',         tone: 'Breezy' },
  { name: 'Autonoe',       tone: 'Bright' },
  { name: 'Callirrhoe',    tone: 'Easy-going' },
  { name: 'Charon',        tone: 'Informative' },
  { name: 'Enceladus',     tone: 'Breathy' },
  { name: 'Erinome',       tone: 'Clear' },
  { name: 'Fenrir',        tone: 'Excitable' },
  { name: 'Gacrux',        tone: 'Mature' },
  { name: 'Iapetus',       tone: 'Clear' },
  { name: 'Kore',          tone: 'Firm' },
  { name: 'Laomedeia',     tone: 'Upbeat' },
  { name: 'Leda',          tone: 'Youthful' },
  { name: 'Pulcherrima',   tone: 'Forward' },
  { name: 'Rasalgethi',    tone: 'Informative' },
  { name: 'Sadachbia',     tone: 'Lively' },
  { name: 'Sadaltager',    tone: 'Knowledgeable' },
  { name: 'Schedar',       tone: 'Even' },
  { name: 'Sulafat',       tone: 'Warm' },
  { name: 'Umbriel',       tone: 'Easy-going' },
  { name: 'Zephyr',        tone: 'Bright' },
  { name: 'Zubenelgenubi', tone: 'Casual' },
]

export function isGeminiVoice(name: string): boolean {
  return GEMINI_VOICES.some((v) => v.name === name)
}

// Owner-curated subset shown to learners as "Classic voices" in the tutor
// grid (2026-07 Speak redesign). The full catalog above stays valid so the
// API allowlist and any voice stored in history/localStorage keep working.
const CURATED_GEMINI_VOICE_NAMES = [
  'Laomedeia',
  'Algieba',
  'Sadachbia',
  'Zephyr',
  'Fenrir',
  'Sulafat',
] as const

export const CURATED_GEMINI_VOICES: readonly GeminiVoice[] =
  CURATED_GEMINI_VOICE_NAMES
    .map((name) => GEMINI_VOICES.find((v) => v.name === name))
    .filter((v): v is GeminiVoice => v !== undefined)

// Comic-mascot avatars (star/myth etymology of each voice name), generated
// into public/. Cards fall back to an initial if the file is missing.
export function getGeminiVoiceAvatarUrl(name: string): string {
  return `/characters/voices/${name.toLowerCase()}.webp`
}
