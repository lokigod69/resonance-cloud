// ⚠️ KEEP IN SYNC with the twin in orchestrator/frontend/api/voice-sample.ts
// (GEMINI_ACCENT_SUFFIXES) and the twin in orchestrator/frontend/api/voice-chat.ts
// (GEMINI_ACCENT_SUFFIXES). If you edit a geminiPromptSuffix, bump the
// `version` field here AND in the api/ mirrors, and run an UPDATE on the
// voice_samples table to set invalidated_at = now() for that accent_id
// so cached samples are regenerated.
//
// The api/ serverless functions cannot import from src/ (separate bundle), so
// this data is duplicated. Silent drift between the two will cause UI copy and
// TTS output to diverge.

export interface GeminiAccent {
  id: string
  name: string
  group: 'none' | 'regional' | 'theatrical'
  geminiPromptSuffix: string
  version: number
}

export const GEMINI_ACCENTS: readonly GeminiAccent[] = [
  // Default — no accent override
  { id: 'none',                name: 'No accent',              group: 'none',        geminiPromptSuffix: '', version: 1 },

  // Real-world regional accents
  { id: 'brixton_london',      name: 'Brixton London',         group: 'regional',    geminiPromptSuffix: 'Speak with a Brixton, London accent.', version: 1 },
  { id: 'cockney',             name: 'Cockney',                group: 'regional',    geminiPromptSuffix: 'Speak with a working-class East London Cockney accent.', version: 1 },
  { id: 'rp_british',          name: 'Received Pronunciation', group: 'regional',    geminiPromptSuffix: 'Speak with a Received Pronunciation British accent — refined, BBC newsreader.', version: 1 },
  { id: 'scottish_edinburgh',  name: 'Scottish (Edinburgh)',   group: 'regional',    geminiPromptSuffix: 'Speak with an educated Edinburgh, Scotland accent.', version: 1 },
  { id: 'irish_dublin',        name: 'Irish (Dublin)',         group: 'regional',    geminiPromptSuffix: 'Speak with a Dublin, Ireland accent.', version: 1 },
  { id: 'australian_sydney',   name: 'Australian (Sydney)',    group: 'regional',    geminiPromptSuffix: 'Speak with a Sydney, Australia accent.', version: 1 },
  { id: 'south_african',       name: 'South African',          group: 'regional',    geminiPromptSuffix: 'Speak with a Cape Town, South Africa English accent.', version: 1 },
  { id: 'nigerian_lagos',      name: 'Nigerian (Lagos)',       group: 'regional',    geminiPromptSuffix: 'Speak with an educated Lagos, Nigeria English accent — warm, melodic, expressive.', version: 1 },
  { id: 'indian_mumbai',       name: 'Indian (Mumbai)',        group: 'regional',    geminiPromptSuffix: 'Speak with an educated Mumbai, India English accent.', version: 1 },
  { id: 'jamaican',            name: 'Jamaican',               group: 'regional',    geminiPromptSuffix: 'Speak with a Jamaican Patois-influenced English accent.', version: 1 },
  { id: 'southern_us',         name: 'Southern US',            group: 'regional',    geminiPromptSuffix: 'Speak with a warm Southern US accent — Georgia or Alabama.', version: 1 },
  { id: 'texan',               name: 'Texan',                  group: 'regional',    geminiPromptSuffix: 'Speak with a Texas drawl — cowboy energy, easy pace.', version: 1 },
  { id: 'new_york',            name: 'New York',               group: 'regional',    geminiPromptSuffix: 'Speak with a Brooklyn, New York accent.', version: 1 },
  { id: 'california_valley',   name: 'California Valley',      group: 'regional',    geminiPromptSuffix: 'Speak with a Southern California valley girl accent — like Laguna Beach.', version: 1 },
  { id: 'french_accent',       name: 'French',                 group: 'regional',    geminiPromptSuffix: 'Speak English with a noticeable French accent — like a Parisian speaking English.', version: 1 },
  { id: 'german_accent',       name: 'German',                 group: 'regional',    geminiPromptSuffix: 'Speak with a noticeable German accent.', version: 1 },
  { id: 'russian_accent',      name: 'Russian',                group: 'regional',    geminiPromptSuffix: 'Speak with a noticeable Russian accent.', version: 1 },
  { id: 'italian_accent',      name: 'Italian',                group: 'regional',    geminiPromptSuffix: 'Speak with a noticeable Italian accent — expressive, melodic.', version: 1 },
  { id: 'spanish_accent',      name: 'Spanish',                group: 'regional',    geminiPromptSuffix: 'Speak with a noticeable Spanish accent.', version: 1 },
  { id: 'japanese_accent',     name: 'Japanese',               group: 'regional',    geminiPromptSuffix: 'Speak with a noticeable Japanese accent in English.', version: 1 },

  // Theatrical / fictional accents (quality varies, that's intentional)
  { id: 'pirate',              name: 'Pirate',                 group: 'theatrical',  geminiPromptSuffix: 'Speak in heavy theatrical pirate dialect — exaggerated West Country English, rolling r-sounds, dropped g-endings, dragged "arr" vowels. Lean fully into camp.', version: 1 },
  { id: 'shrek',               name: 'Shrek',                  group: 'theatrical',  geminiPromptSuffix: 'Speak with a thick Scottish accent in the style of the character Shrek — slightly gruff, working-class.', version: 1 },
  { id: 'shakespeare',         name: 'Shakespearean',          group: 'theatrical',  geminiPromptSuffix: 'Speak with theatrical Shakespearean English delivery — Royal Shakespeare Company style.', version: 1 },
  { id: 'wild_west_cowboy',    name: 'Wild West Cowboy',       group: 'theatrical',  geminiPromptSuffix: 'Speak as a 19th-century Wild West cowboy — dusty, slow, full of "partner" and "much obliged" energy.', version: 1 },
  { id: 'surfer_dude',         name: 'Surfer Dude',            group: 'theatrical',  geminiPromptSuffix: 'Speak as a laid-back California surfer — "totally," "dude," "gnarly" energy.', version: 1 },
  { id: 'french_pepe_le_pew',  name: 'Cartoon French',         group: 'theatrical',  geminiPromptSuffix: 'Speak with an exaggerated cartoon French accent — Pepé Le Pew style, theatrical.', version: 1 },
]

export function getGeminiAccent(id: string): GeminiAccent | undefined {
  return GEMINI_ACCENTS.find((a) => a.id === id)
}

export const DEFAULT_GEMINI_ACCENT_ID = 'none'
