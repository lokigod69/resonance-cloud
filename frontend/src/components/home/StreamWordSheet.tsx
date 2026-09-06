import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ImagePlus, Music, Volume2, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useHomeSheetFocus } from '@/hooks/useHomeSheetFocus'
import { useTranslation } from '@/hooks/useTranslation'
import { playPronunciation, prefetchPronunciationAudio } from '@/hooks/usePronunciation'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import { GenerateSongModal } from '@/components/song-generation/GenerateSongModal'
import { WordStreamUnavailableError, type StreamKeepResult } from '@/hooks/useWordStream'
import { isBetaTargetLanguage } from '@/lib/languages'
import type { StreamWord } from '@/lib/wordStream'

// StreamWordSheet — a new word, opened (docs/Product/FABLE_WORD_STREAM_PLAN.md §3).
//
// The learner tapped a word that caught their ear. This sheet lets them hear
// it, see what it means, and decide: keep it (it becomes a card in their
// per-language stream deck and enters the SRS as a new word) or let it pass
// (it sinks and stays away for two weeks). After a keep, two credit doors
// open — a picture through Generate, a song through the song modal — and the
// queue control moves to the next word on the water.
//
// Honest counting, the buoys' rule: only a resolved insert marks the word
// kept; a failed insert shows an inline retry and nothing advances.
//
// Keyboard: Escape closes; focus stays in the sheet and returns to the opener
// or the Home CTA when a keep removed that opener from the water.

type KeepState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'failed'; unavailable: boolean }
  | { kind: 'done'; result: StreamKeepResult }

export type StreamWordSheetProps = {
  word: StreamWord | null
  /** Canonical display value ('German') — what playPronunciation expects. */
  language: string
  langCode?: string
  /** Recorded pronunciation lookup — resolves null when the language has no
   * static recordings (browser speech is then the honest fallback). */
  resolveAudio: (word: StreamWord) => Promise<string | null>
  keptToday: number | null
  goal: number
  credits: number
  hasNext: boolean
  onKeep: (word: StreamWord, ttsAudioUrl: string | null) => Promise<StreamKeepResult>
  onPass: (word: StreamWord) => void
  onNext: () => void
  onClose: () => void
  /** A song job was accepted for the kept word (the parent tells the learner
   * where it lands and refreshes the credit balance). */
  onSongSubmitted?: (wordId: string) => void
}

