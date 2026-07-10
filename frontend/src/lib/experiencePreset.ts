// Per-language "experience preset": how this learner wants quick practice to
// open (chosen once on the home page, changeable anytime). Maps straight onto
// a study-mode route so home entry points can skip the /study configurator.
// Stored client-side per user+language; a profiles column can absorb this
// later without changing callers.

export type ExperiencePreset = 'visual' | 'listening' | 'writing' | 'playful'

export const EXPERIENCE_PRESETS: ExperiencePreset[] = ['visual', 'listening', 'writing', 'playful']

export const PRESET_EMOJI: Record<ExperiencePreset, string> = {
  visual: '👁️',
  listening: '🎧',
  writing: '✍️',
  playful: '🎮',
}

export function presetLabelKey(preset: ExperiencePreset): string {
  return `home.preset.${preset}`
}

// Study-mode page the preset opens directly. Playful returns null — the
// slicer needs its own launch params, so callers route it separately.
export function presetStudyRoute(preset: ExperiencePreset): string | null {
  switch (preset) {
    case 'visual': return '/study/image'
    case 'listening': return '/study/audio'
    case 'writing': return '/study/type'
    case 'playful': return null
  }
}

function storageKey(userId: string, language: string): string {
  return `lingwave_experience_preset_${userId}_${language}`
}

export function readExperiencePreset(userId: string | null | undefined, language: string | null | undefined): ExperiencePreset | null {
  if (!userId || !language) return null
  try {
    const raw = localStorage.getItem(storageKey(userId, language))
    return raw && (EXPERIENCE_PRESETS as string[]).includes(raw) ? raw as ExperiencePreset : null
  } catch {
    return null
  }
}

export function writeExperiencePreset(userId: string | null | undefined, language: string | null | undefined, preset: ExperiencePreset): void {
  if (!userId || !language) return
  try {
    localStorage.setItem(storageKey(userId, language), preset)
  } catch {
    // Storage unavailable (private mode) — the picker will simply reappear.
  }
}
