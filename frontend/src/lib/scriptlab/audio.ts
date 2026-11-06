// Script Lab recordings are downloaded on demand. New, unrecorded inventory
// can still use the device voice until its pronunciation pack is published.

import type { ScriptAudioSpec, ScriptDefinition } from './types'
import { GENERATED_HANGUL_BLOCKS, GENERATED_SCRIPT_AUDIO } from './audioManifest.generated'

function recordedUrl(id: string, spec: ScriptAudioSpec): string | null {
  if (id === 'korean-hangul' && spec.text.length === 1
    && spec.itemId === `composed-${spec.text.charCodeAt(0).toString(16)}`
    && GENERATED_HANGUL_BLOCKS.includes(spec.text)) {
    return `/scripts/${id}/local-tts/${spec.itemId}.mp3`
  }
  return GENERATED_SCRIPT_AUDIO[id]?.[spec.itemId] ?? null
}

export type ScriptPronunciationInput = {
  text: string
  audioUrl?: string | null
  allowSpeechFallback: boolean
  lang?: string | null
}

export function resolveScriptAudio(
  script: Pick<ScriptDefinition, 'id' | 'speechLang'>,
  spec: ScriptAudioSpec,
): ScriptPronunciationInput {
  const audioUrl = recordedUrl(script.id, spec)
  return {
    text: spec.text,
    audioUrl,
    allowSpeechFallback: !audioUrl,
    lang: script.speechLang,
  }
}

/** True when at least one playback path exists (an asset, or a speech voice for
 * the script's language). Used to hide listening-quiz questions on devices with
 * no Korean speech voice and no assets. */
export function canPlayScriptAudio(
  script: Pick<ScriptDefinition, 'id' | 'speechLang'>,
  spec: ScriptAudioSpec,
): boolean {
  if (recordedUrl(script.id, spec)) return true
  if (!('speechSynthesis' in globalThis)) return false
  const voices = globalThis.speechSynthesis.getVoices()
  const wanted = script.speechLang.toLowerCase().split('-')[0]
  return voices.some((voice) => voice.lang.toLowerCase().split('-')[0] === wanted)
}
