/**
 * German B1 — the Local tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_B1_LEARNING_PATH_DESIGN.md and the pilot spec in
 * tmp\B1_GERMAN_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base language is ENGLISH (matching German A1/A2): all GuidedBaseContentText
 *   fields carry .en only; lesson.situation additionally carries the required
 *   .de rendering (du-form German, as in A1/A2).
 * - Four-turn episode: dialogue = them₁ / you₁ / them₂ / you₂. you₁ IS the
 *   corePhrase (built, spoken, TTS-anchored); you₂ IS the complication cloze's
 *   full text (6–12 words, 2–3 blanks, ≥ 1 targeting the path anchor).
 *   sceneCaption still quotes them₁ inside the .en caption so A1/A2-shaped
 *   consumers keep working; the dialogue is the B1 source of truth.
 * - Register is per LESSON (`register` field), not per path: Sie with
 *   officials/services/strangers, du with friends/neighbors; one interlocutor
 *   per lesson, all four turns agree.
 * - Grammar rails (§5.6): Perfekt is the spoken-narrative default; Präteritum
 *   only sein/haben/werden + modals (+ es gab); Konjunktiv II only würde+Inf
 *   and hätte/wäre/könnte/müsste; relatives Nom/Akk only; passive without
 *   agent; Futur I never required in production. Each path stages ONE anchor
 *   family per the spec — learner turns use only staged + earlier-attested
 *   structures; interlocutor turns are whitelist-exempt.
 * - typeRecall is kept (single blank, targets the anchor element of you₁) —
 *   not in the B1 session flow, but segment reviews and checkpoints consume it.
 * - Locale hygiene: real umlauts (ä/ö/ü) and ß everywhere, never digraphs;
 *   quoted interlocutor German inside captions is the only German in .en fields.
 * - Trophies unique across the entire German guided corpus (A1 + A2 + B1);
 *   German nouns keep their capital letter.
 */
import type {
  GuidedBaseContentText,
  GuidedClozeBlankKind,
  GuidedClozeSegment,
  GuidedDialogueTurn,
  GuidedLessonDefinition,
  GuidedLessonStep,
  GuidedLessonTrophyWord,
  GuidedLessonVibeVariant,
  GuidedPathMetadata,
  GuidedPatternSpotlight,
  GuidedRegister,
} from '../guidedLessons'
import { DEFAULT_GUIDED_VIBE_ID } from '../guidedVibes'

const GERMAN_B1_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'pattern', 'build', 'complication', 'rolePlay', 'complete']

export type GermanB1LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

/** Accepted-answer variants: exact, lowercase, and umlaut-digraph fallbacks (ä→ae, ö→oe, ü→ue, ß→ss) for learners typing without a German keyboard. */
function germanB1Answers(text: string): string[] {
  const digraph = text
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
  const variants = [text, digraph, text.toLowerCase(), digraph.toLowerCase()]
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function germanB1SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
  const requiredTokens = required.map((token) => token.toLowerCase())
  const optionalTokens = [...new Set(
    targetText
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !requiredTokens.includes(word)),
  )]
  return { requiredTokens, optionalTokens }
}

/** Compact cloze authoring: strings are literal text segments (spaces/punctuation included), objects become blanks. */
export type GermanB1ClozePart =
  | string
  | {
    kind: GuidedClozeBlankKind
    answer: string
    /** lemma cue for form blanks */
    cue?: string
    /** exactly 4 same-category chips incl. the answer (choice: always visible; typed kinds: fallback on a miss) */
    choices: [string, string, string, string]
  }

function buildGermanB1ClozeSegments(parts: GermanB1ClozePart[]): GuidedClozeSegment[] {
  return parts.map((part) => {
    if (typeof part === 'string') {
      return { type: 'text', text: part }
    }
    return {
      type: 'blank',
      blank: {
        kind: part.kind,
        answer: part.answer,
        acceptedAnswers: germanB1Answers(part.answer),
        cue: part.cue,
        choices: [...part.choices],
      },
    }
  })
}

export type GermanB1CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  register: GuidedRegister
  /** them₁ / you₁ / them₂ / you₂ — you₁ becomes the corePhrase, you₂ must equal the cloze concat */
  dialogue: [
    { targetText: string; baseText: GuidedBaseContentText },
    { targetText: string; baseText: GuidedBaseContentText },
    { targetText: string; baseText: GuidedBaseContentText },
    { targetText: string; baseText: GuidedBaseContentText },
  ]
  pattern: GuidedPatternSpotlight
  cloze: GermanB1ClozePart[]
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[] }
  /** Exactly the salient single words the speech check requires for you₁ — never multi-word phrases, never forms with an apostrophe or hyphen. */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

