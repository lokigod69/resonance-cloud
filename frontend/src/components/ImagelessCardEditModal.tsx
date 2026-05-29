import { useMemo, useState } from 'react'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteImagelessCard } from '@/hooks/useDeleteImagelessCard'
import { useEditImagelessCard } from '@/hooks/useEditImagelessCard'
import { useRegenerateImagelessTts } from '@/hooks/useRegenerateImagelessTts'
import { useTranslation } from '@/hooks/useTranslation'

type EditableImagelessWord = {
  id: string
  word: string
  translation: string | null
  ipa: string | null
  tts_audio_url?: string | null
}

interface ImagelessCardEditModalProps {
  word: EditableImagelessWord | null
  isOpen: boolean
  onClose: () => void
  onSaved: (word: EditableImagelessWord) => void
  onDeleted: (wordId: string, deck?: { word_count: number; status: string }) => void
}

export default function ImagelessCardEditModal({
  word,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: ImagelessCardEditModalProps) {
  const { t } = useTranslation()
  const { editImagelessCard, updating, error: editError } = useEditImagelessCard()
  const { deleteImagelessCard, deleting, error: deleteError } = useDeleteImagelessCard()
  const { regenerateImagelessTts, generating, error: ttsError } = useRegenerateImagelessTts()
  const [wordValue, setWordValue] = useState(() => word?.word ?? '')
  const [translationValue, setTranslationValue] = useState(() => word?.translation ?? '')
  const [ipaValue, setIpaValue] = useState(() => word?.ipa ?? '')
  const [ttsStatus, setTtsStatus] = useState<string | null>(null)

  const trimmedWord = wordValue.trim()
  const trimmedTranslation = translationValue.trim()
  const trimmedIpa = ipaValue.trim()
  const canSave = Boolean(word && trimmedWord && trimmedTranslation && !updating && !generating && !deleting)
  const changed = useMemo(() => {
    if (!word) return false
    return (
      trimmedWord !== word.word ||
      trimmedTranslation !== (word.translation ?? '') ||
      trimmedIpa !== (word.ipa ?? '')
    )
  }, [word, trimmedWord, trimmedTranslation, trimmedIpa])

  if (!word) return null

  async function handleRegenerate() {
    if (!word) return
    setTtsStatus(null)
    const result = await regenerateImagelessTts({ word_id: word.id })
    const refreshed = result.results.find((item) => item.word_id === word.id)
    if (refreshed?.tts_audio_url) {
      onSaved({
        ...word,
        tts_audio_url: refreshed.tts_audio_url,
      })
    }
    setTtsStatus(t('imageless.edit.regenerated'))
  }

  async function handleSave() {
    if (!word || !canSave) return
    const wordChanged = trimmedWord !== word.word
    const updated = await editImagelessCard({
      word_id: word.id,
      word: trimmedWord,
      translation: trimmedTranslation,
      ipa: trimmedIpa || null,
    }) as EditableImagelessWord | null

    const regenerated = wordChanged
      ? await regenerateImagelessTts({ word_id: word.id })
      : null
    const regeneratedAudioUrl = regenerated?.results.find((item) => item.word_id === word.id)?.tts_audio_url

    const updatedWord = updated ?? {
      id: word.id,
      word: trimmedWord,
      translation: trimmedTranslation,
      ipa: trimmedIpa || null,
    }

    onSaved({
      ...updatedWord,
      tts_audio_url: regeneratedAudioUrl ?? word.tts_audio_url,
    })
    onClose()
  }

  async function handleDelete() {
    if (!word) return
    if (!window.confirm(t('imageless.edit.confirmDelete'))) return
    const result = await deleteImagelessCard({ word_id: word.id })
    if (result.success) {
      onDeleted(word.id, result.deck)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-[#0d0d12] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{t('imageless.edit.title')}</DialogTitle>
          <DialogDescription>{t('imageless.edit.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">{t('imageless.edit.word')}</span>
            <input
              value={wordValue}
              onChange={(event) => setWordValue(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">{t('imageless.edit.translation')}</span>
            <input
              value={translationValue}
              onChange={(event) => setTranslationValue(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/80">{t('imageless.edit.ipa')}</span>
            <input
              value={ipaValue}
              onChange={(event) => setIpaValue(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-white/25"
            />
          </label>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={generating || deleting || updating}
              className="border-white/10"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {t('imageless.edit.regenerateTts')}
            </Button>
            {(ttsStatus || ttsError) && (
              <p className={`mt-2 text-xs ${ttsError ? 'text-red-300' : 'text-emerald-300'}`}>
                {ttsError || ttsStatus}
              </p>
            )}
          </div>

          {(editError || deleteError) && (
            <p className="text-sm text-red-300">{editError || deleteError}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 sm:mr-auto"
            onClick={handleDelete}
            disabled={deleting || updating || generating}
          >
            {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            {t('imageless.edit.delete')}
          </Button>
          <Button type="button" variant="outline" className="border-white/10" onClick={onClose}>
            {t('imageless.edit.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || !changed}>
            {(updating || (generating && changed)) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('imageless.edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
