import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSpeakLocale } from '@/data/guidedLessons'
import { cancelGuidedSpeech, speakGuidedText } from '@/components/today/speech'

export type GuidedAudioSurface = 'corePhrase' | 'chunk' | 'trophyWord'

export type GuidedAudioLookupArgs = {
  pathId: string
  lessonId: string
  vibe: ActiveGuidedVibeId
  surface: GuidedAudioSurface
  surfaceKey: string
}

export type GuidedAudioResolution =
  | { kind: 'ready'; url: string; durationMs?: number }
  | { kind: 'missing' }

export type GuidedAudioPlaybackResult =
  | { kind: 'stored' }
  | { kind: 'browser-fallback' }

export type GuidedAudioPlaybackRow = {
  path_id: string
  lesson_id: string
  vibe: string
  surface: string
  surface_key: string
  public_url: string | null
  duration_ms: number | null
}

type GuidedAudioFilterBuilder = {
  eq: (column: string, value: string) => GuidedAudioFilterBuilder
  maybeSingle: () => Promise<{ data: GuidedAudioPlaybackRow | null; error: { message?: string } | null }>
}

export type GuidedAudioClient = {
  from: (table: 'guided_tts_playback') => {
    select: (columns: string) => GuidedAudioFilterBuilder
  }
}

type ResolveOptions = {
  client?: GuidedAudioClient
}

type PlayOptions = ResolveOptions & {
  text: string
  lang?: GuidedSpeakLocale
  speak?: typeof speakGuidedText
  createAudio?: (url: string) => HTMLAudioElement
}

const playbackCache = new Map<string, GuidedAudioResolution>()
let activeAudio: HTMLAudioElement | null = null

export function clearGuidedAudioCache() {
  playbackCache.clear()
}

export async function resolveGuidedAudio(
  args: GuidedAudioLookupArgs,
  options: ResolveOptions = {},
): Promise<GuidedAudioResolution> {
  const key = buildGuidedAudioCacheKey(args)
  const cached = playbackCache.get(key)
  if (cached) return cached

  try {
    const client = options.client ?? await getDefaultSupabaseClient()
    const { data, error } = await client
      .from('guided_tts_playback')
      .select('path_id,lesson_id,vibe,surface,surface_key,public_url,duration_ms')
      .eq('path_id', args.pathId)
      .eq('lesson_id', args.lessonId)
      .eq('vibe', args.vibe)
      .eq('surface', args.surface)
      .eq('surface_key', args.surfaceKey)
      .maybeSingle()

    const result = error || !data?.public_url
      ? { kind: 'missing' as const }
      : {
          kind: 'ready' as const,
          url: data.public_url,
          durationMs: data.duration_ms ?? undefined,
        }

    playbackCache.set(key, result)
    return result
  } catch {
    const missing = { kind: 'missing' as const }
    playbackCache.set(key, missing)
    return missing
  }
}

export async function playGuidedAudio(
  args: GuidedAudioLookupArgs & PlayOptions,
): Promise<GuidedAudioPlaybackResult> {
  const speak = args.speak ?? speakGuidedText
  const resolution = await resolveGuidedAudio(args, { client: args.client })

  stopGuidedAudio()

  if (resolution.kind !== 'ready') {
    speak(args.text, args.lang)
    return { kind: 'browser-fallback' }
  }

  cancelGuidedSpeech()

  let audio: HTMLAudioElement
  try {
    audio = (args.createAudio ?? createBrowserAudio)(resolution.url)
  } catch {
    speak(args.text, args.lang)
    return { kind: 'browser-fallback' }
  }
  activeAudio = audio

  let didFallback = false
  const fallback = () => {
    if (didFallback) return
    didFallback = true
    if (activeAudio === audio) stopGuidedAudio()
    speak(args.text, args.lang)
  }

  audio.addEventListener('error', fallback, { once: true })

  try {
    await audio.play()
  } catch {
    fallback()
  }

  return didFallback ? { kind: 'browser-fallback' } : { kind: 'stored' }
}

export function stopGuidedAudio() {
  if (!activeAudio) return

  try {
    activeAudio.pause()
    activeAudio.currentTime = 0
  } catch {
    // Best effort only; fallback speech keeps the lesson usable.
  } finally {
    activeAudio = null
  }
}

function buildGuidedAudioCacheKey(args: GuidedAudioLookupArgs) {
  return [
    args.pathId,
    args.lessonId,
    args.vibe,
    args.surface,
    args.surfaceKey,
  ].join('|')
}

async function getDefaultSupabaseClient(): Promise<GuidedAudioClient> {
  const module = await import('@/lib/supabase')
  return module.supabase as unknown as GuidedAudioClient
}

function createBrowserAudio(url: string) {
  return new Audio(url)
}
