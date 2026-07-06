// Script Lab audio resolution.
//
// Every playable surface in a script (symbol, syllable, example word) carries a
// ScriptAudioSpec { itemId, text }. This module turns that into something
// playPronunciation (hooks/usePronunciation.ts) can play:
//   1. a pre-generated static asset from the manifest below, when one exists;
//   2. otherwise browser speechSynthesis speaking spec.text in the script's locale.
//
// No paid TTS provider is ever called from the client. To upgrade a script to
// studio audio, batch-generate files (ElevenLabs or any provider) into
// public/scripts/<scriptId>/<itemId>.mp3 and list them in the manifest — the
// resolution order above picks them up with zero component changes. See
// docs/Product/FABLE_SCRIPT_AUDIO_PROVIDER_PLAN.md.

import type { ScriptAudioSpec, ScriptDefinition } from './types'
import { GENERATED_SCRIPT_AUDIO } from './audioManifest.generated'

/** scriptId → itemId → asset URL. Rebuilt from the files on disk by
 * scripts/generate-script-lab-audio.ts — never edited by hand. */
const SCRIPT_AUDIO_MANIFEST: Record<string, Record<string, string>> = GENERATED_SCRIPT_AUDIO

export type ScriptPronunciationInput = {
  text: string
  audioUrl?: string | null
  lang?: string | null
}

export function resolveScriptAudio(
  script: Pick<ScriptDefinition, 'id' | 'speechLang'>,
  spec: ScriptAudioSpec,
): ScriptPronunciationInput {
  return {
    text: spec.text,
    audioUrl: SCRIPT_AUDIO_MANIFEST[script.id]?.[spec.itemId] ?? null,
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
  if (SCRIPT_AUDIO_MANIFEST[script.id]?.[spec.itemId]) return true
  if (!('speechSynthesis' in globalThis)) return false
  const voices = globalThis.speechSynthesis.getVoices()
  // Some engines report an empty list until voices load asynchronously; treat
  // "unknown yet" as playable and let the utterance fall back silently.
  if (voices.length === 0) return true
  const wanted = script.speechLang.toLowerCase().split('-')[0]
  return voices.some((voice) => voice.lang.toLowerCase().startsWith(wanted))
}
