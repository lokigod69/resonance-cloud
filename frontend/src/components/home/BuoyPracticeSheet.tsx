import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Volume2, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTranslation } from '@/hooks/useTranslation'
import { playPronunciation, prefetchPronunciationAudio } from '@/hooks/usePronunciation'
import { evaluateTypedAnswer } from '@/lib/typedAnswer'
import type { LemmaState } from '@/hooks/useWordStates'
import type { HomeWordDetail } from '@/lib/homeWordDetails'

// BuoyPracticeSheet — bounded retrieval over the Home buoys (§6.4 of the
// First Light spec): one chained typed-recall queue, starting at the tapped
// buoy, advancing to the next unlocked due buoy, exiting on X or when the set
// completes. The parent owns the queue — this sheet renders the current card,
// and the contract is honest counting:
//
//   grade → insert → only a resolved insert can advance anything (§4). A
//   failed insert shows an inline retry; the buoy stays, dawn does not move.
//
// The answer LANDS and stays: once a card resolves, the word, its picture and
// its translation sit there with a replay control until the learner presses
// Next. Hearing a word once, mid-flight, is not enough to learn how it sounds
// — the queue only moves on their say-so.
//
// Rebuild of the private TidePracticeSheet (WordTide.tsx:327 — that file is
// frozen under wave-rider's diff and exports nothing).

// The resolution carries the card it belongs to. On the commit where `lemma`
// swaps, the previous card's answer is still in state (its reset is a
// scheduled update) — without the key the sheet would read the next word's
// answer out loud, and flash it on screen, before the learner has seen it.
type SheetAnswer = { key: string; value: 'success' | 'revealed' }
type InsertState = 'idle' | 'pending' | 'failed' | 'done'

export type BuoyPracticeSheetProps = {
  // Current queue head; null closes the sheet.
  lemma: LemmaState | null
  detail: HomeWordDetail | undefined
  /** Canonical display value ('German') — what playPronunciation expects. */
  language: string
  /** BCP-47 primary subtag ('de') for `lang` attributes (§12). */
  langCode?: string
  // The tapped buoy is still drifting back after a miss — show the cooldown
  // line instead of a practice card.
  cooldown?: boolean
  /** Whether another buoy is waiting behind this one — decides Next vs Done. */
  hasNext?: boolean
  // Resolves when the recall_attempts insert lands, rejects on failure.
  onGrade: (lemma: LemmaState, knewIt: boolean) => Promise<void>
  // The learner asked for the next card — swap `lemma`, or close by setting
  // it null. Only ever called with a resolved insert behind it.
  onAdvance: () => void
  onClose: () => void
}

