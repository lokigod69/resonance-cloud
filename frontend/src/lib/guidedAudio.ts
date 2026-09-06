import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSpeakLocale } from '@/data/guidedLessons'
import { cancelGuidedSpeech, speakGuidedText } from '@/components/today/speech'
import { withClientDeadline } from '@/lib/clientDeadline'

/**
 * B1 adds two surfaces (design doc §4.7): 'dialogue' keys the episode's
 * non-core turns as 'turn-1' / 'turn-3' / 'turn-4' (you₁ = turn 2 stays on
 * 'corePhrase'/'__self'), and 'pattern' keys the spotlight examples 'ex-1..3'.
 */
export type GuidedAudioSurface = 'corePhrase' | 'chunk' | 'trophyWord' | 'dialogue' | 'pattern'

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
  | { kind: 'cancelled' }

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
  abortSignal?: (signal: AbortSignal) => GuidedAudioFilterBuilder
  maybeSingle: () => Promise<{ data: GuidedAudioPlaybackRow | null; error: { message?: string } | null }>
}

export type GuidedAudioClient = {
  from: (table: 'guided_tts_playback') => {
    select: (columns: string) => GuidedAudioFilterBuilder
  }
}

type ResolveOptions = {
  client?: GuidedAudioClient
  signal?: AbortSignal
}

type PlayOptions = ResolveOptions & {
  text: string
  lang?: GuidedSpeakLocale
  speak?: typeof speakGuidedText
  cancelSpeech?: typeof cancelGuidedSpeech
  createAudio?: (url: string) => HTMLAudioElement
}

const GUIDED_AUDIO_LOOKUP_TIMEOUT_MS = 8000
const playbackCache = new Map<string, GuidedAudioResolution>()
let activeAudio: HTMLAudioElement | null = null
let activeSpeechCancel: typeof cancelGuidedSpeech = cancelGuidedSpeech
let activeResolveController: AbortController | null = null
let playbackGeneration = 0

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
    let query = client
      .from('guided_tts_playback')
      .select('path_id,lesson_id,vibe,surface,surface_key,public_url,duration_ms')
      .eq('path_id', args.pathId)
      .eq('lesson_id', args.lessonId)
      .eq('vibe', args.vibe)
      .eq('surface', args.surface)
      .eq('surface_key', args.surfaceKey)

    const { data, error } = await withClientDeadline(async (signal) => {
      if (query.abortSignal) query = query.abortSignal(signal)
      return query.maybeSingle()
    }, GUIDED_AUDIO_LOOKUP_TIMEOUT_MS, options.signal)

    if (error) return { kind: 'missing' }

    const result = !data?.public_url
      ? { kind: 'missing' as const }
      : {
          kind: 'ready' as const,
          url: data.public_url,
          durationMs: data.duration_ms ?? undefined,
        }

    playbackCache.set(key, result)
    return result
  } catch {
    // A timeout, abort, or transport failure is not proof that stored audio is
    // absent. Fall back for this attempt without poisoning the page cache.
    return { kind: 'missing' }
  }
}

export async function playGuidedAudio(
  args: GuidedAudioLookupArgs & PlayOptions,
): Promise<GuidedAudioPlaybackResult> {
  const speak = args.speak ?? speakGuidedText
  const requestGeneration = ++playbackGeneration
  stopActivePlayback()
  const controller = new AbortController()
  activeResolveController = controller
  const resolution = await resolveGuidedAudio(args, { client: args.client, signal: controller.signal })
  if (activeResolveController === controller) activeResolveController = null

  if (requestGeneration !== playbackGeneration) return { kind: 'cancelled' }

  if (resolution.kind !== 'ready') {
    activeSpeechCancel = args.cancelSpeech ?? cancelGuidedSpeech
    speak(args.text, args.lang)
    return { kind: 'browser-fallback' }
  }

  let audio: HTMLAudioElement
  try {
    audio = (args.createAudio ?? createBrowserAudio)(resolution.url)
  } catch {
    activeSpeechCancel = args.cancelSpeech ?? cancelGuidedSpeech
    speak(args.text, args.lang)
    return { kind: 'browser-fallback' }
  }
  activeAudio = audio

  let didFallback = false
  const fallback = () => {
    if (didFallback || requestGeneration !== playbackGeneration || activeAudio !== audio) return
    didFallback = true
    stopActivePlayback()
    activeSpeechCancel = args.cancelSpeech ?? cancelGuidedSpeech
    speak(args.text, args.lang)
  }

  audio.addEventListener('error', fallback, { once: true })

  try {
    await audio.play()
  } catch {
    fallback()
  }

  if (requestGeneration !== playbackGeneration) return { kind: 'cancelled' }
  return didFallback ? { kind: 'browser-fallback' } : { kind: 'stored' }
}

export function stopGuidedAudio() {
  playbackGeneration += 1
  stopActivePlayback()
}

function stopActivePlayback() {
  activeResolveController?.abort()
  activeResolveController = null
  activeSpeechCancel()
  activeSpeechCancel = cancelGuidedSpeech
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
