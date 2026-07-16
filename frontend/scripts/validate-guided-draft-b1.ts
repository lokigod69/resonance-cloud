/**
 * Mechanical validator for B1 guided drafts — mirrors the §5 authoring
 * contract of docs/Product/FABLE_B1_LEARNING_PATH_DESIGN.md plus the German
 * rails and blank schemas from tmp\B1_GERMAN_P1_P10_SPEC.md. The a2-phase2
 * validator is two-turn-shaped and cannot check episodes; this one owns:
 * four-turn dialogue shape, you₁/corePhrase identity, cloze-concat identity,
 * blank taxonomy per path schema, pattern-spotlight honesty, per-lesson
 * register consistency, and cross-corpus trophy uniqueness (A1 + A2 + B1).
 *
 * Paths not yet authored are skipped with a notice (Phase 0 ships P1 L1–L3
 * as the handwritten device-gate pilots).
 *
 * Usage: npx tsx scripts/validate-guided-draft-b1.ts
 */
import type { GuidedClozeSegment, GuidedLessonDefinition, GuidedLessonVibeVariant } from '../src/data/guidedLessons'
import { GUIDED_LESSONS } from '../src/data/guidedLessons'

let failures = 0
let checks = 0
function assert(label: string, ok: boolean, detail?: unknown) {
  checks += 1
  if (!ok) {
    failures += 1
    console.log(`FAIL  ${label}${detail !== undefined ? ` :: ${JSON.stringify(detail)}` : ''}`)
  }
}

const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim()
const wordCount = (s: string) => normalizeWs(s).split(' ').filter(Boolean).length
const lower = (s: string) => s.toLowerCase()

const B1_STEPS = ['scene', 'matchPairs', 'pattern', 'build', 'complication', 'rolePlay', 'complete']

/**
 * Per-path blank schema (spec §blank-schemas): which cloze-blank kinds the
 * path may use, which kind(s) count as targeting the path's anchor, and —
 * where the anchor is a closed class — which answers actually qualify
 * (kind alone would let P2 pass with a plain `aber`).
 */
const GERMAN_B1_PATH_SCHEMAS: Record<number, {
  allowed: Array<'form' | 'connector' | 'choice'>
  anchor: Array<'form' | 'connector' | 'choice'>
  anchorAnswerRe?: RegExp
}> = {
  1: { allowed: ['form', 'connector'], anchor: ['form'] },
  2: { allowed: ['form', 'connector'], anchor: ['connector'], anchorAnswerRe: /^(obwohl|trotzdem|weil|deshalb)$/i },
  3: { allowed: ['form', 'connector'], anchor: ['form'], anchorAnswerRe: /^(würde|hätte|wäre|könnte|müsste)(st|t|n)?\b|.*\b(würde|hätte|wäre|könnte|müsste)(st|t|n)?$/i },
  4: { allowed: ['choice', 'form'], anchor: ['choice'], anchorAnswerRe: /^(der|die|das|den)$/i },
  5: { allowed: ['form', 'connector'], anchor: ['form', 'connector'] },
  6: { allowed: ['form'], anchor: ['form'] },
  7: { allowed: ['form', 'connector'], anchor: ['connector', 'form'], anchorAnswerRe: /^(um|zu|damit)$|zu\b/i },
  8: { allowed: ['choice', 'form'], anchor: ['choice'], anchorAnswerRe: /^(als|wenn)$/i },
  9: { allowed: ['form', 'connector', 'choice'], anchor: ['form', 'connector', 'choice'] },
  10: { allowed: ['form', 'connector', 'choice'], anchor: ['form', 'connector', 'choice'] },
}

/** Bare closed-class words that typed blanks must never be (§3.3); choice blanks are exempt (P4/P8 target exactly these classes). */
const BARE_TYPED_BLANK_BAN = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mir', 'mich', 'dir', 'dich', 'ihm', 'ihn', 'uns', 'euch',
])