export default function BuoyPracticeSheet({
  lemma,
  detail,
  language,
  langCode,
  cooldown = false,
  hasNext = false,
  onGrade,
  onAdvance,
  onClose,
}: BuoyPracticeSheetProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [answer, setAnswer] = useState('')
  const [answered, setAnswered] = useState<SheetAnswer | null>(null)
  const [insert, setInsert] = useState<InsertState>('idle')
  const [wrongFlash, setWrongFlash] = useState(false)
  const [successLabelKey, setSuccessLabelKey] = useState('study.typed.correct')
  const playedRef = useRef(false)
  const advancedRef = useRef(false)

  // The card has an answer on screen AND it belongs to the word currently in
  // the sheet (see SheetAnswer).
  const settled = answered !== null && answered.key === lemma?.lemmaKey
  const result = settled ? answered.value : null

  // The home page must not scroll (or pan under the iOS keyboard) behind the
  // open sheet.
  useBodyScrollLock(lemma !== null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern
    setAnswer('')
    setAnswered(null)
    setInsert('idle')
    setWrongFlash(false)
    playedRef.current = false
    advancedRef.current = false
  }, [lemma?.lemmaKey])

  const audioUrl = detail?.ttsAudioUrl ?? null

  // Warm the recorded file while the learner is still typing, so the first
  // play starts instantly instead of racing a cold fetch.
  useEffect(() => {
    prefetchPronunciationAudio(audioUrl)
  }, [audioUrl])

  // Speaks the word. `allowSpeechFallback: false` whenever the word HAS a
  // recording: if that file cannot start, the replay control is the honest
  // answer — a synthetic voice would teach a pronunciation we know is wrong.
  const play = useCallback(() => {
    if (!lemma) return
    void playPronunciation({
      text: lemma.displayWord,
      audioUrl,
      lang: language,
      allowSpeechFallback: !audioUrl,
    })
  }, [audioUrl, language, lemma])

  // At most one automatic play per card; the replay control is unbounded.
  const playOnce = useCallback(() => {
    if (playedRef.current) return
    playedRef.current = true
    play()
  }, [play])

  // Fire the insert for the current card. Success/failure only flips local
  // state — the parent's promise resolution is what moves the visit record.
  const runInsert = useCallback((target: LemmaState, knewIt: boolean) => {
    setInsert('pending')
    onGrade(target, knewIt)
      .then(() => setInsert('done'))
      .catch(() => setInsert('failed'))
  }, [onGrade])

  // Every resolution — typed correctly, close enough, or revealed — settles
  // the card the same way: speak it, write the attempt, and hold.
  const resolveCard = useCallback((target: LemmaState, value: 'success' | 'revealed', knewIt: boolean) => {
    setAnswered({ key: target.lemmaKey, value })
    if (detail?.ttsResolved) playOnce()
    runInsert(target, knewIt)
  }, [detail?.ttsResolved, playOnce, runInsert])

  const submit = useCallback(() => {
    if (!lemma || settled) return
    const verdict = evaluateTypedAnswer(answer, lemma.displayWord)
    if (verdict === 'wrong') {
      setWrongFlash(true)
      window.setTimeout(() => setWrongFlash(false), 520)
      return
    }
    setSuccessLabelKey(verdict === 'correct' ? 'study.typed.correct' : 'study.typed.almost')
    resolveCard(lemma, 'success', true)
  }, [answer, lemma, resolveCard, settled])

  const reveal = useCallback(() => {
    if (!lemma || settled) return
    resolveCard(lemma, 'revealed', false)
  }, [lemma, resolveCard, settled])

  const retry = useCallback(() => {
    if (!lemma || !result || insert !== 'failed') return
    runInsert(lemma, result === 'success')
  }, [insert, lemma, result, runInsert])

  // Advance exactly once per card, and only with a resolved insert behind it.
  const advance = useCallback(() => {
    if (!lemma || insert !== 'done' || advancedRef.current) return
    advancedRef.current = true
    onAdvance()
  }, [insert, lemma, onAdvance])

  // Late-resolution path: the answer landed while the TTS lookup (row query or
  // static-library fallback) was still in flight — speak once it settles
  // instead of dropping to the browser voice.
  useEffect(() => {
    if (!settled || !detail?.ttsResolved) return
    playOnce()
  }, [detail?.ttsResolved, playOnce, settled])

  const thumbnailUrl = detail?.thumbnailUrl ?? null

  // Portalled to <body>: the layout's <main> is a z-10 stacking context that
  // sits UNDER the fixed z-50 bottom nav, so a sheet rendered in place could
  // never cover the nav — and any transformed ancestor would re-anchor
  // position:fixed to itself instead of the viewport.
  return createPortal(
    <AnimatePresence>
      {lemma && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{
            background: 'color-mix(in srgb, var(--app-bg) 72%, transparent)',
            backdropFilter: 'blur(20px) saturate(0.95)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            data-body-scroll-lock-scrollable="true"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl p-5 sm:p-6"
            style={{
              background: 'var(--surface-glass-strong)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-elevated)',
              color: 'var(--text-primary)',
            }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-colors hover:cursor-pointer hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                aria-label={t('categories.modal.close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {cooldown ? (
              <div className="flex flex-col items-center gap-2 pb-4 text-center">
                <p className="font-display text-xl font-bold long-copy" lang={langCode} dir="auto">
                  {lemma.displayWord}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{t('home.fl.sheetCooldown')}</p>
              </div>
            ) : (
              <>
                {/* Prompt: picture when the word has one, otherwise the
                    translation. The picture STAYS after the answer and becomes
                    a replay control — a word you can look at while you listen
                    is the point of holding the card. */}
                {thumbnailUrl ? (
                  settled ? (
                    <button
                      type="button"
                      onClick={play}
                      aria-label={t('study.playPronunciationAria', { word: lemma.displayWord })}
                      className="relative mb-4 block w-full cursor-pointer overflow-hidden rounded-xl transition-transform active:scale-[0.99]"
                      style={{ border: '1px solid var(--border-subtle)' }}
                    >
                      <img src={thumbnailUrl} alt="" className="block max-h-56 w-full object-cover" />
                      <span
                        aria-hidden="true"
                        className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--app-bg)_74%,transparent)] text-[var(--accent-2)] backdrop-blur-sm"
                      >
                        <Volume2 className="h-4 w-4" />
                      </span>
                    </button>
                  ) : (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="mb-4 block max-h-56 w-full rounded-xl object-cover"
                      style={{ border: '1px solid var(--border-subtle)' }}
                    />
                  )
                ) : (
                  <p className="mb-4 px-2 text-center font-display text-2xl font-bold long-copy">
                    {lemma.translation || '…'}
                  </p>
                )}

                {!settled ? (
                  <motion.div
                    animate={wrongFlash && !reduceMotion ? { x: [0, -9, 9, -6, 6, -2, 0] } : { x: 0 }}
                    transition={{ duration: 0.42 }}
                  >
                    <input
                      type="text"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        if (answer.trim()) submit()
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={t('study.typed.placeholder')}
                      aria-label={t('study.typed.placeholder')}
                      className={`w-full rounded-xl border-2 bg-[var(--surface-glass)] px-4 py-3 text-center font-display text-lg outline-none transition-colors placeholder:text-[var(--text-muted)] ${
                        wrongFlash ? 'border-red-500/60' : 'border-[var(--border-subtle)] focus:border-[var(--accent)]'
                      }`}
                    />
                  </motion.div>
                ) : null}

                <div className="mt-4 min-h-[6.5rem]" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {!settled ? (
                      <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2.5">
                        <button
                          onClick={submit}
                          disabled={!answer.trim()}
                          className="w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t('study.typed.check')}
                        </button>
                        <button
                          onClick={reveal}
                          className="text-sm text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                        >
                          {t('study.typed.showAnswer')}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="landed"
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 text-center"
                      >
                        {result === 'success' ? (
                          <motion.div
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                            className="relative flex h-10 w-10 items-center justify-center"
                          >
                            {!reduceMotion && (
                              <motion.span
                                className="absolute inset-0 rounded-full border-2 border-[var(--pg-accent-green)]"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2, opacity: 0 }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                aria-hidden="true"
                              />
                            )}
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--pg-accent-green)]/60 bg-[var(--pg-accent-green)]/20">
                              <Check className="h-5 w-5 text-[var(--pg-accent-green)]" />
                            </span>
                          </motion.div>
                        ) : null}

                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            result === 'success' ? 'text-[var(--pg-accent-green)]' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {result === 'success' ? t(successLabelKey) : t('study.typed.solutionLabel')}
                        </p>

                        {/* The word itself is the replay control — tap it as
                            often as it takes to hear the shape of it. */}
                        <button
                          type="button"
                          onClick={play}
                          aria-label={t('study.playPronunciationAria', { word: lemma.displayWord })}
                          className="flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-[var(--accent-soft)] active:scale-[0.98]"
                        >
                          <span className="font-display text-2xl font-bold long-copy" lang={langCode} dir="auto">
                            {lemma.displayWord}
                          </span>
                          <Volume2 className="h-5 w-5 shrink-0 text-[var(--accent-2)]" aria-hidden="true" />
                        </button>

                        {/* Only when the picture was the prompt — otherwise the
                            translation is already the line above the input. */}
                        {thumbnailUrl && lemma.translation ? (
                          <p className="text-sm text-[var(--text-secondary)] long-copy">{lemma.translation}</p>
                        ) : null}

                        {insert === 'failed' ? (
                          <InsertRetry onRetry={retry} />
                        ) : (
                          <button
                            onClick={advance}
                            disabled={insert !== 'done'}
                            className="mt-1 w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {hasNext ? t('home.fl.sheet.next') : t('home.fl.sheet.done')}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// Inline insert-failure affordance: the attempt did not land, so nothing
// advanced — the learner retries the write, not the word.
function InsertRetry({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onRetry}
      className="mt-1 w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25"
    >
      {t('home.fl.hero.cta.retry')}
    </button>
  )
}
