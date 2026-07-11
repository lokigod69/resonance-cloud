import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTranslation } from '@/hooks/useTranslation'
import { playPronunciation } from '@/hooks/usePronunciation'
import { evaluateTypedAnswer } from '@/lib/typedAnswer'
import { isLemmaDueNow, type LemmaState } from '@/hooks/useWordStates'

// The Word Tide: today's due words drift as tappable orbs over the wave.
// Tap one → it opens into an inline practice card (image or translation as
// the prompt, typed answer, forgiving matcher) and the orb pops when graded —
// wrong answers vanish too, SRS washes them back another day. The pool
// backfills up to MAX_ORBS until everything due today is cleared.
//
// Perf notes: renders at most MAX_ORBS absolutely-positioned buttons animated
// with transform-only keyframes (or statically under reduced motion); word
// text/translation ride in on the LemmaState rows the dashboard already
// fetched — only thumbnails/TTS urls are looked up, one small batched query
// per set of newly visible orbs.

const MAX_ORBS = 8

// Loose cloud of orb anchors (percent coords inside the tide band), tuned so
// neighbours don't collide at their largest scale.
const SLOTS: Array<{ x: number; y: number; scale: number; drift: number }> = [
  { x: 16, y: 26, scale: 1.0, drift: 6.4 },
  { x: 40, y: 12, scale: 0.86, drift: 7.6 },
  { x: 66, y: 22, scale: 1.08, drift: 6.9 },
  { x: 87, y: 38, scale: 0.9, drift: 8.1 },
  { x: 12, y: 66, scale: 0.92, drift: 7.2 },
  { x: 36, y: 54, scale: 1.12, drift: 6.1 },
  { x: 63, y: 66, scale: 0.95, drift: 7.9 },
  { x: 86, y: 76, scale: 0.84, drift: 6.6 },
]

type WordDetail = { thumbnailUrl: string | null; ttsAudioUrl: string | null }

type WordTideProps = {
  userId: string
  language: string
  lemmas: LemmaState[]
  loading: boolean
  // Called after a grade lands so the parent can refresh counts/tiles.
  onGraded: () => void
}

// Stable, pleasant hue per lemma so text-card orbs are colorful but not random
// per render.
function hueFor(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

export default function WordTide({ userId, language, lemmas, loading, onGraded }: WordTideProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [clearedKeys, setClearedKeys] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState<Map<string, WordDetail>>(new Map())
  const [active, setActive] = useState<LemmaState | null>(null)
  const [slotByKey, setSlotByKey] = useState<Map<string, number>>(new Map())

  // Session-cleared orbs reset when the language changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern
    setClearedKeys(new Set())
    setActive(null)
    setSlotByKey(new Map())
  }, [language])

  const pool = useMemo(
    () => lemmas.filter((lemma) => isLemmaDueNow(lemma) && !clearedKeys.has(lemma.lemmaKey) && lemma.wordIds.length > 0),
    [lemmas, clearedKeys],
  )

  const visible = useMemo(() => pool.slice(0, MAX_ORBS), [pool])

  // Visible orbs keep their slot for their whole life; a freed slot goes to the
  // next word washing in. Reconciled as state so render never touches a ref;
  // the functional update returns `prev` when membership is unchanged, so this
  // cannot loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconcile-on-membership-change; returns prev when nothing changed
    setSlotByKey((prev) => {
      const liveKeys = new Set(visible.map((lemma) => lemma.lemmaKey))
      let changed = false
      const next = new Map(prev)
      for (const key of Array.from(next.keys())) {
        if (!liveKeys.has(key)) {
          next.delete(key)
          changed = true
        }
      }
      const used = new Set(next.values())
      for (const lemma of visible) {
        if (next.has(lemma.lemmaKey)) continue
        let free = 0
        while (used.has(free) && free < SLOTS.length - 1) free++
        next.set(lemma.lemmaKey, free)
        used.add(free)
        changed = true
      }
      return changed ? next : prev
    })
  }, [visible])

  // Thumbnail/TTS lookup for newly visible words (batched, cached for the session).
  useEffect(() => {
    const missing = visible
      .map((lemma) => lemma.wordIds[0])
      .filter((id) => !details.has(id))
    if (missing.length === 0) return
    let cancelled = false
    void supabase
      .from('words')
      .select('id, thumbnail_url, tts_audio_url')
      .in('id', missing)
      .then(({ data }) => {
        if (cancelled || !data) return
        setDetails((prev) => {
          const next = new Map(prev)
          for (const row of data as Array<{ id: string; thumbnail_url: string | null; tts_audio_url: string | null }>) {
            next.set(row.id, { thumbnailUrl: row.thumbnail_url, ttsAudioUrl: row.tts_audio_url })
          }
          // Rows that came back empty still get an entry so we don't re-query them.
          for (const id of missing) {
            if (!next.has(id)) next.set(id, { thumbnailUrl: null, ttsAudioUrl: null })
          }
          return next
        })
      })
    return () => { cancelled = true }
  }, [visible, details])

  const grade = useCallback((lemma: LemmaState, knewIt: boolean) => {
    void supabase
      .from('recall_attempts')
      .insert({ user_id: userId, word_id: lemma.wordIds[0], knew_it: knewIt, study_mode: 'tide' })
      .then(({ error }) => {
        if (error) console.error('[tide] recall insert failed:', error)
        else onGraded()
      })
    setClearedKeys((prev) => new Set(prev).add(lemma.lemmaKey))
    setActive(null)
  }, [userId, onGraded])

  const allClear = !loading && pool.length === 0 && lemmas.length > 0 && clearedKeys.size > 0

  return (
    <>
      <div className="word-tide relative h-[15rem] w-full max-w-2xl sm:h-[17rem]" aria-label={t('home.tide.regionAria')}>
        <AnimatePresence>
          {visible.map((lemma, index) => {
            const slot = SLOTS[slotByKey.get(lemma.lemmaKey) ?? index]
            const detail = details.get(lemma.wordIds[0])
            const hue = hueFor(lemma.lemmaKey)
            const size = `calc(4.6rem * ${slot.scale})`
            return (
              <motion.div
                key={lemma.lemmaKey}
                className="absolute"
                style={{ left: `${slot.x}%`, top: `${slot.y}%`, translate: '-50% -50%' }}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.45 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <motion.button
                  type="button"
                  onClick={() => setActive(lemma)}
                  aria-label={t('home.tide.orbAria')}
                  animate={reduceMotion ? undefined : { y: [0, -7, 0, 5, 0], x: [0, 4, -3, 0] }}
                  transition={reduceMotion ? undefined : { duration: slot.drift, repeat: Infinity, ease: 'easeInOut' }}
                  whileTap={{ scale: 0.92 }}
                  className="block cursor-pointer rounded-full border backdrop-blur-md transition-shadow hover:shadow-[0_0_30px_var(--accent-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  style={{
                    width: size,
                    height: size,
                    borderColor: `hsl(${hue} 80% 72% / 0.45)`,
                    boxShadow: `0 0 22px hsl(${hue} 85% 60% / 0.28), inset 0 0 18px hsl(${hue} 85% 65% / 0.22)`,
                    background: detail?.thumbnailUrl
                      ? `linear-gradient(hsl(${hue} 70% 20% / 0.22), hsl(${hue} 70% 12% / 0.4)), url(${detail.thumbnailUrl}) center/cover`
                      : `radial-gradient(circle at 32% 28%, hsl(${hue} 90% 74% / 0.75), hsl(${hue} 80% 48% / 0.42) 55%, hsl(${hue} 70% 30% / 0.2))`,
                  }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>

        {allClear && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--accent-2)]/60 bg-[var(--accent-2)]/15">
              <Check className="h-7 w-7 text-[var(--accent-2)]" />
            </span>
            <p className="font-display text-lg font-semibold">{t('home.tide.allClear')}</p>
          </motion.div>
        )}
      </div>

      <TidePracticeSheet
        lemma={active}
        detail={active ? details.get(active.wordIds[0]) : undefined}
        language={language}
        onGrade={grade}
        onClose={() => setActive(null)}
      />
    </>
  )
}