/** German rails (§5.6) — learner turns only; interlocutor turns are whitelist-exempt. */
const GERMAN_B1_BANNED_LEARNER_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /\b(ich|du|wir|ihr) (werde|wirst|werden|werdet)\b/i, why: 'person-complete werden-future in learner production (present + time word; wird/wurde-passive stays legal)' },
  { re: /\b(ging|kam|sah|nahm|stand|fuhr|aß|blieb|wusste|dachte|brachte|hielt|lief|rief|schrieb|sprach|traf|trug)\b/i, why: 'strong-verb Präteritum in learner line (Perfekt is the narrative default)' },
  { re: /(?<!\bes )\bgab\b/i, why: 'gab without es (only the es-gab frame is licensed, and only from P1 L4)' },
  { re: /\b(machte|sagte|kaufte|fragte|wartete|spielte|wohnte|arbeitete|suchte|brauchte|redete|zeigte|meinte|lernte|hörte|holte|schickte)(st|t|n)?\b/i, why: 'weak-verb Präteritum in learner line (Perfekt is the narrative default)' },
  { re: /\b(dessen|deren|denen)\b/i, why: 'genitive/dative relative pronoun (Nom/Akk only at B1)' },
  { re: /\b(er|sie|es) (habe|sei|könne|müsse|wolle)\b/i, why: 'Konjunktiv I (reported speech stays indicative at B1)' },
  { re: /\bvon\b[^.!?]*\b(wird|wurde|worden)\b|\b(wird|wurde|worden)\b[^.!?]*\bvon\b/i, why: 'agented passive von-phrase (agentless passive only)' },
  { re: /\b(ae|oe|ue)[a-zäöü]/i, why: 'umlaut digraph in German target text' },
  { re: /\b(hi|sorry)\b/i, why: 'English leak in German target text' },
]

/**
 * Stage-gated forms (spec §2 staging): legal only from a given path+lesson on.
 * Anything in a LATER path is free once its gate path has introduced it.
 */
const GERMAN_B1_STAGED_FORMS: Array<{ re: RegExp; fromPath: number; fromLesson: number; why: string }> = [
  { re: /\b(war|waren|warst|hatte|hatten|hattest)\b/i, fromPath: 1, fromLesson: 4, why: 'war/hatte before its P1 L4 staging' },
  { re: /\bes gab\b/i, fromPath: 1, fromLesson: 4, why: 'es gab before its P1 L4 staging' },
  { re: /\b(konnte|musste|wollte|durfte|sollte)(st|t|n)?\b/i, fromPath: 1, fromLesson: 6, why: 'modal Präteritum before its P1 L6 staging' },
]

function isStagedFormAllowed(staged: { fromPath: number; fromLesson: number }, pathNumber: number, lessonNumber: number) {
  return pathNumber > staged.fromPath
    || (pathNumber === staged.fromPath && lessonNumber >= staged.fromLesson)
}

function blanksOf(segments: GuidedClozeSegment[]) {
  return segments.filter((segment): segment is Extract<GuidedClozeSegment, { type: 'blank' }> => segment.type === 'blank')
}

function clozeConcat(segments: GuidedClozeSegment[]) {
  return segments.map((segment) => (segment.type === 'text' ? segment.text : segment.blank.answer)).join('')
}

