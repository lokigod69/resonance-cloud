import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { ScriptAudioSpec, ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'
import { getScriptSymbol } from '@/lib/scriptlab/types'
import { canPlayScriptAudio, resolveScriptAudio } from '@/lib/scriptlab/audio'
import { loadScriptProgress, recordQuizScore } from '@/lib/scriptlab/progress'
import { playPronunciation } from '@/hooks/usePronunciation'
import { useTranslation } from '@/hooks/useTranslation'
import { ScriptAudioButton } from './ScriptAudioButton'
import { cn } from '@/lib/utils'

const QUESTION_COUNT = 10
const ADVANCE_DELAY_MS = 900

type QuizQuestion = {
  id: string
  type: 'read' | 'listen'
  promptChar: string
  listenSpec: ScriptAudioSpec | null
  options: string[]
  correct: string
}

type QuizModeProps = {
  script: ScriptDefinition
  onRecorded?: (best: number) => void
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function homophoneTags(symbol: ScriptSymbol): string[] {
  return (symbol.tags ?? []).filter((tag) => tag.startsWith('homophone:'))
}

function sharesHomophone(a: ScriptSymbol, b: ScriptSymbol): boolean {
  const tags = homophoneTags(a)
  return homophoneTags(b).some((tag) => tags.includes(tag))
}

function pickDistractors(
  correct: ScriptSymbol,
  peers: ScriptSymbol[],
  keyOf: (symbol: ScriptSymbol) => string,
  count: number,
): ScriptSymbol[] {
  const chosen: ScriptSymbol[] = []
  const correctKey = keyOf(correct)
  for (const candidate of shuffle(peers)) {
    if (chosen.length >= count) break
    if (candidate.id === correct.id) continue
    if (candidate.romanization === correct.romanization) continue
    if (candidate.audio.text === correct.audio.text) continue
    if (sharesHomophone(candidate, correct)) continue
    const key = keyOf(candidate)
    if (key === correctKey) continue
    if (chosen.some((other) => keyOf(other) === key || sharesHomophone(other, candidate))) continue
    chosen.push(candidate)
  }
  return chosen
}

function buildReadQuestion(symbol: ScriptSymbol, peers: ScriptSymbol[]): QuizQuestion | null {
  const distractors = pickDistractors(symbol, peers, (s) => s.romanization, 3)
  if (distractors.length < 3) return null
  const promptChar =
    symbol.type === 'final-consonant' && symbol.exampleSyllable ? symbol.exampleSyllable : symbol.character
  return {
    id: `read-${symbol.id}`,
    type: 'read',
    promptChar,
    listenSpec: null,
    options: shuffle([symbol.romanization, ...distractors.map((d) => d.romanization)]),
    correct: symbol.romanization,
  }
}

function buildListenQuestion(
  symbol: ScriptSymbol,
  peers: ScriptSymbol[],
  spec: ScriptAudioSpec,
): QuizQuestion | null {
  const distractors = pickDistractors(symbol, peers, (s) => s.character, 3)
  if (distractors.length < 3) return null
  return {
    id: `listen-${symbol.id}`,
    type: 'listen',
    promptChar: symbol.character,
    listenSpec: spec,
    options: shuffle([symbol.character, ...distractors.map((d) => d.character)]),
    correct: symbol.character,
  }
}

function buildQuiz(script: ScriptDefinition): QuizQuestion[] {
  const entries: { symbol: ScriptSymbol; peers: ScriptSymbol[] }[] = []
  // Advanced sections are included: the quiz samples the whole inventory, and
  // the homophone guard exists precisely for pairs like ㅐ/ㅔ that live there.
  for (const section of script.sections) {
    const peers = section.symbolIds
      .map((id) => getScriptSymbol(script, id))
      .filter((symbol): symbol is ScriptSymbol => Boolean(symbol))
    for (const symbol of peers) entries.push({ symbol, peers })
  }

  const questions: QuizQuestion[] = []
  for (const { symbol, peers } of shuffle(entries)) {
    if (questions.length >= QUESTION_COUNT) break
    const listenSpec = symbol.exampleSyllableAudio ?? symbol.audio
    const canListen = canPlayScriptAudio(script, listenSpec)
    const preferListen = canListen && Math.random() < 0.5

    const primary = preferListen
      ? buildListenQuestion(symbol, peers, listenSpec)
      : buildReadQuestion(symbol, peers)
    const secondary = preferListen
      ? buildReadQuestion(symbol, peers)
      : canListen
        ? buildListenQuestion(symbol, peers, listenSpec)
        : null

    const question = primary ?? secondary
    if (question) questions.push(question)
  }
  return questions
}

export function QuizMode({ script, onRecorded }: QuizModeProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<'start' | 'playing' | 'done'>('start')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const advanceRef = useRef<number | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the stored best score when the script changes
    setBest(loadScriptProgress(script.id).quizBest)
  }, [script.id])

  useEffect(
    () => () => {
      if (advanceRef.current !== null) window.clearTimeout(advanceRef.current)
    },
    [],
  )

  const question = questions[current]

  useEffect(() => {
    if (phase !== 'playing' || question?.type !== 'listen' || !question.listenSpec) return
    void playPronunciation(resolveScriptAudio(script, question.listenSpec))
  }, [phase, question, script])

  const start = useCallback(() => {
    const built = buildQuiz(script)
    setQuestions(built)
    setCurrent(0)
    setScore(0)
    setSelected(null)
    // A script whose sections are all too small for 4 options yields no
    // questions; stay on the start screen instead of a blank playing state.
    setPhase(built.length > 0 ? 'playing' : 'start')
  }, [script])

  const handleAnswer = useCallback(
    (option: string) => {
      if (selected !== null || !question) return
      setSelected(option)
      const nextScore = option === question.correct ? score + 1 : score
      setScore(nextScore)
      const isLast = current + 1 >= questions.length
      if (isLast) {
        // Persist immediately — waiting for the advance timeout would lose the
        // run if the user switches tabs (unmount clears the timer).
        const recorded = recordQuizScore(script.id, nextScore).quizBest ?? nextScore
        setBest(recorded)
        onRecorded?.(recorded)
      }
      advanceRef.current = window.setTimeout(() => {
        if (isLast) {
          setPhase('done')
        } else {
          setCurrent((value) => value + 1)
          setSelected(null)
        }
      }, ADVANCE_DELAY_MS)
    },
    [selected, question, score, current, questions.length, script.id, onRecorded],
  )

  if (phase === 'start') {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <p className="max-w-sm text-[var(--text-secondary)]">{t('scriptlab.quiz.intro')}</p>
        {best !== null && (
          <p className="text-sm text-[var(--text-muted)]">
            {t('scriptlab.quiz.best', { score: best })}
          </p>
        )}
        <button
          type="button"
          onClick={start}
          className="rounded-full bg-[var(--accent)] px-8 py-3 font-medium text-[var(--on-accent)] shadow-[0_10px_28px_var(--accent-glow)] transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          {t('scriptlab.quiz.start')}
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div
          className="font-display text-5xl text-[var(--text-primary)]"
          style={{ textShadow: '0 0 30px var(--accent-glow)' }}
        >
          {t('scriptlab.quiz.score', { score, total: questions.length })}
        </div>
        {best !== null && (
          <p className="text-sm text-[var(--text-muted)]">{t('scriptlab.quiz.best', { score: best })}</p>
        )}
        <button
          type="button"
          onClick={start}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 font-medium text-[var(--on-accent)] shadow-[0_10px_28px_var(--accent-glow)] transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <RotateCcw size={16} aria-hidden="true" />
          {t('scriptlab.quiz.again')}
        </button>
      </div>
    )
  }

  if (!question) return null

  const revealed = selected !== null

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="text-sm text-[var(--text-muted)]">
        {t('scriptlab.quiz.question', { current: current + 1, total: questions.length })}
      </p>

      <div className="flex min-h-[7rem] flex-col items-center gap-3">
        {question.type === 'read' ? (
          <span
            className="font-display text-7xl leading-none text-[var(--text-primary)]"
            style={{ textShadow: '0 0 30px var(--accent-glow)' }}
          >
            {question.promptChar}
          </span>
        ) : (
          question.listenSpec && <ScriptAudioButton script={script} spec={question.listenSpec} size="lg" />
        )}
        <p className="text-[var(--text-secondary)]">
          {question.type === 'read' ? t('scriptlab.quiz.whichSound') : t('scriptlab.quiz.whichSymbol')}
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {question.options.map((option) => {
          const isCorrect = option === question.correct
          const isSelected = option === selected
          return (
            <motion.button
              key={option}
              type="button"
              disabled={revealed}
              onClick={() => handleAnswer(option)}
              animate={revealed && isSelected && !isCorrect ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className={cn(
                'flex min-h-[64px] items-center justify-center rounded-2xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
                revealed
                  ? isCorrect
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : isSelected
                      ? 'border-[var(--pg-accent-rose)] text-[var(--pg-accent-rose)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-glass)] text-[var(--text-primary)] hover:border-[var(--accent)]',
              )}
            >
              {question.type === 'listen' ? (
                <span className="font-display text-3xl leading-none">{option}</span>
              ) : (
                <span className="text-xl font-medium">{option}</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