type SheetResult = 'success' | 'revealed' | null

function TidePracticeSheet({
  lemma,
  detail,
  language,
  onGrade,
  onClose,
}: {
  lemma: LemmaState | null
  detail: WordDetail | undefined
  language: string
  onGrade: (lemma: LemmaState, knewIt: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<SheetResult>(null)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [successLabelKey, setSuccessLabelKey] = useState('study.typed.correct')
  const advanceTimerRef = useRef<number | null>(null)

  // The home page must not scroll (or pan under the iOS keyboard) behind the
  // open sheet.
  useBodyScrollLock(lemma !== null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern
    setAnswer('')
    setResult(null)
    setWrongFlash(false)
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }, [lemma?.lemmaKey])

  useEffect(() => () => {
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
  }, [])

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
    void playPronunciation({ text: lemma.displayWord, audioUrl: detail?.ttsAudioUrl, lang: language })
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      onGrade(lemma, true)
    }, verdict === 'correct' ? 950 : 1700)
  }, [answer, detail?.ttsAudioUrl, language, lemma, onGrade, result])

  const reveal = useCallback(() => {
    if (!lemma || result) return
    setResult('revealed')
    void playPronunciation({ text: lemma.displayWord, audioUrl: detail?.ttsAudioUrl, lang: language })
  }, [detail?.ttsAudioUrl, language, lemma, result])

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
                  else if (result === 'revealed' && lemma) onGrade(lemma, false)
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
                    <p className="font-display text-xl font-bold long-copy">{lemma.displayWord}</p>
                  </motion.div>
                ) : (
                  <motion.div key="solution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1.5 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('study.typed.solutionLabel')}</p>
                    <p className="font-display text-xl font-bold long-copy">{lemma.displayWord}</p>
                    {detail?.thumbnailUrl && lemma.translation ? (
                      <p className="text-sm text-[var(--text-secondary)] long-copy">{lemma.translation}</p>
                    ) : null}
                    <button
                      onClick={() => onGrade(lemma, false)}
                      className="mt-2 w-full rounded-xl border-2 border-[var(--accent)]/60 bg-[var(--accent)]/15 py-3 font-display text-sm font-semibold uppercase tracking-widest text-[var(--accent)] transition-all hover:bg-[var(--accent)]/25"
                    >
                      {t('study.typed.continue')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
