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
  makeGermanB1CompactLesson({
    slug: 'gestern-war-mein-tag-chaotisch',
    title: { en: 'The chaotic day' },
    situation: { en: 'Your friend Mara meets you in the office kitchen and notices that you look exhausted. Explain why yesterday was so chaotic.', de: 'Deine Freundin Mara trifft dich in der Büroküche und merkt, dass du müde aussiehst. Du erklärst ihr, warum gestern alles so chaotisch war.' },
    pedagogicalGoal: 'Frame a chaotic day with war and hatte, then sequence two Perfekt events.',
    register: 'du',
    dialogue: [
      { targetText: 'Du siehst müde aus. Was war gestern los?', baseText: { en: 'You look tired. What happened yesterday?' } },
      { targetText: 'Gestern war mein Tag völlig chaotisch, und ich hatte kaum eine Pause.', baseText: { en: 'Yesterday my day was completely chaotic, and I hardly had a break.' } },
      { targetText: 'Was ist denn schon am Morgen passiert?', baseText: { en: 'What happened first thing in the morning?' } },
      { targetText: 'Zuerst habe ich verschlafen, dann habe ich den Bus verpasst.', baseText: { en: 'First I overslept, then I missed the bus.' } },
    ],
    pattern: {
      label: 'Präteritum: war und hatte',
      rule: { en: 'Use war for how something was and hatte for what someone had before the Perfekt events.' },
      examples: [
        { targetText: 'Gestern war mein Tag völlig chaotisch.', baseText: { en: 'Yesterday my day was completely chaotic.' }, highlight: 'war' },
        { targetText: 'Ich hatte kaum eine Pause.', baseText: { en: 'I hardly had a break.' }, highlight: 'hatte' },
      ],
    },
    cloze: [
      'Zuerst habe ich ',
      { kind: 'form', answer: 'verschlafen', cue: 'verschlafen', choices: ['verschlafen', 'gearbeitet', 'eingekauft', 'telefoniert'] },
      ', ',
      { kind: 'connector', answer: 'dann', choices: ['dann', 'zuerst', 'plötzlich', 'endlich'] },
      ' habe ich den Bus ',
      { kind: 'form', answer: 'verpasst', cue: 'verpassen', choices: ['verpasst', 'bezahlt', 'besucht', 'geöffnet'] },
      '.',
    ],
    chunks: [
      { targetText: 'Gestern war mein Tag', baseText: { en: 'Yesterday my day was' } },
      { targetText: 'völlig chaotisch,', baseText: { en: 'completely chaotic,' } },
      { targetText: 'und ich hatte', baseText: { en: 'and I had' } },
      { targetText: 'kaum eine Pause.', baseText: { en: 'hardly any break.' } },
    ],
    terms: [
      { targetText: 'müde aussehen', baseText: { en: 'to look tired' } },
      { targetText: 'der Tag', baseText: { en: 'the day' } },
      { targetText: 'gestern', baseText: { en: 'yesterday' } },
      { targetText: 'völlig chaotisch', baseText: { en: 'completely chaotic' } },
      { targetText: 'kaum eine Pause', baseText: { en: 'hardly any break' } },
      { targetText: 'verschlafen', baseText: { en: 'overslept' } },
      { targetText: 'den Bus verpassen', baseText: { en: 'to miss the bus' } },
      { targetText: 'am Morgen', baseText: { en: 'in the morning' } },
    ],
    recall: { before: 'Gestern war mein Tag völlig chaotisch, und ich ', answer: 'hatte', after: ' kaum eine Pause.', fallbackChoices: ['hatte', 'hattest', 'hatten', 'hat'] },
    speakRequired: ['gestern', 'chaotisch', 'pause'],
    sceneCaption: { en: 'Mara notices your tired face in the office kitchen and asks: “Du siehst müde aus. Was war gestern los?”' },
    trophyWord: { word: 'gestern', meaning: { en: 'yesterday' }, example: 'Was war gestern los?', whyThisWord: { en: 'gestern gives a past story its time frame before the details begin.' } },
    distractors: ['am Abend entspannt', 'pünktlich angekommen'],
    placeholderCaption: { en: 'Two friends stand by the office coffee machine as one notices the other’s tired expression.' },
    songMood: 'an overfull yesterday unpacked over the first coffee of the day',
    visualNotes: 'Bright office kitchen, untouched coffee, tired posture, and a concerned friend opening the conversation.',
  }),
  makeGermanB1CompactLesson({
    slug: 'ich-habe-meinen-ausweis-vergessen',
    title: { en: 'The missing library card' },
    situation: { en: 'Back at the library, Mr. Keller remembers yesterday’s problem at the counter. Tell him what went wrong with your card and how you solved it.', de: 'Wieder in der Bibliothek erinnert sich Herr Keller an das Problem von gestern an der Theke. Du erzählst ihm, was mit deinem Ausweis los war und wie du es gelöst hast.' },
    pedagogicalGoal: 'Use hatte for missing past possession and continue with a completed Perfekt event.',
    register: 'Sie',
    dialogue: [
      { targetText: 'Schön, Sie wiederzusehen! Gestern hat Ihr Bibliotheksausweis gefehlt, oder?', baseText: { en: 'Nice to see you again! Your library card was missing yesterday, right?' } },
      { targetText: 'Ich hatte meinen Bibliotheksausweis nicht dabei, weil ich ihn zu Hause vergessen habe.', baseText: { en: 'I did not have my library card with me because I left it at home.' } },
      { targetText: 'Und wie haben Sie das Buch trotzdem bekommen?', baseText: { en: 'And how did you get the book anyway?' } },
      { targetText: 'Zum Glück habe ich meinen Pass gezeigt, danach hat es geklappt.', baseText: { en: 'Luckily I showed my passport; after that it worked out.' } },
    ],
    pattern: {
      label: 'Präteritum: war und hatte',
      rule: { en: 'Use hatte to describe what was missing in a past situation and war to describe the setting around it.' },
      examples: [
        { targetText: 'Ich hatte meinen Bibliotheksausweis nicht dabei.', baseText: { en: 'I did not have my library card with me.' }, highlight: 'hatte' },
        { targetText: 'Die Ausleihtheke war noch geöffnet.', baseText: { en: 'The lending desk was still open.' }, highlight: 'war' },
      ],
    },
    cloze: [
      'Zum Glück habe ich meinen Pass ',
      { kind: 'form', answer: 'gezeigt', cue: 'zeigen', choices: ['gezeigt', 'bestellt', 'vergessen', 'bezahlt'] },
      ', ',
      { kind: 'connector', answer: 'danach', choices: ['danach', 'zuerst', 'trotzdem', 'plötzlich'] },
      ' hat es ',
      { kind: 'form', answer: 'geklappt', cue: 'klappen', choices: ['geklappt', 'geregnet', 'gefehlt', 'gedauert'] },
      '.',
    ],
    chunks: [
      { targetText: 'Ich hatte meinen Bibliotheksausweis', baseText: { en: 'I had my library card' } },
      { targetText: 'nicht dabei,', baseText: { en: 'not with me,' } },
      { targetText: 'weil', baseText: { en: 'because' } },
      { targetText: 'ich ihn zu Hause vergessen habe.', baseText: { en: 'I had left it at home.' } },
    ],
    terms: [
      { targetText: 'der Bibliotheksausweis', baseText: { en: 'the library card' } },
      { targetText: 'dabei haben', baseText: { en: 'to have with you' } },
      { targetText: 'zu Hause', baseText: { en: 'at home' } },
      { targetText: 'vergessen', baseText: { en: 'forgotten' } },
      { targetText: 'ein anderer Ausweis', baseText: { en: 'another form of identification' } },
      { targetText: 'der Pass', baseText: { en: 'the passport' } },
      { targetText: 'gezeigt', baseText: { en: 'shown' } },
      { targetText: 'geklappt', baseText: { en: 'worked out' } },
    ],
    recall: { before: 'Ich ', answer: 'hatte', after: ' meinen Bibliotheksausweis nicht dabei, weil ich ihn zu Hause vergessen habe.', fallbackChoices: ['hatte', 'hattest', 'hatten', 'hat'] },
    speakRequired: ['bibliotheksausweis', 'hause', 'vergessen'],
    sceneCaption: { en: 'Mr. Keller recognizes you at the counter and says: “Gestern hat Ihr Bibliotheksausweis gefehlt, oder?”' },
    trophyWord: { word: 'vergessen', meaning: { en: 'forgotten' }, example: 'Ich habe meinen Bibliotheksausweis zu Hause vergessen.', whyThisWord: { en: 'vergessen lets you explain a missing essential without losing the thread of your story.' } },
    distractors: ['das Buch zurückgegeben', 'meine Karte gefunden'],
    placeholderCaption: { en: 'A librarian waits behind the service counter while a visitor checks an empty card slot.' },
    songMood: 'a missing card, a patient clerk, and one useful backup plan',
    visualNotes: 'Library lending desk, open wallet without a library card, attentive clerk, shelves softly out of focus.',
  }),
  makeGermanB1CompactLesson({
    slug: 'ich-habe-meinen-kopfhoerer-gefunden',
    title: { en: 'The lost headphones' },
    situation: { en: 'Your neighbor Nils stops by the notice board in the apartment courtyard and asks about the note you posted. Tell him what you lost and how you searched for it.', de: 'Dein Nachbar Nils bleibt im Innenhof am schwarzen Brett stehen und fragt nach deinem Zettel. Du erzählst ihm, was du verloren hast und wie du danach gesucht hast.' },
    pedagogicalGoal: 'Add musste to a Perfekt loss-and-search episode and report the discovery.',
    register: 'du',
    dialogue: [
      { targetText: 'Was steht auf deinem Zettel am schwarzen Brett?', baseText: { en: 'What does your note on the notice board say?' } },
      { targetText: 'Ich habe meinen Kopfhörer verloren und musste überall im Haus suchen.', baseText: { en: 'I lost my headphones and had to search everywhere in the building.' } },
      { targetText: 'Und wo hast du ihn schließlich gefunden?', baseText: { en: 'And where did you finally find them?' } },
      { targetText: 'Dann habe ich im Wäschekorb gesucht und ihn endlich gefunden.', baseText: { en: 'Then I searched in the laundry basket and finally found them.' } },
    ],
    pattern: {
      label: 'Modalverben: musste, konnte, wollte',
      rule: { en: 'Use musste, konnte, or wollte with an infinitive at the end to describe past needs, abilities, and intentions.' },
      examples: [
        { targetText: 'Ich habe meinen Kopfhörer verloren und musste überall im Haus suchen.', baseText: { en: 'I lost my headphones and had to search everywhere in the building.' }, highlight: 'musste überall im Haus suchen' },
        { targetText: 'Ich wollte den Zettel später abnehmen.', baseText: { en: 'I wanted to take the note down later.' }, highlight: 'wollte' },
        { targetText: 'Am Ende konnte ich wieder Musik hören.', baseText: { en: 'In the end I could listen to music again.' }, highlight: 'konnte' },
      ],
    },
    cloze: [
      { kind: 'connector', answer: 'Dann', choices: ['Dann', 'Endlich', 'Zuerst', 'Plötzlich'] },
      ' habe ich im Wäschekorb ',
      { kind: 'form', answer: 'gesucht', cue: 'suchen', choices: ['gesucht', 'gekauft', 'gewaschen', 'geöffnet'] },
      ' und ihn endlich ',
      { kind: 'form', answer: 'gefunden', cue: 'finden', choices: ['gefunden', 'verloren', 'getragen', 'verkauft'] },
      '.',
    ],
    chunks: [
      { targetText: 'Ich habe meinen Kopfhörer verloren', baseText: { en: 'I lost my headphones' } },
      { targetText: 'und musste', baseText: { en: 'and had to' } },
      { targetText: 'überall im Haus', baseText: { en: 'everywhere in the building' } },
      { targetText: 'suchen.', baseText: { en: 'search.' } },
    ],
    terms: [
      { targetText: 'der Zettel', baseText: { en: 'the note' } },
      { targetText: 'das schwarze Brett', baseText: { en: 'the notice board' } },
      { targetText: 'der Kopfhörer', baseText: { en: 'the headphones' } },
      { targetText: 'verloren', baseText: { en: 'lost' } },
      { targetText: 'überall suchen', baseText: { en: 'to search everywhere' } },
      { targetText: 'der Wäschekorb', baseText: { en: 'the laundry basket' } },
      { targetText: 'gefunden', baseText: { en: 'found' } },
      { targetText: 'endlich', baseText: { en: 'finally' } },
    ],
    recall: { before: 'Ich habe meinen Kopfhörer verloren und ', answer: 'musste', after: ' überall im Haus suchen.', fallbackChoices: ['musste', 'musstest', 'mussten', 'musstet'] },
    speakRequired: ['kopfhörer', 'verloren', 'musste'],
    sceneCaption: { en: 'Nils points to the handwritten note and asks: “Was steht auf deinem Zettel am schwarzen Brett?”' },
    trophyWord: { word: 'gefunden', meaning: { en: 'found' }, example: 'Ich habe ihn im Wäschekorb gefunden.', whyThisWord: { en: 'gefunden delivers the satisfying ending after every search story.' } },
    distractors: ['im Keller nachgesehen', 'eine Anzeige geschrieben'],
    placeholderCaption: { en: 'Two neighbors pause beside a handwritten notice on the courtyard bulletin board.' },
    songMood: 'a household mystery ending in the least likely basket',
    visualNotes: 'Apartment courtyard notice board, handwritten lost-item note, two neighbors beginning a curious conversation.',
  }),
  makeGermanB1CompactLesson({
    slug: 'endlich-war-mein-fahrrad-fertig',
    title: { en: 'The long bicycle repair' },
    situation: { en: 'At the bicycle shop, the owner recognizes you and asks whether the repair saga is finally over. Explain the delay and how you got to work in the meantime.', de: 'Im Fahrradladen erkennt dich der Besitzer und fragt, ob die lange Reparatur endlich vorbei ist. Du erklärst die Verzögerung und wie du in der Zwischenzeit zur Arbeit gekommen bist.' },
    pedagogicalGoal: 'Use musste and konnte to narrate a long obstacle before a completed pickup.',
    register: 'Sie',
    dialogue: [
      { targetText: 'Funktioniert Ihr Fahrrad jetzt endlich wieder?', baseText: { en: 'Is your bicycle finally working again now?' } },
      { targetText: 'Die Reparatur war schwierig, und ich musste zwei Wochen auf ein Ersatzteil warten.', baseText: { en: 'The repair was difficult, and I had to wait two weeks for a replacement part.' } },
      { targetText: 'Konnten Sie in der Zeit zur Arbeit fahren?', baseText: { en: 'Could you ride to work during that time?' } },
      { targetText: 'Nein, ich musste laufen, aber gestern habe ich es endlich abgeholt.', baseText: { en: 'No, I had to walk, but yesterday I finally picked it up.' } },
    ],
    pattern: {
      label: 'Modalverben: musste, konnte, wollte',
      rule: { en: 'In a main clause, put musste, konnte, or wollte in second position and the action infinitive at the end.' },
      examples: [
        { targetText: 'Die Reparatur war schwierig, und ich musste zwei Wochen auf ein Ersatzteil warten.', baseText: { en: 'The repair was difficult, and I had to wait two weeks for a replacement part.' }, highlight: 'musste zwei Wochen auf ein Ersatzteil warten' },
        { targetText: 'Ich konnte nicht zur Arbeit fahren.', baseText: { en: 'I could not ride to work.' }, highlight: 'konnte' },
        { targetText: 'Ich wollte das Fahrrad früher abholen.', baseText: { en: 'I wanted to pick up the bicycle earlier.' }, highlight: 'wollte' },
      ],
    },
    cloze: [
      'Nein, ich ',
      { kind: 'form', answer: 'musste', cue: 'müssen', choices: ['musste', 'konnte', 'wollte', 'durfte'] },
      ' laufen, aber gestern habe ich es endlich ',
      { kind: 'form', answer: 'abgeholt', cue: 'abholen', choices: ['abgeholt', 'bezahlt', 'besucht', 'bestellt'] },
      '.',
    ],
    chunks: [
      { targetText: 'Die Reparatur war schwierig,', baseText: { en: 'The repair was difficult,' } },
      { targetText: 'und ich musste', baseText: { en: 'and I had to' } },
      { targetText: 'zwei Wochen', baseText: { en: 'for two weeks' } },
      { targetText: 'auf ein Ersatzteil warten.', baseText: { en: 'wait for a replacement part.' } },
    ],
    terms: [
      { targetText: 'funktionieren', baseText: { en: 'to work, function' } },
      { targetText: 'endlich', baseText: { en: 'finally' } },
      { targetText: 'die Reparatur', baseText: { en: 'the repair' } },
      { targetText: 'schwierig', baseText: { en: 'difficult' } },
      { targetText: 'das Ersatzteil', baseText: { en: 'the replacement part' } },
      { targetText: 'zwei Wochen warten', baseText: { en: 'to wait two weeks' } },
      { targetText: 'zur Arbeit fahren', baseText: { en: 'to ride to work' } },
      { targetText: 'abgeholt', baseText: { en: 'picked up' } },
    ],
    recall: { before: 'Die Reparatur war schwierig, und ich ', answer: 'musste', after: ' zwei Wochen auf ein Ersatzteil warten.', fallbackChoices: ['musste', 'musstest', 'mussten', 'musstet'] },
    speakRequired: ['reparatur', 'musste', 'ersatzteil'],
    sceneCaption: { en: 'The bicycle-shop owner recognizes you and asks: “Funktioniert Ihr Fahrrad jetzt endlich wieder?”' },
    trophyWord: { word: 'endlich', meaning: { en: 'finally' }, example: 'Jetzt funktioniert mein Fahrrad endlich wieder.', whyThisWord: { en: 'endlich closes a long-running problem with relief the listener can hear.' } },
    distractors: ['ein neues Rad gekauft', 'sofort weitergefahren'],
    placeholderCaption: { en: 'A familiar shop owner greets a returning customer beside a bicycle at the service counter.' },
    songMood: 'two slow weeks resolving in the click of a repaired bicycle',
    visualNotes: 'Neighborhood bicycle shop, service counter, a bicycle nearby, and the familiar owner asking for an update.',
  }),
  makeGermanB1CompactLesson({
    slug: 'ich-bin-falsch-eingestiegen',
    title: { en: 'The wrong bus' },
    situation: { en: 'Your friend Sami meets you outside the bus terminal and demands the full story of your strange trip. Tell the adventure from the missed train to the surprise at the last stop.', de: 'Dein Freund Sami trifft dich vor dem Busbahnhof und will die ganze Geschichte von deiner seltsamen Fahrt hören. Du erzählst das Abenteuer vom verpassten Zug bis zur Überraschung an der Endhaltestelle.' },
    pedagogicalGoal: 'Chain a mixed past episode with the full set of sequencing and turn connectors.',
    register: 'du',
    dialogue: [
      { targetText: 'Du musst mir alles erzählen! Was war unterwegs los?', baseText: { en: 'You have to tell me everything! What happened on the way?' } },
      { targetText: 'Zuerst war der Zug weg, dann musste ich zur Bushaltestelle laufen und bin falsch eingestiegen.', baseText: { en: 'First the train was gone, then I had to walk to the bus stop and got on the wrong bus.' } },
      { targetText: 'Und was war dann an der Endhaltestelle los?', baseText: { en: 'And what happened at the last stop?' } },
      { targetText: 'Danach bin ich ausgestiegen, aber plötzlich habe ich Mia gesehen.', baseText: { en: 'After that I got off, but suddenly I saw Mia.' } },
    ],
    pattern: {
      label: 'Konnektoren: zuerst, dann, aber',
      rule: { en: 'Use zuerst, dann, danach, plötzlich, and aber to order events and signal a turn in the story.' },
      examples: [
        { targetText: 'Zuerst war der Zug weg, dann musste ich zur Bushaltestelle laufen und bin falsch eingestiegen.', baseText: { en: 'First the train was gone, then I had to walk to the bus stop and got on the wrong bus.' }, highlight: 'Zuerst war der Zug weg, dann' },
        { targetText: 'Danach bin ich ausgestiegen, aber plötzlich habe ich Mia gesehen.', baseText: { en: 'After that I got off, but suddenly I saw Mia.' }, highlight: 'Danach bin ich ausgestiegen' },
        { targetText: 'Aber plötzlich habe ich Mia gesehen.', baseText: { en: 'But suddenly I saw Mia.' }, highlight: 'Aber plötzlich' },
      ],
    },
    cloze: [
      { kind: 'connector', answer: 'Danach', choices: ['Danach', 'Zuerst', 'Damals', 'Plötzlich'] },
      ' bin ich ',
      { kind: 'form', answer: 'ausgestiegen', cue: 'aussteigen', choices: ['ausgestiegen', 'umgestiegen', 'weitergefahren', 'zurückgefahren'] },
      ', aber ',
      { kind: 'connector', answer: 'plötzlich', choices: ['plötzlich', 'zuerst', 'deshalb', 'damals'] },
      ' habe ich Mia gesehen.',
    ],
    chunks: [
      { targetText: 'Zuerst', baseText: { en: 'First' } },
      { targetText: 'war der Zug weg,', baseText: { en: 'the train was gone,' } },
      { targetText: 'dann musste ich', baseText: { en: 'then I had to' } },
      { targetText: 'zur Bushaltestelle laufen', baseText: { en: 'walk to the bus stop' } },
      { targetText: 'und bin falsch eingestiegen.', baseText: { en: 'and got on the wrong bus.' } },
    ],
    terms: [
      { targetText: 'erzählen', baseText: { en: 'to tell, narrate' } },
      { targetText: 'unterwegs', baseText: { en: 'on the way' } },
      { targetText: 'der Zug', baseText: { en: 'the train' } },
      { targetText: 'weg', baseText: { en: 'gone' } },
      { targetText: 'der falsche Bus', baseText: { en: 'the wrong bus' } },
      { targetText: 'die Endhaltestelle', baseText: { en: 'the last stop' } },
      { targetText: 'ausgestiegen', baseText: { en: 'got off' } },
      { targetText: 'gesehen', baseText: { en: 'seen' } },
    ],
    recall: { before: 'Zuerst war der Zug weg, dann musste ich zur Bushaltestelle laufen und bin falsch ', answer: 'eingestiegen', after: '.', fallbackChoices: ['eingestiegen', 'ausgestiegen', 'umgestiegen', 'weitergefahren'] },
    speakRequired: ['zuerst', 'bushaltestelle', 'eingestiegen'],
    sceneCaption: { en: 'Sami catches you outside the terminal and insists: “Du musst mir alles erzählen! Was war unterwegs los?”' },
    trophyWord: { word: 'erzählen', meaning: { en: 'to tell, narrate' }, example: 'Du musst mir alles erzählen!', whyThisWord: { en: 'erzählen turns separate events into a story shared with another person.' } },
    distractors: ['den richtigen Zug nehmen', 'am Bahnhof warten'],
    placeholderCaption: { en: 'Two friends meet outside a busy bus terminal, one eager to hear how the trip went wrong.' },
    songMood: 'a missed train turning into an unexpected last-stop encounter',
    visualNotes: 'Bus terminal entrance, route board behind two friends, one animatedly asking for the whole travel story.',
  }),
  makeGermanB1CompactLesson({
    slug: 'ein-hund-hat-die-strasse-ueberquert',
    title: { en: 'At the doctor' },
    situation: { en: 'In the examination room, Dr. Wagner asks what happened to your arm. Report the bicycle incident in a clear sequence.', de: 'Im Untersuchungszimmer fragt Dr. Wagner, was mit deinem Arm passiert ist. Du schilderst den Fahrradunfall in einer klaren Reihenfolge.' },
    pedagogicalGoal: 'Combine haben- and sein-Perfekt with past framing and a modal obstacle.',
    register: 'Sie',
    dialogue: [
      { targetText: 'Guten Tag. Was ist mit Ihrem Arm passiert?', baseText: { en: 'Good afternoon. What happened to your arm?' } },
      { targetText: 'Zuerst war alles ruhig, aber dann hat ein Hund die Straße überquert.', baseText: { en: 'At first everything was calm, but then a dog crossed the street.' } },
      { targetText: 'Sind Sie deshalb vom Fahrrad gefallen?', baseText: { en: 'Did you fall off the bicycle because of that?' } },
      { targetText: 'Ja, danach musste ich plötzlich bremsen und bin vom Fahrrad gefallen.', baseText: { en: 'Yes, after that I suddenly had to brake and fell off the bicycle.' } },
    ],
    pattern: {
      label: 'Perfekt mit sein und haben',
      rule: { en: 'Use sein with a change of place or state and haben with most other completed actions in the same story.' },
      examples: [
        { targetText: 'Zuerst war alles ruhig, aber dann hat ein Hund die Straße überquert.', baseText: { en: 'At first everything was calm, but then a dog crossed the street.' }, highlight: 'hat ein Hund die Straße überquert' },
        { targetText: 'Danach bin ich vom Fahrrad gefallen.', baseText: { en: 'After that I fell off the bicycle.' }, highlight: 'bin ich vom Fahrrad gefallen' },
      ],
    },
    cloze: [
      'Ja, ',
      { kind: 'connector', answer: 'danach', choices: ['danach', 'zuerst', 'später', 'damals'] },
      ' ',
      { kind: 'form', answer: 'musste', cue: 'müssen', choices: ['musste', 'konnte', 'wollte', 'durfte'] },
      ' ich plötzlich bremsen und bin vom Fahrrad ',
      { kind: 'form', answer: 'gefallen', cue: 'fallen', choices: ['gefallen', 'gefahren', 'geblieben', 'gelaufen'] },
      '.',
    ],
    chunks: [
      { targetText: 'Zuerst', baseText: { en: 'At first' } },
      { targetText: 'war alles ruhig,', baseText: { en: 'everything was calm,' } },
      { targetText: 'aber dann', baseText: { en: 'but then' } },
      { targetText: 'hat ein Hund die Straße überquert.', baseText: { en: 'a dog crossed the street.' } },
    ],
    terms: [
      { targetText: 'passiert', baseText: { en: 'happened' } },
      { targetText: 'der Arm', baseText: { en: 'the arm' } },
      { targetText: 'ruhig', baseText: { en: 'calm' } },
      { targetText: 'der Hund', baseText: { en: 'the dog' } },
      { targetText: 'die Straße überquert', baseText: { en: 'crossed the street' } },
      { targetText: 'plötzlich bremsen', baseText: { en: 'to brake suddenly' } },
      { targetText: 'das Fahrrad', baseText: { en: 'the bicycle' } },
      { targetText: 'gefallen', baseText: { en: 'fallen' } },
    ],
    recall: { before: 'Zuerst war alles ruhig, aber dann hat ein Hund die Straße ', answer: 'überquert', after: '.', fallbackChoices: ['überquert', 'bezahlt', 'angerufen', 'gekocht'] },
    speakRequired: ['ruhig', 'hund', 'überquert'],
    sceneCaption: { en: 'Dr. Wagner looks at your arm and asks: “Was ist mit Ihrem Arm passiert?”' },
    trophyWord: { word: 'passiert', meaning: { en: 'happened' }, example: 'Was ist mit Ihrem Arm passiert?', whyThisWord: { en: 'passiert invites the exact sequence a listener needs after a minor incident.' } },
    distractors: ['gegen ein Auto gefahren', 'im Park angehalten'],
    placeholderCaption: { en: 'A doctor listens across an examination-room desk while a patient carefully holds one arm.' },
    songMood: 'a calm ride interrupted by one quick crossing and a careful retelling',
    visualNotes: 'Quiet examination room, doctor listening attentively, patient indicating an arm without showing the unseen accident.',
  }),
  makeGermanB1CompactLesson({
    slug: 'mein-rucksack-war-weg',
    title: { en: 'My story of the year' },
    situation: { en: 'At a rooftop dinner, your friend Nele asks for your best story of the year so far. Tell her how an ordinary train ride became your favorite anecdote.', de: 'Bei einem Abendessen auf der Dachterrasse fragt deine Freundin Nele nach deiner besten Geschichte des bisherigen Jahres. Du erzählst ihr, wie eine normale Zugfahrt zu deiner Lieblingsanekdote wurde.' },
    pedagogicalGoal: 'Deliver a capstone story mixing both Perfekt auxiliaries, war, a past modal, and all five connectors.',
    register: 'du',
    dialogue: [
      { targetText: 'Was ist deine beste Geschichte in diesem Jahr?', baseText: { en: 'What is your best story this year?' } },
      { targetText: 'Das ist eine lange Geschichte: Zuerst bin ich ausgestiegen, aber mein Rucksack war weg.', baseText: { en: 'It is a long story: first I got off, but my backpack was gone.' } },
      { targetText: 'Und was hast du dann ohne den Rucksack gemacht?', baseText: { en: 'And what did you do then without the backpack?' } },
      { targetText: 'Dann musste ich zurückfahren, danach habe ich ihn plötzlich gefunden.', baseText: { en: 'Then I had to go back; after that I suddenly found it.' } },
    ],
    pattern: {
      label: 'Vergangenheit: Perfekt und Präteritum',
      rule: { en: 'Use Perfekt for completed events and war or a past modal for the background and obstacle around them.' },
      examples: [
        { targetText: 'Das ist eine lange Geschichte: Zuerst bin ich ausgestiegen, aber mein Rucksack war weg.', baseText: { en: 'It is a long story: first I got off, but my backpack was gone.' }, highlight: 'bin ich ausgestiegen' },
        { targetText: 'Dann musste ich zurückfahren, danach habe ich ihn plötzlich gefunden.', baseText: { en: 'Then I had to go back; after that I suddenly found it.' }, highlight: 'musste ich zurückfahren' },
        { targetText: 'Danach habe ich ihn plötzlich gefunden.', baseText: { en: 'After that I suddenly found it.' }, highlight: 'habe ich ihn plötzlich gefunden' },
      ],
    },
    cloze: [
      'Dann ',
      { kind: 'form', answer: 'musste', cue: 'müssen', choices: ['musste', 'konnte', 'wollte', 'durfte'] },
      ' ich zurückfahren, ',
      { kind: 'connector', answer: 'danach', choices: ['danach', 'zuerst', 'trotzdem', 'damals'] },
      ' habe ich ihn plötzlich ',
      { kind: 'form', answer: 'gefunden', cue: 'finden', choices: ['gefunden', 'bezahlt', 'gekocht', 'angerufen'] },
      '.',
    ],
    chunks: [
      { targetText: 'Das ist eine lange Geschichte:', baseText: { en: 'It is a long story:' } },
      { targetText: 'Zuerst bin ich ausgestiegen,', baseText: { en: 'first I got off,' } },
      { targetText: 'aber mein Rucksack', baseText: { en: 'but my backpack' } },
      { targetText: 'war weg.', baseText: { en: 'was gone.' } },
    ],
    terms: [
      { targetText: 'die Geschichte', baseText: { en: 'the story' } },
      { targetText: 'in diesem Jahr', baseText: { en: 'this year' } },
      { targetText: 'ausgestiegen', baseText: { en: 'got off' } },
      { targetText: 'der Rucksack', baseText: { en: 'the backpack' } },
      { targetText: 'weg', baseText: { en: 'gone' } },
      { targetText: 'zurückfahren', baseText: { en: 'to go back' } },
      { targetText: 'plötzlich', baseText: { en: 'suddenly' } },
      { targetText: 'gefunden', baseText: { en: 'found' } },
    ],
    recall: { before: 'Das ist eine lange Geschichte: Zuerst bin ich ', answer: 'ausgestiegen', after: ', aber mein Rucksack war weg.', fallbackChoices: ['ausgestiegen', 'angerufen', 'bezahlt', 'gefunden'] },
    speakRequired: ['geschichte', 'ausgestiegen', 'rucksack'],
    sceneCaption: { en: 'Nele turns to you across the rooftop table and asks: “Was ist deine beste Geschichte in diesem Jahr?”' },
    trophyWord: { word: 'Geschichte', meaning: { en: 'story' }, example: 'Das ist eine lange Geschichte.', whyThisWord: { en: 'Geschichte is the word Nele asks for — the frame that turns your lost-backpack episode into an anecdote you can retell.' } },
    distractors: ['am Bahnhof gewartet', 'meinen Koffer gepackt'],
    placeholderCaption: { en: 'Friends share dinner on a rooftop as one leans in and asks for the year’s best story.' },
    songMood: 'a favorite train anecdote rising above a warm rooftop dinner',
    visualNotes: 'Rooftop dinner at dusk, city lights beyond the table, one friend inviting the other to tell a memorable story.',
  }),
]

export const GERMAN_B1_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeGermanB1PracticalLessons(
  GUIDED_TODAY_PATH_GERMAN_B1_ONE_METADATA,
  germanB1Practical1Inputs,
  { en: 'More B1 episodes are on the way.' },
)