export function makeGermanB1CompactLesson(input: GermanB1CompactLesson): GermanB1LessonInput {
  const prefix = input.slug.split('-')[0]
  const [themOne, youOne, themTwo, youTwo] = input.dialogue
  const dialogue: GuidedDialogueTurn[] = [
    { speaker: 'them', ...themOne },
    { speaker: 'you', ...youOne },
    { speaker: 'them', ...themTwo },
    { speaker: 'you', ...youTwo },
  ]

  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: {
      contentStatus: 'draft',
      corePhrase: { targetText: youOne.targetText, baseText: youOne.baseText },
      meaning: youOne.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map((term, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: germanB1Answers(term.targetText),
      })),
      build: {
        targetText: youOne.targetText,
        chips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      },
      typeRecall: {
        ...input.recall,
        acceptedAnswers: germanB1Answers(input.recall.answer),
      },
      speakTarget: {
        baseCue: youOne.baseText,
        targetPhrase: youOne.targetText,
        ...germanB1SpeakTokens(youOne.targetText, input.speakRequired),
        language: 'de-DE',
        passingThreshold: 0.8,
        maxRecordingSeconds: 15,
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderMedia: {
        type: 'video',
        caption: input.placeholderCaption,
      },
      songSeed: {
        genre: 'warm indie-folk with steady momentum',
        mood: input.songMood,
      },
      visualNotes: input.visualNotes,
      dialogue,
      pattern: input.pattern,
      cloze: { segments: buildGermanB1ClozeSegments(input.cloze) },
      register: input.register,
    },
  }
}

export function makeGermanB1PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: GermanB1LessonInput[],
  completionSituation: { en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('german-b1-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `german-b1-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
    const nextInput = inputs[index + 1]

    return {
      id,
      pathId: metadata.id,
      courseTitle: metadata.title,
      level: metadata.level,
      lessonNumber,
      baseLanguage: metadata.baseLanguage,
      targetLanguage: metadata.targetLanguage,
      pathMetadata: metadata,
      lessonMetadata: {
        id,
        sequence: lessonNumber,
        title: lessonInput.title,
      },
      title: lessonInput.title,
      situation: lessonInput.situation,
      pedagogicalGoal: lessonInput.pedagogicalGoal,
      modeSet: 'guided-today-v0',
      steps: GERMAN_B1_GUIDED_TODAY_STEPS,
      estimatedMinutes: 7,
      fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
      status: 'active',
      nextLessonTeaser: {
        title: nextInput?.title ?? { en: 'Path complete' },
        situation: {
          en: nextInput?.situation.en ?? completionSituation.en,
        },
      },
      vibeVariants: {
        bright: lessonInput.variant,
      },
    }
  })
}

export const GUIDED_TODAY_PATH_GERMAN_B1_ONE_METADATA: GuidedPathMetadata = {
  id: 'german-b1-practical-1',
  title: 'German B1 Practical 1',
  shortTitle: 'B1 Practical 1',
  subtitle: { en: 'What happened: telling a past episode, start to finish' },
  level: 'B1', baseLanguage: 'English', targetLanguage: 'German', estimatedMinutes: 7,
}

/**
 * P1 — "What happened" (episode shape B, interested listener). Anchor family:
 * past narration — staged L1–3 Perfekt only (haben + sein), L4–5 + war/hatte,
 * L6–7 + modal Präteritum, L8–10 mixed narration. Connectors: zuerst / dann /
 * danach / plötzlich / aber. The three lessons below are the handwritten
 * Phase-0 device-gate pilots (design doc §6) — Codex authors L4–L10 only
 * after the owner approves these on device.
 */
