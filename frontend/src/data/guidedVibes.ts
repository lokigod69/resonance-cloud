export const ACTIVE_GUIDED_VIBE_IDS = ['bright', 'wistful', 'sharp'] as const
export const FUTURE_GUIDED_VIBE_IDS = ['tender', 'bold', 'cheeky'] as const

export type ActiveGuidedVibeId = typeof ACTIVE_GUIDED_VIBE_IDS[number]
export type FutureGuidedVibeId = typeof FUTURE_GUIDED_VIBE_IDS[number]
export type GuidedVibeId = ActiveGuidedVibeId | FutureGuidedVibeId
export type GuidedVibeStatus = 'active' | 'future'

export type GuidedVibeEmblem = {
  url: string
  alt: string
}

export type GuidedVibe = {
  id: GuidedVibeId
  label: string
  shortDescription: string
  personalitySummary: string
  wordPalette: string[]
  signaturePhrasings: string[]
  exampleSentences: string[]
  sceneMoodNotes: string
  musicGenre: string
  uiAesthetic: string
  trophyWordCandidates: string[]
  status: GuidedVibeStatus
  emblem?: GuidedVibeEmblem
}

export const DEFAULT_GUIDED_VIBE_ID: ActiveGuidedVibeId = 'bright'

export const guidedVibes = {
  bright: {
    id: 'bright',
    label: 'Bright',
    shortDescription: 'Clear, warm, upbeat, and easy to repeat.',
    personalitySummary:
      'Bright sounds like a friendly person opening a door. It keeps phrases practical, polite, and lightly optimistic without becoming childish or overexcited.',
    wordPalette: ['please', 'hello', 'easy', 'sure', 'great', 'smile'],
    signaturePhrasings: ['Excuse me, ...', 'Could you ...?', 'That helps.', 'Thanks so much.'],
    exampleSentences: ['Excuse me, do you speak English?', 'Great, thank you.'],
    sceneMoodNotes: 'Clean daylight, open posture, helpful first-contact energy.',
    musicGenre: 'light acoustic pop',
    uiAesthetic: 'Warm white space, clear contrast, soft yellow accents, minimal friction.',
    trophyWordCandidates: ['please', 'hello', 'easy', 'sure', 'great', 'smile'],
    status: 'active',
    emblem: {
      url: '/guided/vibes/bright-emblem.webp',
      alt: 'Bright voice emblem',
    },
  },
  wistful: {
    id: 'wistful',
    label: 'Wistful',
    shortDescription: 'Soft, reflective, and gentle without losing A1 usefulness.',
    personalitySummary:
      'Wistful sounds like a quiet traveler trying to be understood. It favors softer openers and human warmth, but every line still needs to work in a real beginner interaction.',
    wordPalette: ['sorry', 'quiet', 'home', 'lost', 'softly', 'again'],
    signaturePhrasings: ['Sorry, ...', 'Could you say that again?', 'I am a little lost.', 'That feels familiar.'],
    exampleSentences: ['Sorry, do you speak English?', 'Could you say that again?'],
    sceneMoodNotes: 'Evening light, quieter pacing, a small moment of courage before speaking.',
    musicGenre: 'soft indie folk',
    uiAesthetic: 'Muted blue-gray surfaces, gentle highlights, spacious rhythm, calm motion.',
    trophyWordCandidates: ['sorry', 'quiet', 'home', 'lost', 'softly', 'again'],
    status: 'active',
    emblem: {
      url: '/guided/vibes/wistful-emblem.webp',
      alt: 'Wistful voice emblem',
    },
  },
  sharp: {
    id: 'sharp',
    label: 'Sharp',
    shortDescription: 'Direct, crisp, and efficient for learners who want momentum.',
    personalitySummary:
      'Sharp removes extra softness while staying respectful. It prefers short usable lines, clean intent, and fast recognition over decorative phrasing.',
    wordPalette: ['clear', 'now', 'ready', 'fast', 'exact', 'focus'],
    signaturePhrasings: ['Can you ...?', 'Say it again.', 'Clear enough.', 'Ready.'],
    exampleSentences: ['Can you speak English?', 'Say it again, please.'],
    sceneMoodNotes: 'High-contrast framing, efficient movement, no wasted words.',
    musicGenre: 'minimal synth pulse',
    uiAesthetic: 'Sharper contrast, compact controls, clean dark/light edges, precise states.',
    trophyWordCandidates: ['clear', 'now', 'ready', 'fast', 'exact', 'focus'],
    status: 'active',
    emblem: {
      url: '/guided/vibes/sharp-emblem.webp',
      alt: 'Sharp voice emblem',
    },
  },
  tender: {
    id: 'tender',
    label: 'Tender',
    shortDescription: 'Caring, patient, and emotionally safe.',
    personalitySummary:
      'Tender will support learners who want reassurance and warmth, while still keeping phrases simple enough for A1 production.',
    wordPalette: ['kind', 'gentle', 'care', 'safe', 'together', 'slowly'],
    signaturePhrasings: ['It is okay.', 'Slowly, please.', 'Thank you for helping.', 'I am learning.'],
    exampleSentences: ['Slowly, please.', 'Thank you for helping.'],
    sceneMoodNotes: 'Soft human closeness, low pressure, patient pacing.',
    musicGenre: 'warm piano ballad',
    uiAesthetic: 'Soft rose and cream accents, reassuring spacing, low-pressure feedback.',
    trophyWordCandidates: ['kind', 'gentle', 'care', 'safe', 'together', 'slowly'],
    status: 'future',
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    shortDescription: 'Confident, energetic, and forward-moving.',
    personalitySummary:
      'Bold will help learners practice with more presence and agency without turning beginner phrases into performance copy.',
    wordPalette: ['ready', 'strong', 'go', 'lead', 'voice', 'again'],
    signaturePhrasings: ['I can try.', 'Let us go.', 'Say it again.', 'I am ready.'],
    exampleSentences: ['I am ready.', 'Say it again, please.'],
    sceneMoodNotes: 'Forward motion, confident framing, strong but practical learner agency.',
    musicGenre: 'anthemic pop rock',
    uiAesthetic: 'Confident contrast, larger action states, saturated accent moments.',
    trophyWordCandidates: ['ready', 'strong', 'go', 'lead', 'voice', 'again'],
    status: 'future',
  },
  cheeky: {
    id: 'cheeky',
    label: 'Cheeky',
    shortDescription: 'Playful, quick, and lightly mischievous.',
    personalitySummary:
      'Cheeky will add playful timing and memorable turns of phrase, but it must avoid sarcasm, insults, or slang that blocks A1 usefulness.',
    wordPalette: ['oops', 'nice', 'tiny', 'quick', 'fun', 'again'],
    signaturePhrasings: ['Oops, again.', 'Tiny problem.', 'Nice.', 'Quick question.'],
    exampleSentences: ['Quick question: English?', 'Oops, again please.'],
    sceneMoodNotes: 'Light comic timing, expressive but still useful, never mean.',
    musicGenre: 'playful electro pop',
    uiAesthetic: 'Crisp playful accents, quick micro-interactions, compact cards.',
    trophyWordCandidates: ['oops', 'nice', 'tiny', 'quick', 'fun', 'again'],
    status: 'future',
  },
} satisfies Record<GuidedVibeId, GuidedVibe>

export function getGuidedVibe(id: GuidedVibeId) {
  return guidedVibes[id]
}

export function isActiveGuidedVibeId(value: unknown): value is ActiveGuidedVibeId {
  return typeof value === 'string'
    && ACTIVE_GUIDED_VIBE_IDS.includes(value as ActiveGuidedVibeId)
}
