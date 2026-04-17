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
