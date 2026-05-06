import { supabase } from '@/lib/supabase'

export type SongLyricMode = 'reliable' | 'contextual' | 'creative' | 'dramatic'
export type SongVocalGender = 'female' | 'male' | 'any'

export type SubmitMusicOnlyJobInput = {
  wordId: string
  lyricMode: SongLyricMode
  genre: string | null
  vocalGender: SongVocalGender
  idempotencyKey: string
}

export type SubmitMusicOnlyJobResult = {
  success?: boolean
  music_job_id?: string
  idempotent?: boolean
  error?: string
  status?: string
  credits_available?: number
  credits_required?: number
}

export async function submitMusicOnlyJob({
  wordId,
  lyricMode,
  genre,
  vocalGender,
  idempotencyKey,
}: SubmitMusicOnlyJobInput): Promise<SubmitMusicOnlyJobResult> {
  const normalizedGenre = genre?.trim() || null
  const { data, error } = await supabase.rpc('submit_music_only_job', {
    p_word_id: wordId,
    p_lyric_mode: lyricMode,
    p_genre: normalizedGenre,
    p_vocal_gender: vocalGender,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    throw error
  }

  return (data ?? {}) as SubmitMusicOnlyJobResult
}

export function getSongJobIdempotencyKey({
  wordId,
  lyricMode,
  genre,
  vocalGender,
}: Omit<SubmitMusicOnlyJobInput, 'idempotencyKey'>): string {
  const storageKey = [
    'resonance-song-job',
    wordId,
    lyricMode,
    (genre?.trim() || 'auto').toLowerCase(),
    vocalGender,
  ].join(':')

  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing

  const generated = crypto.randomUUID()
  sessionStorage.setItem(storageKey, generated)
  return generated
}
