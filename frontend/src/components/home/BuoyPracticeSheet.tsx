import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTranslation } from '@/hooks/useTranslation'
import { playPronunciation } from '@/hooks/usePronunciation'
import { evaluateTypedAnswer } from '@/lib/typedAnswer'
import type { LemmaState } from '@/hooks/useWordStates'
import type { HomeWordDetail } from '@/lib/homeWordDetails'

// BuoyPracticeSheet — bounded retrieval over the Home buoys (§6.4 of the
// First Light spec): one chained typed-recall queue, starting at the tapped
// buoy, advancing on each grade to the next unlocked due buoy, exiting on X
// or when the set completes. The parent owns the queue — this sheet renders
// the current card, and the contract is honest counting:
//
//   grade → insert → only a resolved insert advances anything (§4). A failed
//   insert shows an inline retry; the buoy stays, dawn does not move.
//
// Rebuild of the private TidePracticeSheet (WordTide.tsx:327 — that file is
// frozen under wave-rider's diff and exports nothing).

type SheetResult = 'success' | 'revealed' | null
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
  // Resolves when the recall_attempts insert lands, rejects on failure.
  onGrade: (lemma: LemmaState, knewIt: boolean) => Promise<void>
  // The card fully landed (insert resolved + celebration done) — advance the
  // queue by swapping `lemma`, or close by setting it null.
  onAdvance: (lemma: LemmaState, knewIt: boolean) => void
  onClose: () => void
}