export default function StreamWordSheet({
  word,
  language,
  langCode,
  resolveAudio,
  keptToday,
  goal,
  credits,
  hasNext,
  onKeep,
  onPass,
  onNext,
  onClose,
  onSongSubmitted,
}: StreamWordSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [audio, setAudio] = useState<{ key: string; url: string | null; resolved: boolean } | null>(null)
  const [keep, setKeep] = useState<{ key: string; state: KeepState } | null>(null)
  // Keyed by word so a swap closes the modal without an effect.
  const [songOpenFor, setSongOpenFor] = useState<string | null>(null)
  const playedRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const key = word?.conceptId ?? null
  const keepState: KeepState = keep && keep.key === key ? keep.state : { kind: 'idle' }
  const audioUrl = audio && audio.key === key ? audio.url : null
  const audioResolved = audio?.key === key && audio.resolved
  const songOpen = key !== null && songOpenFor === key
  const sheetOpen = word !== null

  // The song modal (a Radix Dialog) scrolls its own content; the sheet's
  // touchmove lock would make it unscrollable on iOS, so it lifts meanwhile.
  useBodyScrollLock(word !== null && !songOpen)
  useHomeSheetFocus({ open: sheetOpen, dialogRef, onClose, suspended: songOpen, focusKey: key })

  // Resolve the recording as the sheet opens; warm it so the first play is
  // instant. Late results for a previous word are ignored by key.
  useEffect(() => {
    if (!word) return
    const wordKey = word.conceptId
    playedRef.current = false
    let cancelled = false
    void resolveAudio(word).then((url) => {
      if (cancelled) return
      prefetchPronunciationAudio(url)
      setAudio({ key: wordKey, url, resolved: true })
    })
    return () => {
      cancelled = true
    }
  }, [resolveAudio, word])

  const play = useCallback(() => {
    if (!word) return
    void playPronunciation({
      text: word.targetTerm,
      audioUrl,
      lang: language,
      // A recording that exists must never be replaced by a synthetic voice;
      // with none at all, the browser voice is the only honest option.
      allowSpeechFallback: !audioUrl,
    })
  }, [audioUrl, language, word])

  // One automatic play per word once the recording lookup has settled.
  useEffect(() => {
    if (!word || !audioResolved || playedRef.current) return
    playedRef.current = true
    play()
  }, [audioResolved, play, word])

  // The keep waits for the recording lookup (cached, usually already settled)
  // so a fast tap never stores a null url for a word that has a recording.
  const runKeep = useCallback(() => {
    if (!word || keepState.kind === 'pending' || keepState.kind === 'done') return
    const wordKey = word.conceptId
    setKeep({ key: wordKey, state: { kind: 'pending' } })
    resolveAudio(word)
      .then((url) => onKeep(word, url))
      .then((result) => setKeep({ key: wordKey, state: { kind: 'done', result } }))
      .catch((error: unknown) => {
        setKeep({ key: wordKey, state: { kind: 'failed', unavailable: error instanceof WordStreamUnavailableError } })
      })
  }, [keepState.kind, onKeep, resolveAudio, word])

  const kept = keepState.kind === 'done' ? keepState.result : null
  const goalMet = keptToday !== null && keptToday >= goal
  // Generate only mints decks in beta languages — the picture door follows.
  const pictureAvailable = isBetaTargetLanguage(language)

  const songTrack: MusicTrack | null = word && kept?.wordId
    ? {
        id: kept.wordId,
        kind: 'word',
        deck_id: kept.deckId,
        deckName: '',
        word: word.targetTerm,
        translation: word.helperTerm,
        thumbnail_url: word.thumbnailUrl,
        suno_storage_url: null,
        suno_audio_url: null,
        music_state: 'pending',
        retry_requested: false,
        metadata: null,
        song_generation: null,
        category_slug: word.categorySlug,
        level_number: word.level,
        target_language: language,
        genre: null,
        duration: null,
        error: false,
      }
    : null

  const openPicture = useCallback(() => {
    if (!word) return
    const params = new URLSearchParams({ word: word.targetTerm, lang: word.targetLanguageName })
    navigate(`/generate?${params.toString()}`, { state: { streamWord: word } })
  }, [navigate, word])

  const ctaClass = `w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-50 ${reduceMotion ? 'transition-none' : 'transition-all active:scale-[0.98]'}`
  const doorClass = 'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-3 py-2.5 text-left transition-colors hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50'

  return createPortal(
    <>
      <AnimatePresence>
        {word && (
          <motion.div
            // The song modal is a Radix Dialog at z-50 in the same body
            // portal; while it is open the sheet steps below it so the modal
            // is the visible, interactive layer.
            className={`theme-cosmos fixed inset-0 flex items-center justify-center p-4 ${songOpen ? 'z-40' : 'z-[60]'}`}
            style={{
              background: 'color-mix(in srgb, var(--app-bg) 72%, transparent)',
              backdropFilter: 'blur(20px) saturate(0.95)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="stream-word-title"
              tabIndex={-1}
              data-body-scroll-lock-scrollable="true"
              // `100vh` in the class is the iOS 15 fallback; the inline `dvh`
              // wins wherever dynamic viewport units exist.
              className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 outline-none sm:p-6"
              style={{
                maxHeight: 'calc(100dvh - 2rem)',
                background: 'var(--surface-glass-strong)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-elevated)',
                color: 'var(--text-primary)',
              }}
              initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.96 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                  <span aria-hidden="true">{word.categoryEmoji}</span>
                  <span className="truncate">{t(word.categoryLabelKey)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">{t('home.stream.sheet.level', { level: word.level })}</span>
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-colors hover:cursor-pointer hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                  aria-label={t('categories.modal.close')}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {/* The picture is a replay control, as on the recall sheet. It
                  stays at max-h-48 (the sibling's 56 does not fit the SE
                  pre-keep layout in a 536 px cap) — do not "align" it. The
                  img is keyed per word so a hidden 404 never carries over to
                  the next word. */}
              {word.thumbnailUrl ? (
                <button
                  key={word.conceptId}
                  type="button"
                  onClick={play}
                  aria-label={t('study.playPronunciationAria', { word: word.targetTerm })}
                  className={`relative mb-4 block w-full cursor-pointer overflow-hidden rounded-xl ${reduceMotion ? 'transition-none' : 'transition-transform active:scale-[0.99]'}`}
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <img
                    key={word.conceptId}
                    src={word.thumbnailUrl}
                    alt=""
                    className="block max-h-48 w-full object-cover"
                    onError={(event) => {
                      // The manifest proves the category set exists, not every
                      // entry — hide the whole control rather than a broken box.
                      event.currentTarget.parentElement?.setAttribute('hidden', '')
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--app-bg)_74%,transparent)] text-[var(--accent-2)] backdrop-blur-sm"
                  >
                    <Volume2 className="h-4 w-4" />
                  </span>
                </button>
              ) : null}

              {/* The word is the replay control — hear it as often as it takes. */}
              <button
                type="button"
                onClick={play}
                aria-label={t('study.playPronunciationAria', { word: word.targetTerm })}
                className={`mx-auto flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-[var(--accent-soft)] ${reduceMotion ? '' : 'active:scale-[0.98]'}`}
              >
                <span id="stream-word-title" className="font-display text-3xl font-bold long-copy" lang={langCode} dir="auto">
                  {word.targetTerm}
                </span>
                <Volume2 className="h-5 w-5 shrink-0 text-[var(--accent-2)]" aria-hidden="true" />
              </button>
              <p className="mt-1 text-center text-base text-[var(--text-secondary)] long-copy" lang={word.helperLanguageCode} dir="auto">{word.helperTerm}</p>

              <div className="mt-5 min-h-[7rem]" aria-live="polite">
                <AnimatePresence mode="wait">
                  {kept ? (
                    <motion.div
                      key="kept"
                      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-center gap-2 text-center">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--pg-accent-green)]/60 bg-[var(--pg-accent-green)]/20">
                          <Check className="h-4 w-4 text-[var(--pg-accent-green)]" aria-hidden="true" />
                        </span>
                        <p className={`text-sm font-semibold ${goalMet ? 'text-[var(--accent-2)]' : 'text-[var(--text-primary)]'}`}>
                          {!kept.inserted
                            ? t('home.stream.sheet.alreadyKept')
                            : keptToday === null
                              ? t('home.stream.sheet.keptPlain')
                              : goalMet
                                ? t('home.stream.sheet.keptGoalMet', { kept: keptToday })
                                : t('home.stream.sheet.kept', { kept: keptToday, goal })}
                        </p>
                      </div>

                      {pictureAvailable ? (
                        <button type="button" onClick={openPicture} className={doorClass}>
                          <ImagePlus className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                          <span className="flex min-w-0 flex-col">
                            <span className="font-display text-sm font-semibold">{t('home.stream.sheet.picture')}</span>
                            <span className="text-xs text-[var(--text-muted)]">{t('home.stream.sheet.pictureCost')}</span>
                          </span>
                        </button>
                      ) : null}
                      {songTrack ? (
                        <button
                          type="button"
                          onClick={() => setSongOpenFor(word.conceptId)}
                          className={doorClass}
                        >
                          <Music className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                          <span className="flex min-w-0 flex-col">
                            <span className="font-display text-sm font-semibold">{t('home.stream.sheet.song')}</span>
                            <span className="text-xs text-[var(--text-muted)]">{t('home.stream.sheet.songCost')}</span>
                          </span>
                        </button>
                      ) : null}

                      <button type="button" onClick={hasNext ? onNext : onClose} className={`${ctaClass} mt-1`}>
                        {hasNext ? t('home.fl.sheet.next') : t('home.fl.sheet.done')}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="decide"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2.5"
                    >
                      {keepState.kind === 'failed' ? (
                        <p className="text-center text-sm text-[var(--text-muted)]">
                          {keepState.unavailable ? t('home.stream.sheet.unavailable') : t('home.stream.sheet.keepFailed')}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={runKeep}
                        disabled={keepState.kind === 'pending'}
                        className={`lw-swell-cta inline-flex h-11 w-full items-center justify-center rounded-xl px-5 font-display text-sm font-semibold disabled:cursor-wait disabled:opacity-70 ${reduceMotion ? '' : 'active:scale-[0.98]'}`}
                      >
                        {keepState.kind === 'pending'
                          ? t('home.stream.sheet.keeping')
                          : keepState.kind === 'failed'
                            ? t('home.fl.hero.cta.retry')
                            : t('home.stream.sheet.keep')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPass(word)}
                        disabled={keepState.kind === 'pending'}
                        className="text-sm text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline disabled:opacity-50"
                      >
                        {t('home.stream.sheet.pass')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <GenerateSongModal
        open={songOpen && songTrack !== null}
        onOpenChange={(open) => setSongOpenFor(open ? key : null)}
        track={songTrack}
        credits={credits}
        onSubmitted={(wordId) => onSongSubmitted?.(wordId)}
      />
    </>,
    document.body,
  )
}