const germanB1Practical1Inputs: GermanB1LessonInput[] = [
  makeGermanB1CompactLesson({
    slug: 'ich-habe-meinen-schluessel-verloren',
    title: { en: 'The lost key' },
    situation: { en: 'Your neighbor Lena finds you waiting outside the building door and wants to know what is going on. Tell her the story of your morning.', de: 'Deine Nachbarin Lena sieht dich vor der Haustür warten und will wissen, was los ist. Du erzählst ihr, was heute Morgen passiert ist.' },
    pedagogicalGoal: 'Narrate a two-event past episode in the Perfekt with a sequencing connector.',
    register: 'du',
    dialogue: [
      { targetText: 'Na, was machst du denn hier draußen? Ist alles okay?', baseText: { en: 'Well, what are you doing out here? Is everything okay?' } },
      { targetText: 'Ich habe heute Morgen meinen Schlüssel verloren und dann den Bus verpasst.', baseText: { en: 'I lost my key this morning and then missed the bus.' } },
      { targetText: 'Oh nein! Und wie bist du dann zur Arbeit gekommen?', baseText: { en: 'Oh no! And how did you get to work then?' } },
      { targetText: 'Zuerst habe ich ein Taxi gerufen, danach hat mir eine Kollegin geholfen.', baseText: { en: 'First I called a taxi, after that a colleague helped me.' } },
    ],
    pattern: {
      label: 'Perfekt',
      rule: { en: 'To tell what happened, German uses haben + a participle — and the participle goes to the very end of the sentence.' },
      examples: [
        { targetText: 'Ich habe meinen Schlüssel verloren.', baseText: { en: 'I lost my key.' }, highlight: 'verloren' },
        { targetText: 'Ich habe den Bus verpasst.', baseText: { en: 'I missed the bus.' }, highlight: 'verpasst' },
        { targetText: 'Eine Kollegin hat mir geholfen.', baseText: { en: 'A colleague helped me.' }, highlight: 'geholfen' },
      ],
    },
    cloze: [
      'Zuerst habe ich ein Taxi ',
      { kind: 'form', answer: 'gerufen', cue: 'rufen', choices: ['gerufen', 'vergessen', 'getroffen', 'verkauft'] },
      ', ',
      { kind: 'connector', answer: 'danach', choices: ['danach', 'zuerst', 'plötzlich', 'deshalb'] },
      ' hat mir eine Kollegin ',
      { kind: 'form', answer: 'geholfen', cue: 'helfen', choices: ['geholfen', 'gefragt', 'gesehen', 'gegeben'] },
      '.',
    ],
    chunks: [
      { targetText: 'Ich habe heute Morgen', baseText: { en: 'This morning I' } },
      { targetText: 'meinen Schlüssel verloren', baseText: { en: 'lost my key' } },
      { targetText: 'und dann', baseText: { en: 'and then' } },
      { targetText: 'den Bus verpasst.', baseText: { en: 'missed the bus.' } },
    ],
    terms: [
      { targetText: 'verloren', baseText: { en: 'lost' } },
      { targetText: 'verpasst', baseText: { en: 'missed' } },
      { targetText: 'der Schlüssel', baseText: { en: 'the key' } },
      { targetText: 'draußen', baseText: { en: 'outside' } },
      { targetText: 'zur Arbeit', baseText: { en: 'to work' } },
      { targetText: 'ein Taxi gerufen', baseText: { en: 'called a taxi' } },
      { targetText: 'die Kollegin', baseText: { en: 'the colleague (female)' } },
      { targetText: 'geholfen', baseText: { en: 'helped' } },
    ],
    recall: { before: 'Ich habe heute Morgen meinen Schlüssel ', answer: 'verloren', after: ' und dann den Bus verpasst.', fallbackChoices: ['verloren', 'verpasst', 'vergessen', 'gefunden'] },
    speakRequired: ['schlüssel', 'verloren', 'verpasst'],
    sceneCaption: { en: 'Your neighbor Lena finds you outside the door and asks: “Na, was machst du denn hier draußen?”' },
    trophyWord: { word: 'verloren', meaning: { en: 'lost' }, example: 'Ich habe meinen Schlüssel verloren.', whyThisWord: { en: 'verloren opens almost every story about something going wrong — the narrator’s first word.' } },
    distractors: ['mein Handy vergessen', 'die Tür geöffnet'],
    placeholderCaption: { en: 'A resident waits by an apartment door while a neighbor arrives with keys in hand.' },
    songMood: 'a rough morning retold with a smile by evening',
    visualNotes: 'Apartment building entrance in morning light, one person waiting without keys, a friendly neighbor arriving.',
  }),
  makeGermanB1CompactLesson({
    slug: 'die-s-bahn-hat-ploetzlich-angehalten',
    title: { en: 'The stopped train' },
    situation: { en: 'You arrive late at the dental practice. The receptionist asks what happened — explain the delay and how you tried to reach them.', de: 'Du kommst zu spät in die Zahnarztpraxis. Die Empfangsdame fragt, was passiert ist — du erklärst die Verspätung und wie du sie erreichen wolltest.' },
    pedagogicalGoal: 'Explain a delay with separable-verb participles (angehalten, angerufen) in the Perfekt.',
    register: 'Sie',
    dialogue: [
      { targetText: 'Guten Tag! Ihr Termin war um neun Uhr. Was ist denn passiert?', baseText: { en: 'Good morning! Your appointment was at nine. What happened?' } },
      { targetText: 'Entschuldigung, die S-Bahn hat plötzlich angehalten und wir haben dreißig Minuten gewartet.', baseText: { en: 'Sorry, the train suddenly stopped and we waited thirty minutes.' } },
      { targetText: 'Ach so. Und warum haben Sie nicht angerufen?', baseText: { en: 'I see. And why didn’t you call?' } },
      { targetText: 'Ich habe dreimal angerufen, aber niemand hat geantwortet.', baseText: { en: 'I called three times, but nobody answered.' } },
    ],
    pattern: {
      label: 'Perfekt: trennbare Verben',
      rule: { en: 'Separable verbs put their prefix back on in the participle: an + rufen becomes angerufen, an + halten becomes angehalten.' },
      examples: [
        { targetText: 'Die S-Bahn hat plötzlich angehalten.', baseText: { en: 'The train suddenly stopped.' }, highlight: 'angehalten' },
        { targetText: 'Ich habe dreimal angerufen.', baseText: { en: 'I called three times.' }, highlight: 'angerufen' },
      ],
    },
    cloze: [
      'Ich habe dreimal ',
      { kind: 'form', answer: 'angerufen', cue: 'anrufen', choices: ['angerufen', 'angehalten', 'angekommen', 'angefangen'] },
      ', ',
      { kind: 'connector', answer: 'aber', choices: ['aber', 'danach', 'dann', 'zuerst'] },
      ' niemand hat ',
      { kind: 'form', answer: 'geantwortet', cue: 'antworten', choices: ['geantwortet', 'gewartet', 'gefragt', 'gelacht'] },
      '.',
    ],
    chunks: [
      { targetText: 'Entschuldigung,', baseText: { en: 'Sorry,' } },
      { targetText: 'die S-Bahn hat', baseText: { en: 'the train' } },
      { targetText: 'plötzlich angehalten', baseText: { en: 'suddenly stopped' } },
      { targetText: 'und wir haben', baseText: { en: 'and we' } },
      { targetText: 'dreißig Minuten gewartet.', baseText: { en: 'waited thirty minutes.' } },
    ],
    terms: [
      { targetText: 'der Termin', baseText: { en: 'the appointment' } },
      { targetText: 'plötzlich', baseText: { en: 'suddenly' } },
      { targetText: 'angehalten', baseText: { en: 'stopped' } },
      { targetText: 'gewartet', baseText: { en: 'waited' } },
      { targetText: 'angerufen', baseText: { en: 'called' } },
      { targetText: 'geantwortet', baseText: { en: 'answered' } },
      { targetText: 'dreimal', baseText: { en: 'three times' } },
      { targetText: 'die Verspätung', baseText: { en: 'the delay' } },
    ],
    recall: { before: 'Entschuldigung, die S-Bahn hat plötzlich ', answer: 'angehalten', after: ' und wir haben dreißig Minuten gewartet.', fallbackChoices: ['angehalten', 'angekommen', 'angerufen', 'angefangen'] },
    speakRequired: ['plötzlich', 'angehalten', 'gewartet'],
    sceneCaption: { en: 'The receptionist looks up from the schedule and asks: “Ihr Termin war um neun Uhr. Was ist denn passiert?”' },
    trophyWord: { word: 'plötzlich', meaning: { en: 'suddenly' }, example: 'Plötzlich hat der Zug angehalten.', whyThisWord: { en: 'plötzlich is the hinge of every good story — the moment something changes.' } },
    distractors: ['den Zug genommen', 'zu spät gekommen'],
    placeholderCaption: { en: 'A commuter checks the time inside a stopped city train between stations.' },
    songMood: 'a stuck train, a ticking clock, and an honest explanation',
    visualNotes: 'City train halted between stations, passengers checking phones, then a bright dental practice reception.',
  }),
  makeGermanB1CompactLesson({
    slug: 'ich-bin-zu-einem-konzert-gefahren',
    title: { en: 'The concert' },
    situation: { en: 'Your friend Jonas asks about your weekend at the café. Tell him where you went and keep the story going when he asks for more.', de: 'Dein Freund Jonas fragt im Café nach deinem Wochenende. Du erzählst ihm, wo du warst, und führst die Geschichte weiter, als er nachfragt.' },
    pedagogicalGoal: 'Narrate a weekend episode mixing sein-Perfekt (bin gefahren) and haben-Perfekt.',
    register: 'du',
    dialogue: [
      { targetText: 'Hey! Wie war dein Wochenende? Erzähl mal!', baseText: { en: 'Hey! How was your weekend? Tell me!' } },
      { targetText: 'Ich bin am Samstag mit Freunden zu einem Konzert gefahren und wir haben zusammen getanzt.', baseText: { en: 'On Saturday I went to a concert with friends and we danced together.' } },
      { targetText: 'Klingt super! Und wie hat dir die Band gefallen?', baseText: { en: 'Sounds great! And how did you like the band?' } },
      { targetText: 'Sie hat mir richtig gut gefallen, danach haben wir noch lange geredet.', baseText: { en: 'I really liked the band — after that we talked for a long time.' } },
    ],
    pattern: {
      label: 'Perfekt mit sein',
      rule: { en: 'Movement verbs like fahren, gehen and kommen build the Perfekt with sein: ich bin gefahren, not ich habe.' },
      examples: [
        { targetText: 'Ich bin zu einem Konzert gefahren.', baseText: { en: 'I went to a concert.' }, highlight: 'bin' },
        { targetText: 'Wir sind spät nach Hause gekommen.', baseText: { en: 'We came home late.' }, highlight: 'sind' },
        { targetText: 'Wir haben zusammen getanzt.', baseText: { en: 'We danced together.' }, highlight: 'haben' },
      ],
    },
    cloze: [
      'Sie hat mir richtig gut ',
      { kind: 'form', answer: 'gefallen', cue: 'gefallen', choices: ['gefallen', 'gefeiert', 'gehört', 'gesehen'] },
      ', ',
      { kind: 'connector', answer: 'danach', choices: ['danach', 'aber', 'plötzlich', 'zuerst'] },
      ' haben wir noch lange ',
      { kind: 'form', answer: 'geredet', cue: 'reden', choices: ['geredet', 'gefunden', 'verloren', 'bekommen'] },
      '.',
    ],
    chunks: [
      { targetText: 'Ich bin am Samstag', baseText: { en: 'On Saturday I' } },
      { targetText: 'mit Freunden', baseText: { en: 'with friends' } },
      { targetText: 'zu einem Konzert gefahren', baseText: { en: 'went to a concert' } },
      { targetText: 'und wir haben', baseText: { en: 'and we' } },
      { targetText: 'zusammen getanzt.', baseText: { en: 'danced together.' } },
    ],
    terms: [
      { targetText: 'das Konzert', baseText: { en: 'the concert' } },
      { targetText: 'gefahren', baseText: { en: 'went, drove' } },
      { targetText: 'getanzt', baseText: { en: 'danced' } },
      { targetText: 'gefallen', baseText: { en: 'liked (it pleased me)' } },
      { targetText: 'geredet', baseText: { en: 'talked' } },
      { targetText: 'das Wochenende', baseText: { en: 'the weekend' } },
      { targetText: 'am Samstag', baseText: { en: 'on Saturday' } },
      { targetText: 'noch lange', baseText: { en: 'for a long while' } },
    ],
    recall: { before: 'Ich bin am Samstag mit Freunden zu einem Konzert ', answer: 'gefahren', after: ' und wir haben zusammen getanzt.', fallbackChoices: ['gefahren', 'gegangen', 'gekommen', 'geblieben'] },
    speakRequired: ['samstag', 'konzert', 'gefahren'],
    sceneCaption: { en: 'Jonas leans over his coffee and asks: “Wie war dein Wochenende? Erzähl mal!”' },
    trophyWord: { word: 'danach', meaning: { en: 'after that' }, example: 'Danach haben wir noch lange geredet.', whyThisWord: { en: 'danach chains your story’s events into one flowing thread — the narrator’s connector.' } },
    distractors: ['ins Kino gegangen', 'zu Hause geblieben'],
    placeholderCaption: { en: 'Friends talk over coffee while concert lights glow in a remembered scene.' },
    songMood: 'a weekend story that gets better with every retelling',
    visualNotes: 'Café table with two friends, one telling an animated story; a warm flashback of concert lights and dancing.',
  }),
]

export const GERMAN_B1_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeGermanB1PracticalLessons(
  GUIDED_TODAY_PATH_GERMAN_B1_ONE_METADATA,
  germanB1Practical1Inputs,
  { en: 'More B1 episodes are on the way.' },
)