export default function BuoyPracticeSheet({
  lemma,
  detail,
  language,
  langCode,
  cooldown = false,
  onGrade,
  onAdvance,
  onClose,
}: BuoyPracticeSheetProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<SheetResult>(null)
  const [insert, setInsert] = useState<InsertState>('idle')
  const [celebrated, setCelebrated] = useState(false)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [successLabelKey, setSuccessLabelKey] = useState('study.typed.correct')
  const celebrateTimerRef = useRef<number | null>(null)
  const playedRef = useRef(false)
  const advancedRef = useRef(false)
  // Which card the pending/finished insert belongs to. On the commit where
  // `lemma` swaps, the advance effect re-runs with the NEW lemma while
  // `insert`/`result` still hold the previous card's values (their reset is a
  // scheduled state update) — without this key the queue advances twice per
  // grade and skips a word.
  const insertForRef = useRef<string | null>(null)

  // The home page must not scroll (or pan under the iOS keyboard) behind the
  // open sheet.
  useBodyScrollLock(lemma !== null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern
    setAnswer('')
    setResult(null)
    setInsert('idle')
    setCelebrated(false)
    setWrongFlash(false)
    playedRef.current = false
    advancedRef.current = false
    if (celebrateTimerRef.current !== null) {
      window.clearTimeout(celebrateTimerRef.current)
      celebrateTimerRef.current = null
    }
  }, [lemma?.lemmaKey])

  useEffect(() => () => {
    if (celebrateTimerRef.current !== null) window.clearTimeout(celebrateTimerRef.current)
  }, [])

  // Speaks the word at most once per card. Called synchronously from the
  // click handlers when the audio url is already resolved (keeps playback
  // inside the user gesture for mobile autoplay policies); the effect below
  // covers the race where grading lands before the lookup does.
  const speak = useCallback(() => {
    if (!lemma || playedRef.current) return
    playedRef.current = true
    void playPronunciation({ text: lemma.displayWord, audioUrl: detail?.ttsAudioUrl, lang: language })
  }, [detail?.ttsAudioUrl, language, lemma])

  // Fire the insert for the current card. Success/failure only flips local
  // state — the parent's promise resolution is what moves the visit record.
  const runInsert = useCallback((target: LemmaState, knewIt: boolean) => {
    insertForRef.current = target.lemmaKey
    setInsert('pending')
    onGrade(target, knewIt)
      .then(() => setInsert('done'))
      .catch(() => setInsert('failed'))
  }, [onGrade])

  const submit = useCallback(() => {
    if (!lemma || result) return
    const verdict = evaluateTypedAnswer(answer, lemma.displayWord)
    if (verdict === 'wrong') {
      setWrongFlash(true)
      window.setTimeout(() => setWrongFlash(false), 520)
      return
    }
    setSuccessLabelKey(verdict === 'correct' ? 'study.typed.correct' : 'study.typed.almost')
    setResult('success')
    if (detail?.ttsResolved) speak()
    runInsert(lemma, true)
    celebrateTimerRef.current = window.setTimeout(() => {
      celebrateTimerRef.current = null
      setCelebrated(true)
    }, verdict === 'correct' ? 950 : 1700)
  }, [answer, detail?.ttsResolved, lemma, result, runInsert, speak])

  const reveal = useCallback(() => {
    if (!lemma || result) return
    setResult('revealed')
    if (detail?.ttsResolved) speak()
  }, [detail?.ttsResolved, lemma, result, speak])

  const continueAfterReveal = useCallback(() => {
    if (!lemma || insert === 'pending' || insert === 'done') return
    runInsert(lemma, false)
  }, [insert, lemma, runInsert])

  const retry = useCallback(() => {
    if (!lemma || !result || insert !== 'failed') return
    runInsert(lemma, result === 'success')
  }, [insert, lemma, result, runInsert])

  // Late-resolution path: the answer landed while the TTS lookup (row query
  // or static-library fallback) was still in flight — speak once it settles
  // instead of dropping to the browser voice.
  useEffect(() => {
    if (!result || !detail?.ttsResolved) return
    speak()
  }, [detail?.ttsResolved, result, speak])

  // Advance exactly once per card, only after the insert resolved OK — and,
  // on the success path, after the celebration has had its beat. The insert
  // must belong to THIS card (see insertForRef).
  useEffect(() => {
    if (!lemma || advancedRef.current || insert !== 'done' || !result) return
    if (insertForRef.current !== lemma.lemmaKey) return
    if (result === 'success' && !celebrated) return
    advancedRef.current = true
    onAdvance(lemma, result === 'success')
  }, [celebrated, insert, lemma, onAdvance, result])

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
                {/* Prompt: picture when the word has one, otherwise the translation */}
                {detail?.thumbnailUrl ? (
                  <img
                    src={detail.thumbnailUrl}
                    alt=""
                    className="mb-4 block max-h-56 w-full rounded-xl object-cover"
                    style={{ border: '1px solid var(--border-subtle)' }}
                  />
                ) : (
                  <p className="mb-4 px-2 text-center font-display text-2xl font-bold long-copy">
                    {lemma.translation || '…'}
                  </p>
                )}

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
                      if (!result && answer.trim()) submit()
                      else if (result === 'revealed') continueAfterReveal()
                    }}
                    readOnly={result !== null}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t('study.typed.placeholder')}
                    aria-label={t('study.typed.placeholder')}
                    className={`w-full rounded-xl border-2 bg-[var(--surface-glass)] px-4 py-3 text-center font-display text-lg outline-none transition-colors placeholder:text-[var(--text-muted)] ${
                      result === 'success'
                        ? 'border-[var(--pg-accent-green)]/70 shadow-[0_0_24px_color-mix(in_srgb,var(--pg-accent-green)_32%,transparent)]'
                        : wrongFlash
                          ? 'border-red-500/60'
                          : 'border-[var(--border-subtle)] focus:border-[var(--accent)]'
                    }`}
                  />
                </motion.div>

                <div className="mt-4 min-h-[6.5rem]" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {result === null ? (
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
                    ) : result === 'success' ? (
                      <motion.div
                        key="success"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                        className="flex flex-col items-center gap-1.5 text-center"
                      >
                        <div className="relative flex h-12 w-12 items-center justify-center">
                          {!reduceMotion && (
                            <motion.span
                              className="absolute inset-0 rounded-full border-2 border-[var(--pg-accent-green)]"
                              initial={{ scale: 1, opacity: 0.6 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--pg-accent-green)]/60 bg-[var(--pg-accent-green)]/20">
                            <Check className="h-6 w-6 text-[var(--pg-accent-green)]" />
                          </span>
                        </div>
                        <p className="font-display font-semibold text-[var(--pg-accent-green)]">{t(successLabelKey)}</p>
                        <p className="font-display text-xl font-bold long-copy" lang={langCode} dir="auto">{lemma.displayWord}</p>
                        {insert === 'failed' && <InsertRetry onRetry={retry} />}
                      </motion.div>
                    ) : (
                      <motion.div key="solution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1.5 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('study.typed.solutionLabel')}</p>
                        <p className="font-display text-xl font-bold long-copy" lang={langCode} dir="auto">{lemma.displayWord}</p>
                        {detail?.thumbnailUrl && lemma.translation ? (
                          <p className="text-sm text-[var(--text-secondary)] long-copy">{lemma.translation}</p>
                        ) : null}
                        {insert === 'failed' ? (
                          <InsertRetry onRetry={retry} />
                        ) : (
                          <button
                            onClick={continueAfterReveal}
                            disabled={insert === 'pending' || insert === 'done'}
                            className="mt-2 w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t('study.typed.continue')}
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
      className="mt-2 w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25"
    >
      {t('home.fl.hero.cta.retry')}
    </button>
  )
}
