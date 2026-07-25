/* eslint-disable */
// The curated static-TTS library is irrelevant to the fixtures: every stub row
// carries no curriculum metadata, so homeWordDetails resolves ttsResolved=true
// on the first pass and never reaches these.

export function getStaticThematicVoiceProfileKeys(_input: any): string[] | undefined {
  return undefined
}

export function buildStaticThematicPlaybackQuery(input: any): any {
  return input
}

export async function fetchStaticThematicPlayback(_client: any, _query: any): Promise<any> {
  return new Map()
}

export function getStaticThematicAudio(_lookup: any, _conceptId: string, _voiceProfileKey?: string): any {
  return null
}
