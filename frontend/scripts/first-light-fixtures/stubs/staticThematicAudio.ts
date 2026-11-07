/* eslint-disable */
// The curated static-TTS library is irrelevant to the fixtures: every stub row
// carries no curriculum metadata, so homeWordDetails resolves ttsResolved=true
// on the first pass and never reaches these.
import { record, scenario } from './scenario'

export function getStaticThematicVoiceProfileKeys(_input: any): string[] | undefined {
  return undefined
}

export function buildStaticThematicPlaybackQuery(input: any): any {
  return input
}

export async function fetchStaticThematicPlayback(_client: any, query: any): Promise<any> {
  record('static:playback', query)
  const { staticAudioUrl, staticAudioDelayMs } = scenario()
  if (staticAudioDelayMs) await new Promise((resolve) => setTimeout(resolve, staticAudioDelayMs))
  return new Map(query.conceptIds.map((id: string) => [id, { public_url: staticAudioUrl }]))
}

export function getStaticThematicAudio(lookup: any, conceptId: string, _voiceProfileKey?: string): any {
  return lookup.get(conceptId) ?? null
}
