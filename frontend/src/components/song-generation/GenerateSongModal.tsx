import { useEffect, useMemo, useState } from 'react'
import { Loader2, Music, X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/components/Toast'
import {
  getSongJobIdempotencyKey,
  submitMusicOnlyJob,
  type SongLyricMode,
  type SongVocalGender,
} from '@/lib/songGeneration'
import { SongGenrePicker } from './SongGenrePicker'
import { LyricDepthPicker } from './LyricDepthPicker'

export function GenerateSongModal({
  open,
  onOpenChange,
  track,
  credits,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  track: MusicTrack | null
  credits: number
  onSubmitted: (wordId: string, status: 'pending' | 'processing') => void
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [genre, setGenre] = useState<string | null>(null)
  const [lyricMode, setLyricMode] = useState<SongLyricMode>('reliable')
  const [vocalGender, setVocalGender] = useState<SongVocalGender>('female')
  const [submitting, setSubmitting] = useState(false)
  const insufficientCredits = credits < 10

  useEffect(() => {
    if (!open) return
    setGenre(null)
    setLyricMode('reliable')
    setVocalGender('female')
    setSubmitting(false)
  }, [open, track?.id])

  const selectedWord = useMemo(() => {
    if (!track) return ''
    return track.translation ? `${track.word} - ${track.translation}` : track.word
  }, [track])

  async function submit() {
    if (!track || submitting || insufficientCredits) return
    setSubmitting(true)
    try {
      const idempotencyKey = getSongJobIdempotencyKey({
        wordId: track.id,
        lyricMode,
        genre,
        vocalGender,
      })
      const result = await submitMusicOnlyJob({
        wordId: track.id,
        lyricMode,
        genre,
        vocalGender,
        idempotencyKey,
      })
      if (!result.success) {
        if (result.error === 'premium_required') {
          toast(t('music.premiumRequired'), 'error')
          return
        }
        if (result.error === 'insufficient_credits') {
          toast(t('music.insufficientCredits'), 'error')
          return
        }
        throw new Error(result.error || t('music.songRequestFailed'))
      }
      onSubmitted(track.id, result.status === 'processing' ? 'processing' : 'pending')
      onOpenChange(false)
      toast(t('music.songRequestStarted'), 'success')
    } catch (error) {
      console.warn('[music] generate song failed', error)
      toast(t('music.songRequestFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
      >
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Music className="h-5 w-5 shrink-0 text-primary" />
                {t('modal.generateSong.title')}
              </DialogTitle>
              <DialogDescription>
                {t('modal.generateSong.body')}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="h-8 w-8 shrink-0 rounded-md inline-flex items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('modal.generateSong.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">{selectedWord}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('modal.generateSong.costLine')}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('modal.generateSong.genreLabel')}</label>
            <SongGenrePicker value={genre} onChange={setGenre} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('modal.generateSong.depthLabel')}</label>
            <LyricDepthPicker value={lyricMode} onChange={setLyricMode} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('modal.generateSong.vocalLabel')}</label>
            <Select value={vocalGender} onValueChange={(value) => setVocalGender(value as SongVocalGender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">{t('modal.generateSong.vocal.female')}</SelectItem>
                <SelectItem value="male">{t('modal.generateSong.vocal.male')}</SelectItem>
                <SelectItem value="any">{t('modal.generateSong.vocal.any')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {insufficientCredits && (
            <p className="text-sm text-destructive">{t('modal.generateSong.insufficient')}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('modal.generateSong.cancel')}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!track || insufficientCredits || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('modal.generateSong.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
