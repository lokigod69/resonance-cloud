import { useEffect } from 'react'
import { PencilLine, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ImagelessCard from '@/components/study/ImagelessCard'
import { getCardFontClass, getCardFontStack } from '@/lib/typography/cardFonts'
import { cn } from '@/lib/utils'
import { usePronunciation } from '@/hooks/usePronunciation'
import { useTranslation } from '@/hooks/useTranslation'

type ImagelessViewerWord = {
  id: string
  word: string
  translation: string | null
  ipa: string | null
  tts_audio_url: string | null
  target_language?: string | null
  language?: string | null
}

interface ImagelessCardViewerModalProps {
  word: ImagelessViewerWord
  isOpen: boolean
  isManageMode: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ImagelessCardViewerModal({
  word,
  isOpen,
  isManageMode,
  onClose,
  onEdit,
  onDelete,
}: ImagelessCardViewerModalProps) {
  const { playWord } = usePronunciation()
  const { t } = useTranslation()
  const cleanTranslation = word.translation?.trim()
  const cleanIpa = word.ipa?.trim()

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 gradient-bg flex flex-col"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close image-less card viewer"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">{word.word}</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] overflow-y-auto h-0">
        <div className="w-full max-w-3xl space-y-5">
          <ImagelessCard
            word={word.word}
            translation={word.translation ?? ''}
            ipa={word.ipa}
            revealed
            targetLanguage={word.target_language ?? word.language ?? ''}
          />

          <div
            data-imageless-modal-details
            className="flex flex-col items-center justify-center gap-1.5 text-center"
          >
            <button
              type="button"
              onClick={() => { void playWord(word) }}
              className={cn(
                'bg-transparent border-0 p-0 text-2xl font-bold text-white long-copy cursor-pointer hover:opacity-85 transition-opacity',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                getCardFontClass(word.target_language ?? word.language ?? ''),
              )}
              style={{ fontFamily: getCardFontStack(word.target_language ?? word.language ?? '') }}
              aria-label={`Play pronunciation for ${word.word}`}
            >
              {word.word}
            </button>
            {cleanIpa && (
              <p className="max-w-2xl font-mono text-sm text-white/45 long-copy">
                /{cleanIpa.replace(/^\/|\/$/g, '')}/
              </p>
            )}
            {cleanTranslation && (
              <p className="max-w-2xl text-lg text-white/65 long-copy">{cleanTranslation}</p>
            )}
          </div>

          {isManageMode && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-white/10"
                onClick={onEdit}
              >
                <PencilLine className="h-4 w-4 mr-2" />
                {t('imageless.viewer.editCard')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('imageless.viewer.deleteCard')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
