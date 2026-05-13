import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WordInfoPanel from '@/components/WordInfoPanel'
import { getOrCreateShareLink } from '@/lib/shareWord'
import GeneratedMediaFrame from '@/components/media/GeneratedMediaFrame'
import { getCardFullUrl } from '@/lib/imageUrls'

type CardViewerWord = {
  id: string
  word: string
  word_slug: string | null
  translation: string | null
  mnemonic: string | null
  etymology: string | null
  pos: string | null
  article: string | null
  example?: string | null
  example_gloss?: string | null
  bridge_mnemonic?: string | null
  dominant_emotional_reading?: string | null
  composition_hint?: string | null
  treatment_hint?: string | null
  card_image_model?: string | null
  rating: number | null
  thumbnail_url: string | null
  tts_audio_url: string | null
  metadata: Record<string, unknown> | null
}

type CardWordViewerModalProps = {
  words: CardViewerWord[]
  currentIndex: number
  onClose: () => void
  onNavigate: (idx: number) => void
  onRate: (wordId: string, rating: number) => void
}

export default function CardWordViewerModal({
  words,
  currentIndex,
  onClose,
  onNavigate,
  onRate,
}: CardWordViewerModalProps) {
  const word = words[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < words.length - 1
  const [sharing, setSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, currentIndex, hasPrev, hasNext])

  if (!word) return null

  async function handleShare() {
    if (!word) return
    setSharing(true)
    setShareSuccess(false)
    const url = await getOrCreateShareLink(word.id)
    if (!url) {
      setSharing(false)
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${word.word}${word.translation ? ` - ${word.translation}` : ''}`,
          text: word.mnemonic || `Learn "${word.word}" with Resonance`,
          url,
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[share] Native share failed:', err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      } catch {
        const input = document.createElement('input')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        setShareSuccess(true)
        setTimeout(() => setShareSuccess(false), 2000)
      }
    }
    setSharing(false)
  }

  return (
    <div className="fixed inset-0 z-50 gradient-bg flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close card viewer"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto h-0">
        <div className="w-full max-w-5xl space-y-6 pt-2 sm:pt-4">
          <div className="relative">
            <div className="relative overflow-hidden rounded-xl bg-black/50 shadow-2xl">
              {hasPrev && (
                <button
                  onClick={() => onNavigate(currentIndex - 1)}
                  className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                  aria-label="Previous card"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {hasNext && (
                <button
                  onClick={() => onNavigate(currentIndex + 1)}
                  className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                  aria-label="Next card"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              <GeneratedMediaFrame
                src={getCardFullUrl(word.thumbnail_url)}
                alt={word.word}
                variant="modal"
                className="max-h-[min(62vh,44rem)]"
              >
                <div className="flex h-full w-full items-center justify-center bg-white/5">
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </GeneratedMediaFrame>
            </div>
          </div>

          <WordInfoPanel word={word} onRate={onRate} />

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="border-white/10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {sharing ? 'Sharing...' : shareSuccess ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
