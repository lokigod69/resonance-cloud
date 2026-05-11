import {
  DEFAULT_GUIDED_VIBE_ID,
  isActiveGuidedVibeId,
  type ActiveGuidedVibeId,
  type GuidedVibeId,
} from '@/data/guidedVibes'

export { DEFAULT_GUIDED_VIBE_ID }

const GUIDED_VIBE_STORAGE_PREFIX = 'resonance_guided_vibe__'

export function todayGuidedVibeKey(pathIdOrTargetLanguage: string) {
  const scope = pathIdOrTargetLanguage.trim() || 'default'
  return `${GUIDED_VIBE_STORAGE_PREFIX}${scope}`
}

export function resolveGuidedVibe(value: unknown): ActiveGuidedVibeId {
  return isActiveGuidedVibeId(value) ? value : DEFAULT_GUIDED_VIBE_ID
}

export function getSelectedGuidedVibe(pathIdOrTargetLanguage: string): ActiveGuidedVibeId {
  if (!canUseLocalStorage()) {
    return DEFAULT_GUIDED_VIBE_ID
  }

  try {
    return resolveGuidedVibe(window.localStorage.getItem(todayGuidedVibeKey(pathIdOrTargetLanguage)))
  } catch {
    return DEFAULT_GUIDED_VIBE_ID
  }
}

export function setSelectedGuidedVibe(
  pathIdOrTargetLanguage: string,
  vibeId: GuidedVibeId | string,
) {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(todayGuidedVibeKey(pathIdOrTargetLanguage), resolveGuidedVibe(vibeId))
  } catch {
    return
  }
}

export function clearSelectedGuidedVibe(pathIdOrTargetLanguage: string) {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(todayGuidedVibeKey(pathIdOrTargetLanguage))
  } catch {
    return
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}
