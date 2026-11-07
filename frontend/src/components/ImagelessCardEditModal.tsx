import { useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
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
  const [wordValue, setWordValue] = useState(() => word?.word ?? '')
  const [translationValue, setTranslationValue] = useState(() => word?.translation ?? '')
  const [ipaValue, setIpaValue] = useState(() => word?.ipa ?? '')

  const trimmedWord = wordValue.trim()
  const trimmedTranslation = translationValue.trim()
  const trimmedIpa = ipaValue.trim()
  const canSave = Boolean(word && trimmedWord && trimmedTranslation && !updating && !deleting)
  const changed = useMemo(() => {
    if (!word) return false
    return (
      trimmedWord !== word.word ||
      trimmedTranslation !== (word.translation ?? '') ||
      trimmedIpa !== (word.ipa ?? '')
    )
  }, [word, trimmedWord, trimmedTranslation, trimmedIpa])

  if (!word) return null

  async function handleSave() {
    if (!word || !canSave) return
    try {
      const updated = await editImagelessCard({
        word_id: word.id,
        word: trimmedWord,
        translation: trimmedTranslation,
        ipa: trimmedIpa || null,
        invalidatePronunciation: trimmedWord !== word.word,
      }) as EditableImagelessWord

      onSaved(updated)
      onClose()
    } catch {
      // The hook displays the save error. Keep the draft open for a retry.
    }
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
      <DialogContent className="sm:max-w-lg bg-[#0d0d12] border-white/10 text-white [&>[data-slot=dialog-close]]:top-4">
        <DialogHeader className="pr-12">
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
            disabled={deleting || updating}
          >
            {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            {t('imageless.edit.delete')}
          </Button>
          <Button type="button" variant="outline" className="border-white/10" onClick={onClose}>
            {t('imageless.edit.cancel')}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || !changed}>
            {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('imageless.edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
