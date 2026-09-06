import { CHARACTER_REGISTRY } from '../../src/characterRegistry'
import { GEMINI_CHARACTER_MODES } from '../../src/data/geminiCharacterModes'
import { ApiError } from './http'

/** Resolve instructions from the same pure-data registry used by the picker. */
export function resolveSpeakPersona(input: Record<string, unknown>) {
  const level = input.level || 'intermediate'
  if (!['zero', 'beginner', 'intermediate', 'advanced'].includes(String(level))) {
    throw new ApiError(400, 'Unsupported level')
  }
  // Today's guided roleplay uses guided-transcribe, not this retired custom-
  // script API. Future voice scenes must be registered on the server.
  if (input.scenarioPrompt || input.mode === 'roleplay') {
    throw new ApiError(400, 'Custom roleplay instructions are not supported')
  }
  const hasLegacyCharacter = Boolean(input.character_name || input.character_tier
    || input.character_identity || input.character_directive)
  const character = input.character_id
    ? CHARACTER_REGISTRY.find(entry => entry.id === input.character_id)
    : hasLegacyCharacter ? CHARACTER_REGISTRY.find(entry =>
      entry.name === input.character_name && entry.tier === input.character_tier
      && entry.identity === (input.character_identity || '')
      && entry.directive === input.character_directive) : undefined
  if ((input.character_id || hasLegacyCharacter) && !character) {
    throw new ApiError(400, 'Unknown tutor character')
  }
  // Already-installed clients may send the old tuple only when it matches
  // the canonical entry exactly. Incoming strings never become instructions.
  if (hasLegacyCharacter && character && (
    character.name !== input.character_name || character.tier !== input.character_tier
    || character.identity !== (input.character_identity || '')
    || character.directive !== input.character_directive
  )) throw new ApiError(400, 'Tutor instructions do not match the selected character')

  const mode = input.gemini_character_mode_id
    ? GEMINI_CHARACTER_MODES.find(entry => entry.id === input.gemini_character_mode_id)
    : undefined
  if (input.gemini_character_mode_id && !mode) throw new ApiError(400, 'Unknown voice style')
  const vibe = mode ? level === 'zero' ? mode.geminiVibeFlavor
    : level === 'beginner' ? mode.geminiVibeHint : mode.geminiVibeDirective : undefined
  if (input.gemini_vibe_directive && input.gemini_vibe_directive !== vibe) {
    throw new ApiError(400, 'Voice instructions do not match the selected style')
  }
  if (character && mode) throw new ApiError(400, 'Choose one tutor style')
  return {
    character_name: character?.name,
    character_tier: character?.tier,
    character_identity: character?.identity,
    character_directive: character?.directive,
    gemini_vibe_directive: vibe,
    scenarioPrompt: undefined,
  }
}
