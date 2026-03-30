import { useState, useCallback } from 'react'
import { Music, Loader2 } from 'lucide-react'
import { AudioPlayer } from '@/components/AudioPlayer'
import { generateSunoSong } from '@/api'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

interface SunoPlayerProps {
  wordId: string
  wordSlug: string | null
  deckId: string
  userId: string
  audioUrl: string | null
  onAudioGenerated?: (url: string) => void
  className?: string
}

export default function SunoPlayer({
  wordId,
  wordSlug,
  deckId,
  userId,
  audioUrl,
  onAudioGenerated,
  className,
}: SunoPlayerProps) {
  const [loading, setLoading] = useState(false)
  const [localAudioUrl, setLocalAudioUrl] = useState(audioUrl)
  const { toast } = useToast()

  const handleGenerate = useCallback(async () => {
    if (!wordSlug || loading) return
    setLoading(true)
    try {
      const result = await generateSunoSong(wordSlug, deckId, userId)

      // Save to Supabase
      await supabase
        .from('words')
        .update({ suno_audio_url: result.audio_url, suno_task_id: result.task_id })
        .eq('id', wordId)

      setLocalAudioUrl(result.audio_url)
      onAudioGenerated?.(result.audio_url)
      toast('Full song is ready to play', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast(`Song generation failed: ${msg}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [wordSlug, deckId, userId, wordId, loading, onAudioGenerated, toast])

  const url = localAudioUrl || audioUrl

  if (url) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-1">
          <Music size={12} className="text-purple-400" />
          <span className="text-xs text-gray-400">Full Song</span>
        </div>
        <AudioPlayer src={url} className="bg-white/5 rounded-lg px-3 py-2" />
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        onClick={handleGenerate}
        disabled={loading || !wordSlug}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Generating song…</span>
          </>
        ) : (
          <>
            <Music size={14} />
            <span>Generate Full Song</span>
          </>
        )}
      </button>
    </div>
  )
}
