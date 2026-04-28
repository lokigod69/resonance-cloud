type SettingsTree = Record<string, Record<string, unknown>>

const CLIP_DURATION_MIN = 6
const CLIP_DURATION_MAX = 30
const CLIP_DURATION_DEFAULT = 15

function normalizeClipDuration(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric)) return CLIP_DURATION_DEFAULT
  if (numeric < CLIP_DURATION_MIN || numeric > CLIP_DURATION_MAX) return CLIP_DURATION_DEFAULT
  return numeric
}

export function sanitizeDurationSettings(settings: SettingsTree): SettingsTree {
  const sanitized: SettingsTree = {}
  for (const [stage, values] of Object.entries(settings || {})) {
    sanitized[stage] = { ...(values || {}) }
  }

  const images = { ...(sanitized.images || {}) }
  delete images['short' + '_mode']
  images.clip_duration = normalizeClipDuration(images.clip_duration)
  sanitized.images = images

  if (sanitized.concept) delete sanitized.concept.duration
  if (sanitized.song) delete sanitized.song.duration

  return sanitized
}