function checkRegisterConsistency(label: string, variant: GuidedLessonVibeVariant) {
  const turns = variant.dialogue ?? []
  const allText = turns.map((turn) => turn.targetText).join(' ')
  if (variant.register === 'Sie') {
    assert(`${label} Sie-lesson has no du-forms in the episode`, !/\b(du|dich|dir|dein|deine|deinen|deinem)\b/i.test(allText), allText)
  }
  if (variant.register === 'du') {
    // Mid-sentence capitalized Sie/Ihnen is the formal address; sentence-initial 'Sie' can be she/they and stays legal.
    const formalAddress = turns.some((turn) => /(?<=[^.!?»"]\s)\b(Sie|Ihnen|Ihr(?:e[mnr]?)? Termin)\b/.test(turn.targetText))
    assert(`${label} du-lesson has no formal address in the episode`, !formalAddress, allText)
  }
}

const germanB1Lessons = GUIDED_LESSONS.filter(
  (lesson) => lesson.level === 'B1' && lesson.targetLanguage === 'German',
)

console.log(`B1 validator: ${germanB1Lessons.length} German B1 lesson(s) on disk`)

const seenPathNumbers = new Set<number>()
const seenTrophies = new Map<string, string>()

for (const lesson of germanB1Lessons) {
  const label = lesson.id
  const pathNumber = Number(lesson.pathId.replace('german-b1-practical-', ''))
  seenPathNumbers.add(pathNumber)
  const schema = GERMAN_B1_PATH_SCHEMAS[pathNumber]
  assert(`${label} path number ${pathNumber} has a declared blank schema`, schema !== undefined)

  // --- definition shape
  assert(`${label} level is B1`, lesson.level === 'B1')
  assert(`${label} path metadata level is B1`, lesson.pathMetadata.level === 'B1')
  assert(`${label} estimatedMinutes is 7`, lesson.estimatedMinutes === 7)
  assert(`${label} authored steps equal the B1 7-step session`, JSON.stringify(lesson.steps) === JSON.stringify(B1_STEPS), lesson.steps)
  assert(`${label} status is active`, lesson.status === 'active')
  const expectedGlobal = String((pathNumber - 1) * 10 + lesson.lessonNumber).padStart(3, '0')
  assert(`${label} id carries the global number ${expectedGlobal}`, lesson.id.startsWith(`german-b1-practical-${pathNumber}-${expectedGlobal}-`))
  assert(`${label} situation carries en + de`, Boolean(lesson.situation.en?.trim()) && Boolean(lesson.situation.de?.trim()))

  const vibeIds = Object.keys(lesson.vibeVariants)
  assert(`${label} is bright-only`, vibeIds.length === 1 && vibeIds[0] === 'bright', vibeIds)
  const variant = lesson.vibeVariants.bright
  if (!variant) continue

  assert(`${label} contentStatus is draft (pre-review)`, variant.contentStatus === 'draft')

  // --- episode shape
  const dialogue = variant.dialogue ?? []
  assert(`${label} dialogue has exactly 4 turns`, dialogue.length === 4)
  if (dialogue.length !== 4) continue
  assert(`${label} dialogue speakers are them/you/them/you`, dialogue.map((turn) => turn.speaker).join(',') === 'them,you,them,you')
  assert(`${label} you₁ === corePhrase`, dialogue[1].targetText === variant.corePhrase.targetText, { you1: dialogue[1].targetText, core: variant.corePhrase.targetText })
  for (const [index, turn] of dialogue.entries()) {
    assert(`${label} turn ${index + 1} carries .en base text`, Boolean(turn.baseText.en?.trim()))
  }
  assert(`${label} them₁ is 5–12 words`, wordCount(dialogue[0].targetText) >= 5 && wordCount(dialogue[0].targetText) <= 12, dialogue[0].targetText)
  assert(`${label} them₂ is 5–12 words`, wordCount(dialogue[2].targetText) >= 5 && wordCount(dialogue[2].targetText) <= 12, dialogue[2].targetText)
  assert(`${label} you₁ is 8–16 words`, wordCount(dialogue[1].targetText) >= 8 && wordCount(dialogue[1].targetText) <= 16, dialogue[1].targetText)
  assert(`${label} you₂ is 6–12 words`, wordCount(dialogue[3].targetText) >= 6 && wordCount(dialogue[3].targetText) <= 12, dialogue[3].targetText)

  // --- register
  assert(`${label} register is declared`, variant.register === 'Sie' || variant.register === 'du', variant.register)
  checkRegisterConsistency(label, variant)

  // --- cloze
  const cloze = variant.cloze
  assert(`${label} cloze is authored`, cloze !== undefined)
  if (cloze) {
    const blanks = blanksOf(cloze.segments)
    assert(`${label} cloze concat === you₂`, clozeConcat(cloze.segments) === dialogue[3].targetText, { concat: clozeConcat(cloze.segments), you2: dialogue[3].targetText })
    assert(`${label} cloze has 2–3 blanks`, blanks.length >= 2 && blanks.length <= 3, blanks.length)
    if (schema) {
      assert(
        `${label} blank kinds all sit in the path schema (${schema.allowed.join('/')})`,
        blanks.every((segment) => schema.allowed.includes(segment.blank.kind)),
        blanks.map((segment) => segment.blank.kind),
      )
      assert(
        `${label} ≥ 1 blank targets the path anchor (${schema.anchor.join('/')})`,
        blanks.some((segment) =>
          schema.anchor.includes(segment.blank.kind)
          && (!schema.anchorAnswerRe || schema.anchorAnswerRe.test(segment.blank.answer))),
        blanks.map((segment) => `${segment.blank.kind}:${segment.blank.answer}`),
      )
    }
    for (const [blankIndex, segment] of blanks.entries()) {
      const blank = segment.blank
      const blankLabel = `${label} blank ${blankIndex + 1} (${blank.kind})`
      assert(`${blankLabel} answer ∈ acceptedAnswers`, blank.acceptedAnswers.includes(blank.answer))
      assert(`${blankLabel} answer is ≤ 3 words`, wordCount(blank.answer) <= 3, blank.answer)
      assert(`${blankLabel} has exactly 4 choices`, blank.choices.length === 4, blank.choices)
      assert(`${blankLabel} choices include the answer`, blank.choices.includes(blank.answer), blank.choices)
      assert(`${blankLabel} choices are unique`, new Set(blank.choices.map(lower)).size === 4, blank.choices)
      assert(
        `${blankLabel} distractor chips are never also-correct`,
        blank.choices.filter((choice) => choice !== blank.answer).every((choice) => !blank.acceptedAnswers.map(lower).includes(lower(choice))),
        blank.choices,
      )
      if (blank.kind !== 'choice') {
        assert(`${blankLabel} is not a bare pronoun/article`, !BARE_TYPED_BLANK_BAN.has(lower(blank.answer)), blank.answer)
      }
      if (blank.kind === 'form') {
        assert(`${blankLabel} carries a lemma cue`, Boolean(blank.cue?.trim()))
      }
    }
  }

  // --- pattern spotlight
  const pattern = variant.pattern
  assert(`${label} pattern is authored`, pattern !== undefined)
  if (pattern) {
    assert(`${label} pattern label is non-empty`, Boolean(pattern.label.trim()))
    assert(`${label} pattern rule carries .en`, Boolean(pattern.rule.en?.trim()))
    assert(`${label} pattern has 2–3 examples`, pattern.examples.length >= 2 && pattern.examples.length <= 3, pattern.examples.length)
    for (const [exampleIndex, example] of pattern.examples.entries()) {
      assert(`${label} pattern example ${exampleIndex + 1} contains its highlight`, example.targetText.includes(example.highlight), example)
      assert(`${label} pattern example ${exampleIndex + 1} carries .en base`, Boolean(example.baseText.en?.trim()))
    }
    // "Drawn from the episode" = every token of the example appears in ONE
    // turn — a shared `hat`/`bin` alone must not satisfy it.
    const tokenize = (s: string) => lower(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    const turnTokenSets = dialogue.map((turn) => new Set(tokenize(turn.targetText)))
    assert(
      `${label} ≥ 1 pattern example is drawn from the episode (all tokens within one turn)`,
      pattern.examples.some((example) => {
        const exampleTokens = tokenize(example.targetText)
        return exampleTokens.length > 0
          && turnTokenSets.some((turnTokens) => exampleTokens.every((token) => turnTokens.has(token)))
      }),
      pattern.examples.map((example) => example.targetText),
    )
  }

  // --- A2-inherited mechanics
  const chunkConcat = variant.chunks.map((chunk) => chunk.targetText).join(' ')
  assert(`${label} chunk concat === you₁`, normalizeWs(chunkConcat) === normalizeWs(variant.corePhrase.targetText), chunkConcat)
  assert(`${label} has 4–7 chunks`, variant.chunks.length >= 4 && variant.chunks.length <= 7, variant.chunks.length)
  assert(`${label} has 6–8 lessonItems`, variant.lessonItems.length >= 6 && variant.lessonItems.length <= 8, variant.lessonItems.length)
  assert(`${label} buildChips = chunks + exactly 2 distractors`, variant.build.chips.length === variant.chunks.length + 2, variant.build.chips.length)
  assert(`${label} buildChips ≤ 9`, variant.build.chips.length <= 9)
  assert(`${label} build target === you₁`, variant.build.targetText === variant.corePhrase.targetText)

  const recallConcat = `${variant.typeRecall.before}${variant.typeRecall.answer}${variant.typeRecall.after}`
  assert(`${label} typeRecall reconstructs you₁`, normalizeWs(recallConcat) === normalizeWs(variant.corePhrase.targetText), recallConcat)
  assert(`${label} typeRecall answer ∈ acceptedAnswers`, variant.typeRecall.acceptedAnswers.includes(variant.typeRecall.answer))
  assert(`${label} typeRecall has 4 fallback choices incl. the answer`, variant.typeRecall.fallbackChoices.length === 4 && variant.typeRecall.fallbackChoices.includes(variant.typeRecall.answer), variant.typeRecall.fallbackChoices)

  assert(`${label} speak language is de-DE`, variant.speakTarget.language === 'de-DE')
  assert(`${label} speak threshold is 0.8`, variant.speakTarget.passingThreshold === 0.8)
  assert(`${label} speak window is 15 s`, variant.speakTarget.maxRecordingSeconds === 15)
  const requiredTokens = variant.speakTarget.requiredTokens ?? []
  assert(`${label} has 3 required speak tokens`, requiredTokens.length === 3, requiredTokens)
  const coreTokens = lower(variant.corePhrase.targetText).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  for (const token of requiredTokens) {
    assert(`${label} required token '${token}' is one word of you₁`, !token.includes(' ') && !token.includes('-') && !token.includes("'") && coreTokens.includes(token), token)
  }

  // --- German rails on learner production (you₁, you₂)
  for (const learnerText of [dialogue[1].targetText, dialogue[3].targetText]) {
    for (const { re, why } of GERMAN_B1_BANNED_LEARNER_PATTERNS) {
      assert(`${label} learner line avoids: ${why}`, !re.test(learnerText), learnerText)
    }
    for (const staged of GERMAN_B1_STAGED_FORMS) {
      if (isStagedFormAllowed(staged, pathNumber, lesson.lessonNumber)) continue
      assert(`${label} learner line avoids: ${staged.why}`, !staged.re.test(learnerText), learnerText)
    }
  }

  // --- trophy
  const trophy = variant.trophyWord
  const episodeTextLower = lower(dialogue.map((turn) => turn.targetText).join(' '))
  assert(`${label} trophy word appears in the episode`, episodeTextLower.includes(lower(trophy.word)), trophy.word)
  assert(`${label} trophy carries meaning.en + why.en + example`, Boolean(trophy.meaning.en?.trim()) && Boolean(trophy.whyThisWord.en?.trim()) && Boolean(trophy.example.trim()))
  const trophyKey = lower(trophy.word)
  assert(`${label} trophy '${trophy.word}' is new within B1`, !seenTrophies.has(trophyKey), seenTrophies.get(trophyKey))
  seenTrophies.set(trophyKey, lesson.id)
}

// --- cross-corpus trophy uniqueness (German A1 + A2 + B1)
const germanTrophyOwners = new Map<string, string[]>()
for (const lesson of GUIDED_LESSONS as GuidedLessonDefinition[]) {
  if (lesson.targetLanguage !== 'German') continue
  for (const variant of Object.values(lesson.vibeVariants)) {
    if (!variant) continue
    const key = lower(variant.trophyWord.word)
    germanTrophyOwners.set(key, [...(germanTrophyOwners.get(key) ?? []), lesson.id])
  }
}
for (const [trophyKey] of seenTrophies) {
  const owners = germanTrophyOwners.get(trophyKey) ?? []
  assert(`B1 trophy '${trophyKey}' is unique across the German corpus (A1+A2+B1)`, owners.length === 1, owners)
}

// --- path notices
for (let pathNumber = 1; pathNumber <= 10; pathNumber += 1) {
  if (!seenPathNumbers.has(pathNumber)) {
    console.log(`note  german-b1-practical-${pathNumber} not authored yet — skipped`)
  }
}

console.log(`\n${checks - failures} passed, ${failures} failed (of ${checks})`)
if (failures > 0) process.exit(1)
