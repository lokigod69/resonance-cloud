/**
 * Indonesian A2 — the Regular tier (10 paths × 10 lessons), per
 * docs/Product/FABLE_A2_LEARNING_PATH_DESIGN.md (§4 integration, §5 authoring
 * contract) and the spec in tmp\A2_INDONESIAN_P1_P10_SPEC.md.
 *
 * Authoring contract highlights enforced in this module:
 * - Base locales are GERMAN + ENGLISH (matching Indonesian A1, baseLanguage
 *   'German'): every GuidedBaseContentText field carries both .de and .en.
 *   pedagogicalGoal is a German string (matching A1).
 * - Two-turn shape: sceneCaption carries the interlocutor's Indonesian line
 *   quoted inside both base-locale captions; the learner's corePhrase is the
 *   response.
 * - Register locked per path: Anda + Pak/Bu/Mbak/Mas with tolong/boleh/permisi
 *   in the service paths P1–P3, P5–P7, P9; kamu in the friend paths P4, P8,
 *   P10 — matching Indonesian A1's split. No mid-path switches. INDONESIAN,
 *   never Malay (awak, sila, tandas, macam mana are banned by the validator).
 * - Indonesian is ATEMPORAL — the tense contract lives in aspect/time markers,
 *   and every base tense must be licensed by an explicit target marker (the A1
 *   atemporal-target/past-base mismatch finding): past/completed = sudah/
 *   belum/tadi/kemarin/baru saja (P3/P9 + marked recycling); future = mau/
 *   akan/nanti/besok from P4. A bare unmarked verb takes present-tense bases.
 * - Loanword policy per lesson (the A1 "check-out" precedent): loanwords
 *   Indonesians actually use (reservasi, wifi, apotek, menu) are correct
 *   Indonesian — teach them; exemptions from anti-loanword review are granted
 *   per lesson id, never globally.
 * - karena is the only subordinator; comparatives = lebih + adjective (P2),
 *   superlative = paling (P7).
 * - Trophies unique across the entire Indonesian guided corpus (A1 + A2),
 *   lowercase, single-word.
 * - TTS LIVE (2026-07-15, 498 clips / 0 failed, voice Gavrila — the guided
 *   pipeline has no gain post-processing, so Gavrila stays the only Indonesian
 *   voice): ALL path/lesson/chunk ids in this module are FROZEN — never rename
 *   them; text changes need scoped audio reruns.
 */
import type {
  GuidedBaseContentText,
  GuidedLessonDefinition,
  GuidedLessonStep,
  GuidedLessonTrophyWord,
  GuidedLessonVibeVariant,
  GuidedPathMetadata,
  LessonItem,
  PhraseChunk,
} from '../guidedLessons'
import { DEFAULT_GUIDED_VIBE_ID } from '../guidedVibes'

const INDONESIAN_A2_GUIDED_TODAY_STEPS: GuidedLessonStep[] = ['scene', 'matchPairs', 'build', 'type', 'speak', 'complete']

type IndonesianA2VariantInput = {
  corePhrase: GuidedLessonVibeVariant['corePhrase']
  meaning: GuidedBaseContentText
  chunks: PhraseChunk[]
  lessonItems: LessonItem[]
  buildChips: string[]
  typeRecall: GuidedLessonVibeVariant['typeRecall']
  speakTarget: Omit<GuidedLessonVibeVariant['speakTarget'], 'language' | 'passingThreshold' | 'maxRecordingSeconds'>
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

export type IndonesianA2LessonInput = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  variant: GuidedLessonVibeVariant
}

function makeBrightIndonesianA2Variant(input: IndonesianA2VariantInput): GuidedLessonVibeVariant {
  return {
    contentStatus: 'draft',
    corePhrase: input.corePhrase,
    meaning: input.meaning,
    chunks: input.chunks,
    lessonItems: input.lessonItems,
    build: {
      targetText: input.corePhrase.targetText,
      chips: input.buildChips,
    },
    typeRecall: input.typeRecall,
    speakTarget: {
      ...input.speakTarget,
      language: 'id-ID',
      // matches Indonesian A1's STT reality (0.65)
      passingThreshold: 0.65,
      maxRecordingSeconds: 12,
    },
    sceneCaption: input.sceneCaption,
    trophyWord: input.trophyWord,
    placeholderMedia: {
      type: 'video',
      caption: input.placeholderCaption,
    },
    songSeed: {
      genre: 'bright Indonesian acoustic',
      mood: input.songMood,
    },
    visualNotes: input.visualNotes,
  }
}

export function makeIndonesianA2PracticalLessons(
  metadata: GuidedPathMetadata,
  inputs: IndonesianA2LessonInput[],
  completionSituation: { de: string; en: string },
): GuidedLessonDefinition[] {
  const pathNumber = Number(metadata.id.replace('indonesian-a2-practical-', ''))

  return inputs.map((lessonInput, index) => {
    const lessonNumber = index + 1
    const globalNumber = String((pathNumber - 1) * 10 + lessonNumber).padStart(3, '0')
    const id = `indonesian-a2-practical-${pathNumber}-${globalNumber}-${lessonInput.slug}`
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
      steps: INDONESIAN_A2_GUIDED_TODAY_STEPS,
      estimatedMinutes: 5,
      fallbackVibeId: DEFAULT_GUIDED_VIBE_ID,
      status: 'active',
      nextLessonTeaser: {
        title: nextInput?.title ?? { de: 'Pfad abgeschlossen', en: 'Path complete' },
        situation: {
          de: nextInput?.situation.de ?? completionSituation.de,
          en: nextInput?.situation.en ?? completionSituation.en,
        },
      },
      vibeVariants: {
        bright: lessonInput.variant,
      },
    }
  })
}

export type IndonesianA2CompactLesson = {
  slug: string
  title: GuidedBaseContentText
  situation: GuidedLessonDefinition['situation']
  pedagogicalGoal: string
  targetText: string
  baseText: GuidedBaseContentText
  chunks: Array<{ targetText: string; baseText: GuidedBaseContentText }>
  /** alsoAccept: common alternate spellings (dimana, apotik, wifi) — folded into acceptedAnswers. */
  terms: Array<{ targetText: string; baseText: GuidedBaseContentText; alsoAccept?: string[] }>
  recall: { before: string; answer: string; after: string; fallbackChoices: string[]; alsoAccept?: string[] }
  /** Exactly the salient single words the speech check requires — never multi-word phrases, no apostrophes/hyphens (hyphenated loanwords like check-out split in the tokenizer; pick other words). */
  speakRequired: [string, string, string]
  sceneCaption: GuidedBaseContentText
  trophyWord: GuidedLessonTrophyWord
  distractors: [string, string]
  placeholderCaption: GuidedBaseContentText
  songMood: string
  visualNotes: string
}

/** Accepted-answer variants: exact, lowercase, capitalized, hyphen-fused (Wi-Fi → wifi) forms of the text plus every alsoAccept string. */
function indonesianA2Answers(text: string, alsoAccept: string[] = []): string[] {
  const variants = [text, ...alsoAccept].flatMap((value) => {
    const fused = value.replace(/-/g, '')
    return [value, value.toLowerCase(), fused, fused.toLowerCase()]
  })
  const capitalized = variants.map((value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`)
  return [...new Set([...variants, ...capitalized])]
}

function indonesianA2SpeakTokens(targetText: string, required: [string, string, string]): { requiredTokens: string[]; optionalTokens: string[] } {
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

export function makeIndonesianA2CompactLesson(input: IndonesianA2CompactLesson): IndonesianA2LessonInput {
  const prefix = input.slug.split('-')[0]
  const { alsoAccept: recallAlsoAccept, ...recall } = input.recall
  return {
    slug: input.slug,
    title: input.title,
    situation: input.situation,
    pedagogicalGoal: input.pedagogicalGoal,
    variant: makeBrightIndonesianA2Variant({
      corePhrase: { targetText: input.targetText, baseText: input.baseText },
      meaning: input.baseText,
      chunks: input.chunks.map((chunk, index) => ({ id: `${prefix}-${index + 1}`, ...chunk })),
      lessonItems: input.terms.map(({ alsoAccept, ...term }, index) => ({
        id: `${prefix}-item-${index + 1}`,
        ...term,
        acceptedAnswers: indonesianA2Answers(term.targetText, alsoAccept),
      })),
      buildChips: [...input.chunks.map((chunk) => chunk.targetText), ...input.distractors],
      typeRecall: {
        ...recall,
        acceptedAnswers: indonesianA2Answers(recall.answer, recallAlsoAccept),
      },
      speakTarget: {
        baseCue: input.baseText,
        targetPhrase: input.targetText,
        ...indonesianA2SpeakTokens(input.targetText, input.speakRequired),
      },
      sceneCaption: input.sceneCaption,
      trophyWord: input.trophyWord,
      placeholderCaption: input.placeholderCaption,
      songMood: input.songMood,
      visualNotes: input.visualNotes,
    }),
  }
}

export const GUIDED_TODAY_PATH_INDONESIAN_A2_ONE_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-1', title: 'Indonesisch A2 Praxis 1', shortTitle: 'A2 Praxis 1',
  subtitle: { de: 'Vertraute Alltagswege wiederaufnehmen und höflich nachfragen', en: 'Returning to familiar routines and asking polite follow-up questions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical1Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'seperti-biasa-kopi-susu', title: { de: 'Wie immer', en: 'The usual' },
    situation: { de: 'Die Barista erkennt dich im Stammcafé und fragt nach deiner üblichen Bestellung. Du bestätigst sie freundlich.', en: 'The barista recognizes you at your regular cafe and asks about your usual order. Confirm it politely.' },
    pedagogicalGoal: 'Eine vertraute Bestellung mit seperti biasa bestätigen und dabei die Menge nennen.',
    targetText: 'Ya, seperti biasa, satu kopi susu, Bu.', baseText: { de: 'Ja, wie üblich einen Milchkaffee, bitte.', en: 'Yes, the usual, one milk coffee, please.' },
    chunks: [{ targetText: 'Ya, seperti biasa,', baseText: { de: 'Ja, wie üblich,', en: 'Yes, as usual,' } }, { targetText: 'satu kopi susu,', baseText: { de: 'einen Milchkaffee,', en: 'one milk coffee,' } }, { targetText: 'Bu.', baseText: { de: 'bitte.', en: 'ma’am.' } }],
    terms: [{ targetText: 'seperti biasa', baseText: { de: 'wie üblich', en: 'as usual' } }, { targetText: 'kopi susu', baseText: { de: 'Milchkaffee', en: 'milk coffee' } }, { targetText: 'satu', baseText: { de: 'eins', en: 'one' } }, { targetText: 'pesanan', baseText: { de: 'Bestellung', en: 'order' } }, { targetText: 'Bu', baseText: { de: 'höfliche Anrede für eine Frau', en: 'polite address for a woman' } }],
    recall: { before: 'Ya, seperti ', answer: 'biasa', after: ', satu kopi susu, Bu.', fallbackChoices: ['biasa', 'mahal', 'panas', 'kosong'] }, speakRequired: ['biasa', 'kopi', 'susu'],
    sceneCaption: { de: 'Die Barista greift schon zur vertrauten Tasse und fragt: „Seperti biasa, kopi susu?“', en: 'The barista reaches for the familiar cup and asks: “Seperti biasa, kopi susu?”' },
    trophyWord: { word: 'biasa', meaning: { de: 'üblich, gewöhnlich', en: 'usual, ordinary' }, example: 'Saya datang pada waktu biasa.', whyThisWord: { de: 'Damit bestätigst du eine wiederkehrende Bestellung, ohne jedes Detail neu erklären zu müssen.', en: 'It lets you confirm a recurring order without explaining every detail again.' } },
    distractors: ['dua teh manis', 'tanpa gula hari ini'], placeholderCaption: { de: 'Die bekannte Milchkaffeetasse wartet auf dem Tresen deines Stammcafés.', en: 'The familiar milk-coffee cup waits on the counter of your regular cafe.' }, songMood: 'a warm acoustic return to a familiar morning cafe', visualNotes: 'Neighborhood cafe counter, familiar barista, one milk coffee cup and an easy nod of recognition.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kopi-susu-dibungkus', title: { de: 'Zum Mitnehmen', en: 'To go' },
    situation: { de: 'Die Barista fragt, ob du den Kaffee hier trinkst oder mitnimmst. Du wählst Mitnehmen und fragst nach dem Gesamtpreis.', en: 'The barista asks whether you will drink the coffee here or take it away. Choose takeaway and ask for the total.' },
    pedagogicalGoal: 'Mit dibungkus eine natürliche Mitnahmebestellung abschließen und nach der Gesamtsumme fragen.',
    targetText: 'Tolong kopi susunya dibungkus, Bu. Berapa semuanya?', baseText: { de: 'Den Milchkaffee bitte zum Mitnehmen. Wie viel kostet alles zusammen?', en: 'The milk coffee to go, please. How much is everything altogether?' },
    chunks: [{ targetText: 'Tolong kopi susunya', baseText: { de: 'Den Milchkaffee bitte', en: 'The milk coffee, please' } }, { targetText: 'dibungkus, Bu.', baseText: { de: 'zum Mitnehmen.', en: 'to go, ma’am.' } }, { targetText: 'Berapa semuanya?', baseText: { de: 'Wie viel kostet alles zusammen?', en: 'How much is everything?' } }],
    terms: [{ targetText: 'dibungkus', baseText: { de: 'eingepackt, zum Mitnehmen', en: 'wrapped, to go' } }, { targetText: 'kopi susu', baseText: { de: 'Milchkaffee', en: 'milk coffee' } }, { targetText: 'berapa', baseText: { de: 'wie viel', en: 'how much' } }, { targetText: 'semuanya', baseText: { de: 'alles zusammen', en: 'everything altogether' } }, { targetText: 'pembayaran', baseText: { de: 'Bezahlung', en: 'payment' } }],
    recall: { before: 'Tolong kopi susunya dibungkus, Bu. Berapa ', answer: 'semuanya', after: '?', fallbackChoices: ['semuanya', 'waktunya', 'orangnya', 'kamarnya'] }, speakRequired: ['kopi', 'dibungkus', 'semuanya'],
    sceneCaption: { de: 'Die Barista hält einen Becher und eine Tasse hoch und fragt: „Mau diminum di sini atau dibawa pulang?“', en: 'The barista holds up a cup and a mug and asks: “Mau diminum di sini atau dibawa pulang?”' },
    trophyWord: { word: 'semuanya', meaning: { de: 'alles, alles zusammen', en: 'everything, all of it' }, example: 'Berapa harga semuanya?', whyThisWord: { de: 'Das Wort fasst die ganze Bestellung für eine einzige klare Preisfrage zusammen.', en: 'The word gathers the whole order into one clear question about the price.' } },
    distractors: ['saya minum di sini', 'tambah satu roti'], placeholderCaption: { de: 'Ein Becher mit Deckel steht neben der Rechnung auf dem Cafétresen.', en: 'A lidded cup stands beside the receipt on the cafe counter.' }, songMood: 'a brisk takeaway rhythm with a neat final price check', visualNotes: 'Cafe counter with a takeaway cup, paper sleeve, payment display and the customer ready to leave.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'mencari-sim-dan-pulsa', title: { de: 'Verbindung fürs Handy', en: 'Phone connection' },
    situation: { de: 'In einem Telefonladen bietet ein Mitarbeiter Hilfe an. Du fragst nach einer SIM-Karte und Guthaben für dein Handy.', en: 'In a phone shop, a staff member offers help. Ask for a SIM card and phone credit.' },
    pedagogicalGoal: 'Mit permisi und mencari zwei konkrete Dinge in einem Geschäft erfragen.',
    targetText: 'Permisi, saya cari kartu SIM dan pulsa. Ada, Pak?', baseText: { de: 'Entschuldigen Sie, ich suche eine SIM-Karte und Guthaben. Führen Sie beides?', en: 'Excuse me, I am looking for a SIM card and phone credit. Do you carry both?' },
    chunks: [{ targetText: 'Permisi, saya cari', baseText: { de: 'Entschuldigen Sie, ich suche', en: 'Excuse me, I am looking for' } }, { targetText: 'kartu SIM dan pulsa.', baseText: { de: 'eine SIM-Karte und Guthaben.', en: 'a SIM card and phone credit.' } }, { targetText: 'Ada, Pak?', baseText: { de: 'Haben Sie das?', en: 'Do you have them, sir?' } }],
    terms: [{ targetText: 'permisi', baseText: { de: 'Entschuldigung', en: 'excuse me' } }, { targetText: 'cari', baseText: { de: 'suchen (gesprochen)', en: 'to look for (spoken)' } }, { targetText: 'kartu SIM', baseText: { de: 'SIM-Karte', en: 'SIM card' } }, { targetText: 'pulsa', baseText: { de: 'Handyguthaben', en: 'phone credit' } }, { targetText: 'ada', baseText: { de: 'vorhanden sein', en: 'to be available' } }],
    recall: { before: 'Permisi, saya cari kartu SIM dan ', answer: 'pulsa', after: '. Ada, Pak?', fallbackChoices: ['pulsa', 'permen', 'sabun', 'beras'] }, speakRequired: ['cari', 'kartu', 'pulsa'],
    sceneCaption: { de: 'Der Mitarbeiter zeigt auf die Handyartikel und fragt: „Ada yang bisa saya bantu?“', en: 'The staff member points to the phone accessories and asks: “Ada yang bisa saya bantu?”' },
    trophyWord: { word: 'pulsa', meaning: { de: 'Handyguthaben', en: 'phone credit' }, example: 'Saya perlu isi pulsa hari ini.', whyThisWord: { de: 'Dieses Alltagswort brauchst du am Schalter, wenn dein lokales Handy wieder Guthaben benötigt.', en: 'You need this everyday word at the counter when your local phone needs more credit.' } },
    distractors: ['saya butuh payung', 'dua tiket bus'], placeholderCaption: { de: 'SIM-Karten und Guthabenkarten hängen geordnet hinter dem Ladentresen.', en: 'SIM cards and phone-credit vouchers hang neatly behind the shop counter.' }, songMood: 'a practical acoustic pulse for getting connected in the city', visualNotes: 'Bright phone shop, SIM packages, top-up cards and a helpful male clerk pointing to the right shelf.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'jalan-kaki-berapa-menit', title: { de: 'Wie viele Minuten?', en: 'How many minutes?' },
    situation: { de: 'Ein Passant sagt nur, dein Ziel sei ganz in der Nähe. Du fragst nach der Gehzeit.', en: 'A passer-by only says your destination is very close. Ask how long it takes on foot.' },
    pedagogicalGoal: 'Eine ungenaue Entfernungsangabe mit berapa menit konkretisieren.',
    targetText: 'Pak, dari sini jalan kaki berapa menit?', baseText: { de: 'Wie viele Minuten sind es von hier zu Fuß?', en: 'Sir, how many minutes is it on foot from here?' },
    chunks: [{ targetText: 'Pak, dari sini', baseText: { de: 'von hier', en: 'sir, from here' } }, { targetText: 'jalan kaki', baseText: { de: 'zu Fuß', en: 'on foot' } }, { targetText: 'berapa menit?', baseText: { de: 'wie viele Minuten?', en: 'how many minutes?' } }],
    terms: [{ targetText: 'dari sini', baseText: { de: 'von hier', en: 'from here' } }, { targetText: 'jalan kaki', baseText: { de: 'zu Fuß gehen', en: 'to walk' } }, { targetText: 'berapa menit', baseText: { de: 'wie viele Minuten', en: 'how many minutes' } }, { targetText: 'dekat', baseText: { de: 'nah', en: 'near' } }, { targetText: 'arah', baseText: { de: 'Richtung', en: 'direction' } }],
    recall: { before: 'Pak, dari sini jalan kaki berapa ', answer: 'menit', after: '?', fallbackChoices: ['menit', 'kilo', 'hari', 'meter'] }, speakRequired: ['jalan', 'kaki', 'menit'],
    sceneCaption: { de: 'Der Passant zeigt die Straße hinunter und sagt: „Dekat saja dari sini.“', en: 'The passer-by points down the street and says: “Dekat saja dari sini.”' },
    trophyWord: { word: 'menit', meaning: { de: 'Minute', en: 'minute' }, example: 'Perjalanannya hanya sepuluh menit.', whyThisWord: { de: 'Mit dieser Zeiteinheit wird aus einer vagen Wegbeschreibung eine brauchbare Gehzeit.', en: 'This unit of time turns a vague direction into a useful walking estimate.' } },
    distractors: ['naik bus dua halte', 'belok setelah jembatan'], placeholderCaption: { de: 'Ein gerader Gehweg führt vom Straßenschild zu einem nahen Ziel.', en: 'A straight sidewalk leads from the street sign toward a nearby destination.' }, songMood: 'a light walking beat for turning vague directions into a clear estimate', visualNotes: 'Indonesian street corner, male passer-by pointing ahead, shaded sidewalk and a destination sign in the distance.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'boleh-minta-bon', title: { de: 'Die Rechnung, bitte', en: 'The bill, please' },
    situation: { de: 'Nach dem Essen fragt die Bedienung, ob es schmeckt. Du antwortest positiv und bittest um die Rechnung.', en: 'After the meal, the server asks whether the food tastes good. Answer positively and ask for the bill.' },
    pedagogicalGoal: 'Eine Servicefrage beantworten und mit boleh minta höflich um die Rechnung bitten.',
    targetText: 'Ya, makanannya enak. Boleh minta bonnya, Bu?', baseText: { de: 'Ja, das Essen schmeckt. Könnte ich bitte die Rechnung haben?', en: 'Yes, the food is delicious. May I have the bill, please?' },
    chunks: [{ targetText: 'Ya, makanannya enak.', baseText: { de: 'Ja, das Essen schmeckt.', en: 'Yes, the food is delicious.' } }, { targetText: 'Boleh minta', baseText: { de: 'Könnte ich bitte', en: 'May I ask for' } }, { targetText: 'bonnya, Bu?', baseText: { de: 'die Rechnung haben?', en: 'the bill, ma’am?' } }],
    terms: [{ targetText: 'makanannya', baseText: { de: 'das Essen', en: 'the food' } }, { targetText: 'enak', baseText: { de: 'lecker', en: 'delicious' } }, { targetText: 'boleh minta', baseText: { de: 'dürfte ich um etwas bitten', en: 'may I ask for' } }, { targetText: 'bonnya', baseText: { de: 'die Rechnung', en: 'the bill' } }, { targetText: 'pelayan', baseText: { de: 'Bedienung', en: 'server' } }],
    recall: { before: 'Ya, makanannya enak. Boleh minta ', answer: 'bonnya', after: ', Bu?', fallbackChoices: ['bonnya', 'menunya', 'kursinya', 'pintunya'] }, speakRequired: ['makanannya', 'boleh', 'bonnya'],
    sceneCaption: { de: 'Die Bedienung räumt den Teller ab und fragt: „Makanannya enak, Pak?“', en: 'The server clears the plate and asks: “Makanannya enak, Pak?”' },
    trophyWord: { word: 'boleh', meaning: { de: 'dürfen, möglich sein', en: 'may, to be allowed' }, example: 'Boleh saya duduk di sini?', whyThisWord: { de: 'Das Wort macht deine Bitte um die Rechnung freundlich und zurückhaltend.', en: 'The word makes your request for the bill friendly and considerate.' } },
    distractors: ['tambah satu porsi', 'saya belum selesai'], placeholderCaption: { de: 'Ein leerer Teller und eine geschlossene Rechnungsmappe liegen auf dem Restauranttisch.', en: 'An empty plate and a closed bill folder rest on the restaurant table.' }, songMood: 'a relaxed meal ending with one polished request', visualNotes: 'Small restaurant table after lunch, female server clearing a plate and a bill folder ready nearby.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'reservasi-atas-nama-martin', title: { de: 'Unter dem Namen Martin', en: 'Under the name Martin' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin nach dem Namen der Reservierung. Du nennst ihn klar.', en: 'At hotel reception, the receptionist asks for the name on the reservation. State it clearly.' },
    pedagogicalGoal: 'Eine vorhandene Reservierung mit permisi und atas nama eindeutig zuordnen.',
    targetText: 'Permisi, saya ada reservasi atas nama Martin, Bu.', baseText: { de: 'Entschuldigen Sie, ich habe eine Reservierung auf den Namen Martin.', en: 'Excuse me, I have a reservation under the name Martin, ma’am.' },
    chunks: [{ targetText: 'Permisi, saya ada reservasi', baseText: { de: 'Entschuldigen Sie, ich habe eine Reservierung', en: 'Excuse me, I have a reservation' } }, { targetText: 'atas nama Martin,', baseText: { de: 'auf den Namen Martin,', en: 'under the name Martin,' } }, { targetText: 'Bu.', baseText: { de: 'bitte.', en: 'ma’am.' } }],
    terms: [{ targetText: 'permisi', baseText: { de: 'Entschuldigung', en: 'excuse me' } }, { targetText: 'ada reservasi', baseText: { de: 'eine Reservierung haben', en: 'to have a reservation' } }, { targetText: 'atas nama', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'resepsionis', baseText: { de: 'Rezeptionistin', en: 'receptionist' } }, { targetText: 'kamar', baseText: { de: 'Zimmer', en: 'room' } }],
    recall: { before: 'Permisi, saya ada ', answer: 'reservasi', after: ' atas nama Martin, Bu.', fallbackChoices: ['reservasi', 'sarapan', 'handuk', 'lift'] }, speakRequired: ['permisi', 'reservasi', 'nama'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Buchungsliste und fragt: „Reservasinya atas nama siapa, Pak?“', en: 'The receptionist opens the booking list and asks: “Reservasinya atas nama siapa, Pak?”' },
    trophyWord: { word: 'permisi', meaning: { de: 'Entschuldigung, darf ich', en: 'excuse me, may I' }, example: 'Permisi, meja resepsionis di mana?', whyThisWord: { de: 'Mit diesem höflichen Einstieg bekommst du an einem vollen Empfangstresen freundlich Aufmerksamkeit.', en: 'This polite opener gets someone’s attention courteously at a busy reception desk.' } },
    distractors: ['saya mencari restoran', 'kamar untuk dua orang'], placeholderCaption: { de: 'Eine Buchungsliste und eine Schlüsselkarte liegen auf dem Hotelrezeptionstresen.', en: 'A booking list and key card sit on the hotel reception counter.' }, songMood: 'a calm hotel check-in with a clear name on the booking', visualNotes: 'Hotel reception, female receptionist, open booking screen, key card and luggage beside the guest.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'jadi-berapa-semuanya', title: { de: 'Sonst nichts', en: 'Nothing else' },
    situation: { de: 'In der Apotheke fragt die Apothekerin, ob du noch etwas brauchst. Du verneinst und fragst nach dem Gesamtpreis.', en: 'At the pharmacy, the pharmacist asks whether you need anything else. Decline and ask for the total price.' },
    pedagogicalGoal: 'Einen Einkauf mit tidak ada lagi abschließen und nach dem Gesamtpreis fragen.',
    targetText: 'Tidak ada lagi, Bu. Jadi, berapa semuanya?', baseText: { de: 'Sonst nichts, danke. Wie viel kostet dann alles zusammen?', en: 'Nothing else, ma’am. So, how much is everything?' },
    chunks: [{ targetText: 'Tidak ada lagi, Bu.', baseText: { de: 'Sonst nichts, danke.', en: 'Nothing else, ma’am.' } }, { targetText: 'Jadi, berapa', baseText: { de: 'Wie viel kostet dann', en: 'So, how much is' } }, { targetText: 'semuanya?', baseText: { de: 'alles zusammen?', en: 'everything?' } }],
    terms: [{ targetText: 'tidak ada lagi', baseText: { de: 'sonst nichts', en: 'nothing else' } }, { targetText: 'jadi', baseText: { de: 'also, dann', en: 'so, then' } }, { targetText: 'berapa semuanya', baseText: { de: 'wie viel kostet alles', en: 'how much is everything' } }, { targetText: 'apoteker', baseText: { de: 'Apothekerin oder Apotheker', en: 'pharmacist' } }, { targetText: 'obat', baseText: { de: 'Medikament', en: 'medicine' } }],
    recall: { before: 'Tidak ada lagi, Bu. ', answer: 'Jadi', after: ', berapa semuanya?', fallbackChoices: ['Jadi', 'Namun', 'Bahkan', 'Sebaliknya'] }, speakRequired: ['tidak', 'jadi', 'semuanya'],
    sceneCaption: { de: 'Die Apothekerin stellt die letzte Schachtel auf den Tresen und fragt: „Ada lagi yang Anda perlukan, Pak?“', en: 'The pharmacist places the last box on the counter and asks: “Ada lagi yang Anda perlukan, Pak?”' },
    trophyWord: { word: 'jadi', meaning: { de: 'also, dann', en: 'so, then' }, example: 'Jadi, saya bayar di kasir ini.', whyThisWord: { de: 'Das Wort leitet nach der letzten Nachfrage natürlich zur abschließenden Gesamtsumme über.', en: 'The word naturally moves from the final offer to the closing question about the total.' } },
    distractors: ['tambah obat batuk', 'saya pakai kartu'], placeholderCaption: { de: 'Mehrere kleine Arzneischachteln liegen neben dem Kartenleser der Apotheke.', en: 'Several small medicine boxes sit beside the pharmacy card reader.' }, songMood: 'a tidy pharmacy checkout with a clear closing question', visualNotes: 'Neighborhood pharmacy, female pharmacist, medicine boxes grouped beside a payment terminal.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'halte-di-ujung-jalan', title: { de: 'Am Ende der Straße', en: 'At the end of the street' },
    situation: { de: 'Ein Tourist fragt dich nach der Bushaltestelle. Du gibst eine kurze Wegauskunft.', en: 'A tourist asks you where the bus stop is. Give a short direction.' },
    pedagogicalGoal: 'Mit ujung jalan einen sichtbaren Zielpunkt in einer knappen Wegauskunft nennen.',
    targetText: 'Halte bus ada di ujung jalan ini, Pak.', baseText: { de: 'Die Bushaltestelle ist am Ende dieser Straße.', en: 'The bus stop is at the end of this street, sir.' },
    chunks: [{ targetText: 'Halte bus', baseText: { de: 'die Bushaltestelle', en: 'the bus stop' } }, { targetText: 'ada di ujung', baseText: { de: 'ist am Ende', en: 'is at the end' } }, { targetText: 'jalan ini, Pak.', baseText: { de: 'dieser Straße.', en: 'of this street, sir.' } }],
    terms: [{ targetText: 'halte bus', baseText: { de: 'Bushaltestelle', en: 'bus stop' } }, { targetText: 'ujung jalan', baseText: { de: 'Straßenende', en: 'end of the street' } }, { targetText: 'ada', baseText: { de: 'sich befinden', en: 'to be located' } }, { targetText: 'lurus', baseText: { de: 'geradeaus', en: 'straight ahead' } }, { targetText: 'peta', baseText: { de: 'Stadtplan', en: 'map' } }],
    recall: { before: 'Halte bus ada di ', answer: 'ujung', after: ' jalan ini, Pak.', fallbackChoices: ['ujung', 'tengah', 'dalam', 'bawah'] }, speakRequired: ['halte', 'ujung', 'jalan'],
    sceneCaption: { de: 'Ein Tourist hält seinen Stadtplan hoch und fragt: „Permisi, halte bus di mana?“', en: 'A tourist holds up his map and asks: “Permisi, halte bus di mana?”' },
    trophyWord: { word: 'ujung', meaning: { de: 'Ende, äußerster Punkt', en: 'end, far edge' }, example: 'Toko itu ada di ujung jalan.', whyThisWord: { de: 'Das Wort liefert einem Besucher einen klaren Orientierungspunkt, den er leicht wiedererkennt.', en: 'The word gives a visitor a clear landmark that is easy to recognize.' } },
    distractors: ['belok kiri di lampu', 'naik bus nomor dua'], placeholderCaption: { de: 'Ein Bushaltestellenschild ist am fernen Ende einer geraden Straße zu sehen.', en: 'A bus-stop sign is visible at the far end of a straight street.' }, songMood: 'a friendly street-side acoustic cue with a destination in sight', visualNotes: 'Straight city street, male tourist with map, bus-stop sign visible at the far end.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'setengah-kilo-jeruk', title: { de: 'Obst für die Tüte', en: 'Fruit for the bag' },
    situation: { de: 'Die Markthändlerin fragt nach der Menge der Orangen. Du nennst die Menge und fügst Mangos hinzu.', en: 'The market vendor asks how many oranges you want. State the amount and add mangoes.' },
    pedagogicalGoal: 'Eine kleine Marktmenge mit setengah kilo nennen und einen zweiten Artikel ergänzen.',
    targetText: 'Setengah kilo jeruk, Bu. Dua mangga juga.', baseText: { de: 'Ein halbes Kilo Orangen, bitte. Dazu zwei Mangos.', en: 'Half a kilo of oranges, ma’am. Two mangoes as well.' },
    chunks: [{ targetText: 'Setengah kilo', baseText: { de: 'ein halbes Kilo', en: 'half a kilo' } }, { targetText: 'jeruk, Bu.', baseText: { de: 'Orangen, bitte.', en: 'of oranges, ma’am.' } }, { targetText: 'Dua mangga juga.', baseText: { de: 'Dazu zwei Mangos.', en: 'Two mangoes as well.' } }],
    terms: [{ targetText: 'setengah kilo', baseText: { de: 'ein halbes Kilo', en: 'half a kilo' } }, { targetText: 'jeruk', baseText: { de: 'Orange', en: 'orange' } }, { targetText: 'dua mangga', baseText: { de: 'zwei Mangos', en: 'two mangoes' } }, { targetText: 'juga', baseText: { de: 'auch, ebenfalls', en: 'also, as well' } }, { targetText: 'timbangan', baseText: { de: 'Waage', en: 'scale' } }],
    recall: { before: 'Setengah kilo ', answer: 'jeruk', after: ', Bu. Dua mangga juga.', fallbackChoices: ['jeruk', 'apel', 'pisang', 'tomat'] }, speakRequired: ['setengah', 'jeruk', 'mangga'],
    sceneCaption: { de: 'Die Markthändlerin hält die Tüte unter die Waage und fragt: „Berapa kilo jeruknya, Pak?“', en: 'The market vendor holds the bag under the scale and asks: “Berapa kilo jeruknya, Pak?”' },
    trophyWord: { word: 'setengah', meaning: { de: 'halb', en: 'half' }, example: 'Saya beli setengah kilo tomat.', whyThisWord: { de: 'Mit diesem Mengenwort kaufst du auf dem Markt eine realistische kleine Portion statt eines ganzen Kilos.', en: 'This quantity word lets you buy a realistic small portion at the market instead of a full kilo.' } },
    distractors: ['satu kilo apel', 'tanpa kantong plastik'], placeholderCaption: { de: 'Orangen liegen auf einer Marktwaage, daneben warten zwei reife Mangos.', en: 'Oranges sit on a market scale with two ripe mangoes waiting beside them.' }, songMood: 'a colorful market groove measured in small useful amounts', visualNotes: 'Outdoor fruit stall, female vendor, oranges on a scale, two mangoes and an open paper bag.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'mulai-kenal-daerah', title: { de: 'Schon vertrauter', en: 'More familiar now' },
    situation: { de: 'Ein älterer Nachbar fragt, wie du dich im Viertel zurechtfindest. Du sagst, dass du die Gegend langsam kennst.', en: 'An older neighbor asks how you are finding the neighborhood. Say that you are starting to know the area.' },
    pedagogicalGoal: 'Mit mulai einen gegenwärtigen Fortschritt im neuen Viertel ausdrücken.',
    targetText: 'Baik, Pak. Saya mulai kenal daerah ini.', baseText: { de: 'Gut, danke. Ich lerne diese Gegend langsam kennen.', en: 'Good, sir. I am starting to know this area.' },
    chunks: [{ targetText: 'Baik, Pak.', baseText: { de: 'Gut, danke.', en: 'Good, sir.' } }, { targetText: 'Saya mulai kenal', baseText: { de: 'Ich lerne langsam kennen', en: 'I am starting to know' } }, { targetText: 'daerah ini.', baseText: { de: 'diese Gegend.', en: 'this area.' } }],
    terms: [{ targetText: 'baik', baseText: { de: 'gut', en: 'good' } }, { targetText: 'mulai', baseText: { de: 'anfangen, allmählich', en: 'to begin, starting to' } }, { targetText: 'kenal', baseText: { de: 'kennen', en: 'to know, be familiar with' } }, { targetText: 'daerah', baseText: { de: 'Gegend', en: 'area' } }, { targetText: 'tetangga', baseText: { de: 'Nachbarin oder Nachbar', en: 'neighbor' } }],
    recall: { before: 'Baik, Pak. Saya mulai ', answer: 'kenal', after: ' daerah ini.', fallbackChoices: ['kenal', 'beli', 'bawa', 'sewa'] }, speakRequired: ['mulai', 'kenal', 'daerah'],
    sceneCaption: { de: 'Der ältere Nachbar bleibt am Gartentor stehen und fragt: „Apa kabar? Mulai kenal daerah ini?“', en: 'The older neighbor pauses at the garden gate and asks: “Apa kabar? Mulai kenal daerah ini?”' },
    trophyWord: { word: 'mulai', meaning: { de: 'anfangen, beginnen', en: 'to start, begin' }, example: 'Saya mulai hafal jalan ke pasar.', whyThisWord: { de: 'Das Wort zeigt dem Nachbarn, dass dein Alltag im Viertel gerade vertrauter wird.', en: 'The word shows your neighbor that daily life in the area is becoming more familiar.' } },
    distractors: ['saya mencari alamat', 'rumah saya jauh'], placeholderCaption: { de: 'Zwei Nachbarn sprechen am Gartentor einer ruhigen Wohnstraße miteinander.', en: 'Two neighbors talk at the garden gate on a quiet residential street.' }, songMood: 'a warm neighborhood refrain about slowly feeling at home', visualNotes: 'Residential lane, older male neighbor at a garden gate, familiar shops visible down the street.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_1_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_ONE_METADATA, indonesianA2Practical1Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 1 abgeschlossen und kannst vertraute Alltagsgespräche höflich weiterführen.', en: 'You have completed Indonesian A2 Practical 1 and can politely continue familiar everyday exchanges.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_TWO_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-2', title: 'Indonesisch A2 Praxis 2', shortTitle: 'A2 Praxis 2',
  subtitle: { de: 'Auswählen, vergleichen und Entscheidungen freundlich begründen', en: 'Choosing, comparing, and giving polite reasons for decisions' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical2Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'yang-ini-lebih-murah', title: { de: 'Dieses, weil es günstiger ist', en: 'This one, because it is cheaper' },
    situation: { de: 'Auf dem Markt zeigt die Händlerin zwei Sorten Tomaten. Du wählst die günstigere Sorte.', en: 'At the market, the vendor shows you two kinds of tomatoes. Choose the cheaper kind.' },
    pedagogicalGoal: 'Mit yang ini und lebih murah eine sichtbare Auswahl begründen.',
    targetText: 'Yang ini saja, Bu, karena harganya lebih murah.', baseText: { de: 'Nur diese hier, bitte, weil der Preis günstiger ist.', en: 'Just these, ma’am, because the price is lower.' },
    chunks: [{ targetText: 'Yang ini saja, Bu,', baseText: { de: 'Nur diese hier, bitte,', en: 'Just these, ma’am,' } }, { targetText: 'karena harganya', baseText: { de: 'weil der Preis', en: 'because the price' } }, { targetText: 'lebih murah.', baseText: { de: 'günstiger ist.', en: 'is lower.' } }],
    terms: [{ targetText: 'yang ini', baseText: { de: 'diese hier', en: 'these ones' } }, { targetText: 'lebih murah', baseText: { de: 'günstiger', en: 'cheaper' } }, { targetText: 'memilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'harga', baseText: { de: 'Preis', en: 'price' } }, { targetText: 'tomat', baseText: { de: 'Tomate', en: 'tomato' } }],
    recall: { before: 'Yang ini saja, Bu, karena harganya lebih ', answer: 'murah', after: '.', fallbackChoices: ['murah', 'berat', 'jauh', 'kosong'] }, speakRequired: ['saja', 'harganya', 'murah'],
    sceneCaption: { de: 'Die Markthändlerin hält zwei Tomatensorten hoch und fragt: „Tomat yang merah atau yang hijau, Pak?“', en: 'The market vendor holds up two kinds of tomatoes and asks: “Tomat yang merah atau yang hijau, Pak?”' },
    trophyWord: { word: 'murah', meaning: { de: 'günstig, billig', en: 'cheap, inexpensive' }, example: 'Tomat di pasar ini murah.', whyThisWord: { de: 'Dieses Adjektiv liefert auf dem Markt einen klaren und alltagstauglichen Grund für deine Wahl.', en: 'This adjective gives a clear, practical reason for your choice at the market.' } },
    distractors: ['yang hijau semua', 'dua kilo kentang'], placeholderCaption: { de: 'Zwei Tomatensorten mit unterschiedlichen Preisschildern liegen am Marktstand.', en: 'Two kinds of tomatoes with different price signs sit on the market stall.' }, songMood: 'a bright market comparison carried by a simple acoustic hook', visualNotes: 'Fruit-and-vegetable stall, female vendor holding red and green tomatoes, two clear price cards.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'es-teh-lebih-dingin', title: { de: 'Heute etwas Kaltes', en: 'Something cold today' },
    situation: { de: 'Im kleinen Lokal bietet der Wirt wie üblich warmen Tee an. Heute wählst du Eistee und begründest den Wechsel.', en: 'At the small eatery, the owner offers warm tea as usual. Today choose iced tea and explain the change.' },
    pedagogicalGoal: 'Eine heutige Getränkewahl mit karena und lebih dingin begründen.',
    targetText: 'Hari ini saya pilih es teh, Pak, karena lebih dingin.', baseText: { de: 'Heute wähle ich Eistee, weil er kälter ist.', en: 'Today I choose iced tea, sir, because it is colder.' },
    chunks: [{ targetText: 'Hari ini saya pilih', baseText: { de: 'Heute wähle ich', en: 'Today I choose' } }, { targetText: 'es teh, Pak,', baseText: { de: 'Eistee,', en: 'iced tea, sir,' } }, { targetText: 'karena lebih dingin.', baseText: { de: 'weil er kälter ist.', en: 'because it is colder.' } }],
    terms: [{ targetText: 'hari ini', baseText: { de: 'heute', en: 'today' } }, { targetText: 'es teh', baseText: { de: 'Eistee', en: 'iced tea' } }, { targetText: 'pilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'lebih dingin', baseText: { de: 'kälter', en: 'colder' } }, { targetText: 'warung', baseText: { de: 'kleines Lokal', en: 'small eatery' } }],
    recall: { before: 'Hari ini saya pilih es teh, Pak, karena lebih ', answer: 'dingin', after: '.', fallbackChoices: ['dingin', 'panas', 'manis', 'kental'] }, speakRequired: ['pilih', 'teh', 'dingin'],
    sceneCaption: { de: 'Der Wirt greift nach der Teekanne und fragt: „Teh hangat seperti biasa, Pak?“', en: 'The owner reaches for the teapot and asks: “Teh hangat seperti biasa, Pak?”' },
    trophyWord: { word: 'dingin', meaning: { de: 'kalt', en: 'cold' }, example: 'Es tehnya masih dingin.', whyThisWord: { de: 'Damit begründest du den Getränkwechsel durch genau die Eigenschaft, die du heute suchst.', en: 'It explains the drink change with the exact quality you want today.' } },
    distractors: ['kopi hitam panas', 'tambah gula sedikit'], placeholderCaption: { de: 'Ein Glas Eistee steht neben einer dampfenden Teekanne auf dem Tresen.', en: 'A glass of iced tea stands beside a steaming teapot on the counter.' }, songMood: 'a cool plucked-guitar switch on a warm afternoon', visualNotes: 'Open-front warung, male owner with teapot, iced tea glass catching light and heat outside.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'baju-biru-lebih-pas', title: { de: 'Das blaue Hemd', en: 'The blue shirt' },
    situation: { de: 'In einem Kleidungsgeschäft zeigt dir die Verkäuferin ein blaues und ein schwarzes Hemd. Du wählst das besser sitzende.', en: 'In a clothing shop, the saleswoman shows you a blue shirt and a black one. Choose the one that fits better.' },
    pedagogicalGoal: 'Farbe und Passform mit karena ukurannya lebih pas zu einer Entscheidung verbinden.',
    targetText: 'Bu, saya pilih baju biru karena ukurannya lebih pas.', baseText: { de: 'Ich wähle das blaue Hemd, weil die Größe besser passt.', en: 'Ma’am, I choose the blue shirt because the size fits better.' },
    chunks: [{ targetText: 'Bu, saya pilih', baseText: { de: 'Ich wähle, bitte,', en: 'Ma’am, I choose' } }, { targetText: 'baju biru', baseText: { de: 'das blaue Hemd', en: 'the blue shirt' } }, { targetText: 'karena ukurannya lebih pas.', baseText: { de: 'weil die Größe besser passt.', en: 'because the size fits better.' } }],
    terms: [{ targetText: 'baju biru', baseText: { de: 'blaues Hemd', en: 'blue shirt' } }, { targetText: 'ukurannya', baseText: { de: 'seine Größe', en: 'its size' } }, { targetText: 'lebih pas', baseText: { de: 'passender', en: 'a better fit' } }, { targetText: 'pilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'ruang ganti', baseText: { de: 'Umkleidekabine', en: 'fitting room' } }],
    recall: { before: 'Bu, saya pilih baju biru karena ukurannya lebih ', answer: 'pas', after: '.', fallbackChoices: ['pas', 'besar', 'panjang', 'sempit'] }, speakRequired: ['baju', 'biru', 'pas'],
    sceneCaption: { de: 'Die Verkäuferin hält zwei Hemden vor den Spiegel und fragt: „Baju biru atau baju hitam, Pak?“', en: 'The saleswoman holds two shirts by the mirror and asks: “Baju biru atau baju hitam, Pak?”' },
    trophyWord: { word: 'pas', meaning: { de: 'passend, genau richtig', en: 'fitting, just right' }, example: 'Ukuran sepatu ini pas untuk saya.', whyThisWord: { de: 'Das kurze Wort benennt den entscheidenden Grund, warum ein Kleidungsstück besser sitzt.', en: 'This short word names the key reason one item of clothing fits better.' } },
    distractors: ['celana hitam itu', 'ukuran besar saja'], placeholderCaption: { de: 'Ein blaues und ein schwarzes Hemd hängen neben dem Spiegel einer Umkleide.', en: 'A blue shirt and a black shirt hang beside a fitting-room mirror.' }, songMood: 'a neat boutique rhythm for a confident choice of color and fit', visualNotes: 'Compact clothing shop, female sales clerk, blue and black shirts, mirror and size tags.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'soto-lebih-ringan', title: { de: 'Die leichtere Mahlzeit', en: 'The lighter meal' },
    situation: { de: 'Die Bedienung bietet ein schweres Reisgericht und Soto an. Du wählst die leichtere, nicht scharfe Mahlzeit.', en: 'The server offers a heavy rice dish and soto. Choose the lighter, non-spicy meal.' },
    pedagogicalGoal: 'Eine Speisewahl mit zwei einfachen Eigenschaften und karena begründen.',
    targetText: 'Bu, saya pilih soto karena lebih ringan dan tidak pedas.', baseText: { de: 'Ich wähle Soto, weil es leichter und nicht scharf ist.', en: 'Ma’am, I choose soto because it is lighter and not spicy.' },
    chunks: [{ targetText: 'Bu, saya pilih soto', baseText: { de: 'Ich wähle Soto, bitte,', en: 'Ma’am, I choose soto' } }, { targetText: 'karena lebih ringan', baseText: { de: 'weil es leichter ist', en: 'because it is lighter' } }, { targetText: 'dan tidak pedas.', baseText: { de: 'und nicht scharf.', en: 'and not spicy.' } }],
    terms: [{ targetText: 'soto', baseText: { de: 'indonesische Suppe', en: 'Indonesian soup' } }, { targetText: 'lebih ringan', baseText: { de: 'leichter', en: 'lighter' } }, { targetText: 'tidak pedas', baseText: { de: 'nicht scharf', en: 'not spicy' } }, { targetText: 'kuah', baseText: { de: 'Brühe', en: 'broth' } }, { targetText: 'hidangan', baseText: { de: 'Gericht', en: 'dish' } }],
    recall: { before: 'Bu, saya pilih soto karena lebih ', answer: 'ringan', after: ' dan tidak pedas.', fallbackChoices: ['ringan', 'berat', 'asin', 'manis'] }, speakRequired: ['soto', 'ringan', 'pedas'],
    sceneCaption: { de: 'Die Bedienung zeigt auf zwei Bilder in der Karte und fragt: „Bapak mau rendang atau soto?“', en: 'The server points to two pictures on the menu and asks: “Bapak mau rendang atau soto?”' },
    trophyWord: { word: 'ringan', meaning: { de: 'leicht, nicht schwer', en: 'light, not heavy' }, example: 'Saya suka makan siang yang ringan.', whyThisWord: { de: 'Damit beschreibst du eine Mahlzeit, die weniger schwer ist und besser zu deinem Wunsch passt.', en: 'It describes a meal that feels less heavy and suits what you want.' } },
    distractors: ['rendang dengan nasi', 'tambah sambal merah'], placeholderCaption: { de: 'Eine Schale Soto steht neben einem reichhaltigen Reisgericht auf der Speisekarte.', en: 'A bowl of soto appears beside a rich rice dish on the menu.' }, songMood: 'a gentle lunchtime pattern for choosing the lighter bowl', visualNotes: 'Restaurant menu with soto and rendang photos, female server waiting beside the table.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'roti-lebih-segar', title: { de: 'Das frischere Brot', en: 'The fresher bread' },
    situation: { de: 'Der Bäcker zeigt auf zwei Brotregale. Du wählst das Brot, das heute frischer ist.', en: 'The baker points to two bread shelves. Choose the bread that is fresher today.' },
    pedagogicalGoal: 'Mit yang ini saja und lebih segar eine Auswahl in der Bäckerei treffen.',
    targetText: 'Yang ini saja, Pak, karena rotinya lebih segar hari ini.', baseText: { de: 'Nur dieses hier, bitte, weil das Brot heute frischer ist.', en: 'Just this one, sir, because the bread is fresher today.' },
    chunks: [{ targetText: 'Yang ini saja, Pak,', baseText: { de: 'Nur dieses hier, bitte,', en: 'Just this one, sir,' } }, { targetText: 'karena rotinya lebih segar', baseText: { de: 'weil das Brot frischer ist', en: 'because the bread is fresher' } }, { targetText: 'hari ini.', baseText: { de: 'heute.', en: 'today.' } }],
    terms: [{ targetText: 'yang ini saja', baseText: { de: 'nur dieses hier', en: 'just this one' } }, { targetText: 'rotinya', baseText: { de: 'das Brot', en: 'the bread' } }, { targetText: 'lebih segar', baseText: { de: 'frischer', en: 'fresher' } }, { targetText: 'rak atas', baseText: { de: 'oberes Regal', en: 'upper shelf' } }, { targetText: 'toko roti', baseText: { de: 'Bäckerei', en: 'bakery' } }],
    recall: { before: 'Yang ini saja, Pak, karena rotinya lebih ', answer: 'segar', after: ' hari ini.', fallbackChoices: ['segar', 'keras', 'kering', 'gelap'] }, speakRequired: ['rotinya', 'segar', 'hari'],
    sceneCaption: { de: 'Der Bäcker deutet auf zwei Regale und fragt: „Roti yang ini atau yang di rak atas, Pak?“', en: 'The baker points to two shelves and asks: “Roti yang ini atau yang di rak atas, Pak?”' },
    trophyWord: { word: 'saja', meaning: { de: 'nur, einfach', en: 'just, only' }, example: 'Saya pesan satu porsi saja.', whyThisWord: { de: 'Das Wort macht deine Auswahl knapp und höflich, wenn du genau ein Brot möchtest.', en: 'The word keeps your choice concise and polite when you want exactly one loaf.' } },
    distractors: ['roti dari rak bawah', 'dua kue cokelat'], placeholderCaption: { de: 'Zwei Brotregale stehen unter warmem Licht, eines mit frischen Laiben.', en: 'Two bread shelves sit under warm light, one filled with fresh loaves.' }, songMood: 'a cozy bakery cadence centered on one fresh loaf', visualNotes: 'Neighborhood bakery, male baker pointing between two shelves, fresh bread under warm lights.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'ojek-lebih-cepat', title: { de: 'Der schnellere Weg', en: 'The faster way' },
    situation: { de: 'Ein Hotelmitarbeiter fragt, ob du Bus oder Motorradtaxi nehmen möchtest. Du wählst die schnellere Möglichkeit.', en: 'A hotel staff member asks whether you want to take the bus or a motorcycle taxi. Choose the faster option.' },
    pedagogicalGoal: 'Zwei Verkehrsmittel mit lebih cepat vergleichen und eines begründet wählen.',
    targetText: 'Saya pilih ojek, Pak, karena sekarang lebih cepat.', baseText: { de: 'Ich nehme das Motorradtaxi, weil es jetzt schneller ist.', en: 'I choose the ojek, sir, because it is faster right now.' },
    chunks: [{ targetText: 'Saya pilih ojek, Pak,', baseText: { de: 'Ich nehme das Motorradtaxi,', en: 'I choose the ojek, sir,' } }, { targetText: 'karena sekarang', baseText: { de: 'weil jetzt', en: 'because right now' } }, { targetText: 'lebih cepat.', baseText: { de: 'es schneller ist.', en: 'it is faster.' } }],
    terms: [{ targetText: 'ojek', baseText: { de: 'Motorradtaxi', en: 'motorcycle taxi' } }, { targetText: 'pilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'lebih cepat', baseText: { de: 'schneller', en: 'faster' } }, { targetText: 'saat ini', baseText: { de: 'im Moment', en: 'right now' } }, { targetText: 'lalu lintas', baseText: { de: 'Verkehr', en: 'traffic' } }],
    recall: { before: 'Saya pilih ojek, Pak, karena sekarang lebih ', answer: 'cepat', after: '.', fallbackChoices: ['cepat', 'murah', 'nyaman', 'ramai'] }, speakRequired: ['ojek', 'cepat', 'sekarang'],
    sceneCaption: { de: 'Der Hotelmitarbeiter blickt auf den dichten Verkehr und fragt: „Anda mau naik bus atau ojek?“', en: 'The hotel staff member looks at the heavy traffic and asks: “Anda mau naik bus atau ojek?”' },
    trophyWord: { word: 'cepat', meaning: { de: 'schnell', en: 'fast' }, example: 'Ojek itu cepat di jalan ramai.', whyThisWord: { de: 'Dieses Adjektiv benennt den wichtigsten Vorteil deiner Verkehrswahl im dichten Stadtverkehr.', en: 'This adjective names the main advantage of your transport choice in heavy city traffic.' } },
    distractors: ['naik bus kota', 'jalan kaki saja'], placeholderCaption: { de: 'Ein Motorradtaxi wartet neben einem Bus im dichten Stadtverkehr.', en: 'A motorcycle taxi waits beside a bus in heavy city traffic.' }, songMood: 'a quick percussive acoustic ride through busy streets', visualNotes: 'Hotel entrance, male staff member, bus in traffic and an ojek waiting by the curb.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kamar-belakang-lebih-tenang', title: { de: 'Das ruhigere Zimmer', en: 'The quieter room' },
    situation: { de: 'Die Rezeptionistin bietet ein Zimmer vorn und eines hinten an. Du wählst das ruhigere zum Schlafen.', en: 'The receptionist offers a front room and a back room. Choose the quieter one for sleeping.' },
    pedagogicalGoal: 'Eine Zimmerwahl mit lebih tenang und einem einfachen Zweck begründen.',
    targetText: 'Saya pilih kamar belakang, Bu, karena lebih tenang untuk tidur.', baseText: { de: 'Ich wähle das hintere Zimmer, weil es zum Schlafen ruhiger ist.', en: 'I choose the back room, ma’am, because it is quieter for sleeping.' },
    chunks: [{ targetText: 'Saya pilih kamar belakang, Bu,', baseText: { de: 'Ich wähle das hintere Zimmer,', en: 'I choose the back room, ma’am,' } }, { targetText: 'karena lebih tenang', baseText: { de: 'weil es ruhiger ist', en: 'because it is quieter' } }, { targetText: 'untuk tidur.', baseText: { de: 'zum Schlafen.', en: 'for sleeping.' } }],
    terms: [{ targetText: 'kamar belakang', baseText: { de: 'hinteres Zimmer', en: 'back room' } }, { targetText: 'lebih tenang', baseText: { de: 'ruhiger', en: 'quieter' } }, { targetText: 'untuk tidur', baseText: { de: 'zum Schlafen', en: 'for sleeping' } }, { targetText: 'kamar depan', baseText: { de: 'vorderes Zimmer', en: 'front room' } }, { targetText: 'resepsionis', baseText: { de: 'Rezeptionistin', en: 'receptionist' } }],
    recall: { before: 'Saya pilih kamar belakang, Bu, karena lebih ', answer: 'tenang', after: ' untuk tidur.', fallbackChoices: ['tenang', 'sempit', 'gelap', 'mahal'] }, speakRequired: ['kamar', 'tenang', 'tidur'],
    sceneCaption: { de: 'Die Rezeptionistin legt zwei Schlüsselkarten hin und fragt: „Anda pilih kamar depan atau kamar belakang, Pak?“', en: 'The receptionist lays down two key cards and asks: “Anda pilih kamar depan atau kamar belakang, Pak?”' },
    trophyWord: { word: 'tenang', meaning: { de: 'ruhig', en: 'quiet, calm' }, example: 'Kamar belakang lebih tenang.', whyThisWord: { de: 'Damit nennst du genau die Eigenschaft, die für eine erholsame Nacht zählt.', en: 'It names the exact quality that matters for a restful night.' } },
    distractors: ['dekat lift utama', 'kamar lantai satu'], placeholderCaption: { de: 'Zwei Schlüsselkarten markieren ein vorderes und ein ruhiges hinteres Hotelzimmer.', en: 'Two key cards represent a front hotel room and a quiet back room.' }, songMood: 'a soft evening acoustic choice for a quiet night', visualNotes: 'Hotel reception, female receptionist, two room cards and a calm rear corridor beyond.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sandal-lebih-nyaman', title: { de: 'Die bequemeren Sandalen', en: 'The more comfortable sandals' },
    situation: { de: 'An einem Marktstand probierst du zwei Paar Sandalen. Du entscheidest dich für das bequemere Paar.', en: 'At a market stall, you try on two pairs of sandals. Choose the more comfortable pair.' },
    pedagogicalGoal: 'Tragekomfort mit rasanya lebih nyaman beschreiben und daraus eine Wahl machen.',
    targetText: 'Saya pilih sandal ini, Pak, karena rasanya lebih nyaman.', baseText: { de: 'Ich wähle diese Sandalen, weil sie sich bequemer anfühlen.', en: 'I choose these sandals, sir, because they feel more comfortable.' },
    chunks: [{ targetText: 'Saya pilih sandal ini, Pak,', baseText: { de: 'Ich wähle diese Sandalen,', en: 'I choose these sandals, sir,' } }, { targetText: 'karena rasanya', baseText: { de: 'weil sie sich', en: 'because they feel' } }, { targetText: 'lebih nyaman.', baseText: { de: 'bequemer anfühlen.', en: 'more comfortable.' } }],
    terms: [{ targetText: 'sandal', baseText: { de: 'Sandalen', en: 'sandals' } }, { targetText: 'rasanya', baseText: { de: 'es fühlt sich an', en: 'it feels' } }, { targetText: 'lebih nyaman', baseText: { de: 'bequemer', en: 'more comfortable' } }, { targetText: 'mencoba', baseText: { de: 'anprobieren', en: 'to try on' } }, { targetText: 'ukuran', baseText: { de: 'Größe', en: 'size' } }],
    recall: { before: 'Saya pilih sandal ini, Pak, karena rasanya lebih ', answer: 'nyaman', after: '.', fallbackChoices: ['nyaman', 'sempit', 'berat', 'kasar'] }, speakRequired: ['sandal', 'rasanya', 'nyaman'],
    sceneCaption: { de: 'Der Händler stellt zwei Paar auf die Matte und fragt: „Sandal mana yang terasa lebih pas, Pak?“', en: 'The vendor places two pairs on the mat and asks: “Sandal mana yang terasa lebih pas, Pak?”' },
    trophyWord: { word: 'nyaman', meaning: { de: 'bequem, angenehm', en: 'comfortable, pleasant' }, example: 'Sandal ini nyaman untuk berjalan.', whyThisWord: { de: 'Das Wort hilft dir, deine Wahl nach dem tatsächlichen Tragegefühl statt nur nach dem Aussehen zu treffen.', en: 'The word helps you choose by how something actually feels rather than only by appearance.' } },
    distractors: ['sepatu kulit hitam', 'ukuran yang besar'], placeholderCaption: { de: 'Zwei Paar Sandalen liegen auf einer Matte vor einem Marktspiegel.', en: 'Two pairs of sandals rest on a mat in front of a market mirror.' }, songMood: 'an easy walking groove for finding the comfortable pair', visualNotes: 'Market footwear stall, male vendor, two sandal pairs, floor mirror and a customer testing the fit.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'botol-kecil-lebih-murah', title: { de: 'Die kleinere Flasche', en: 'The smaller bottle' },
    situation: { de: 'Die Verkäuferin bietet eine große und eine kleine Flasche an. Du nimmst die kleinere, weil sie weniger kostet.', en: 'The clerk offers a large bottle and a small one. Take the smaller one because it costs less.' },
    pedagogicalGoal: 'Größe und Preis mit botol kecil und lebih murah in einer Wahl verbinden.',
    targetText: 'Saya pilih botol kecil, Bu, karena harganya lebih murah.', baseText: { de: 'Ich wähle die kleine Flasche, weil ihr Preis niedriger ist.', en: 'I choose the small bottle, ma’am, because its price is lower.' },
    chunks: [{ targetText: 'Saya pilih botol kecil, Bu,', baseText: { de: 'Ich wähle die kleine Flasche,', en: 'I choose the small bottle, ma’am,' } }, { targetText: 'karena harganya', baseText: { de: 'weil ihr Preis', en: 'because its price' } }, { targetText: 'lebih murah.', baseText: { de: 'niedriger ist.', en: 'is lower.' } }],
    terms: [{ targetText: 'botol kecil', baseText: { de: 'kleine Flasche', en: 'small bottle' } }, { targetText: 'harganya', baseText: { de: 'ihr Preis', en: 'its price' } }, { targetText: 'lebih murah', baseText: { de: 'günstiger', en: 'cheaper' } }, { targetText: 'botol besar', baseText: { de: 'große Flasche', en: 'large bottle' } }, { targetText: 'ukuran', baseText: { de: 'Größe', en: 'size' } }],
    recall: { before: 'Saya pilih botol ', answer: 'kecil', after: ', Bu, karena harganya lebih murah.', fallbackChoices: ['kecil', 'besar', 'panjang', 'tebal'] }, speakRequired: ['botol', 'kecil', 'harganya'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf zwei Größen und fragt: „Botol besar atau kecil, Pak?“', en: 'The clerk points to two sizes and asks: “Botol besar atau kecil, Pak?”' },
    trophyWord: { word: 'kecil', meaning: { de: 'klein', en: 'small' }, example: 'Saya membawa botol kecil.', whyThisWord: { de: 'Dieses Größenwort macht deutlich, welche Flasche du wegen des niedrigeren Preises auswählst.', en: 'This size word makes clear which bottle you choose because of the lower price.' } },
    distractors: ['botol kaca besar', 'dua gelas air'], placeholderCaption: { de: 'Eine kleine und eine große Flasche stehen mit klaren Preisen im Kühlregal.', en: 'A small and a large bottle stand in the cooler with clear prices.' }, songMood: 'a simple shop-floor comparison with a practical choice', visualNotes: 'Convenience-store cooler, female clerk pointing to two bottle sizes and visible price labels.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kafe-dekat-lebih-tenang', title: { de: 'Mein Lieblingsplatz', en: 'My favorite spot' },
    situation: { de: 'Ein älterer Nachbar fragt nach deinem Lieblingsort im Viertel. Du nennst das nahe, ruhigere Café.', en: 'An older neighbor asks about your favorite place in the neighborhood. Name the nearby, quieter cafe.' },
    pedagogicalGoal: 'Einen bevorzugten Ort mit karena und zwei einfachen Eigenschaften beschreiben.',
    targetText: 'Saya suka kafe ini, Pak, karena dekat dan lebih tenang.', baseText: { de: 'Ich mag dieses Café, weil es nah und ruhiger ist.', en: 'I like this cafe, sir, because it is close and quieter.' },
    chunks: [{ targetText: 'Saya suka kafe ini, Pak,', baseText: { de: 'Ich mag dieses Café,', en: 'I like this cafe, sir,' } }, { targetText: 'karena dekat', baseText: { de: 'weil es nah ist', en: 'because it is close' } }, { targetText: 'dan lebih tenang.', baseText: { de: 'und ruhiger.', en: 'and quieter.' } }],
    terms: [{ targetText: 'suka', baseText: { de: 'mögen', en: 'to like' } }, { targetText: 'kafe', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'dekat', baseText: { de: 'nah', en: 'close' } }, { targetText: 'lebih tenang', baseText: { de: 'ruhiger', en: 'quieter' } }, { targetText: 'daerah', baseText: { de: 'Gegend', en: 'area' } }],
    recall: { before: 'Saya suka kafe ini, Pak, karena ', answer: 'dekat', after: ' dan lebih tenang.', fallbackChoices: ['dekat', 'jauh', 'mahal', 'ramai'] }, speakRequired: ['kafe', 'dekat', 'tenang'],
    sceneCaption: { de: 'Der ältere Nachbar blickt über die kleine Ladenzeile und fragt: „Anda suka tempat mana di daerah ini?“', en: 'The older neighbor looks across the small row of shops and asks: “Anda suka tempat mana di daerah ini?”' },
    trophyWord: { word: 'dekat', meaning: { de: 'nah, in der Nähe', en: 'near, close' }, example: 'Kafe ini dekat dari rumah saya.', whyThisWord: { de: 'Die Nähe ist ein persönlicher, alltagstauglicher Grund, warum dieser Ort zu deinem Lieblingsplatz wird.', en: 'Proximity is a personal, practical reason this place becomes your favorite.' } },
    distractors: ['taman dekat sungai', 'pasar di pusat kota'], placeholderCaption: { de: 'Ein ruhiges Café liegt nur wenige Häuser vom Gartentor des Nachbarn entfernt.', en: 'A quiet cafe sits only a few doors from the neighbor’s garden gate.' }, songMood: 'a calm neighborhood theme for a favorite nearby cafe', visualNotes: 'Quiet cafe on a side street, older male neighbor pointing across a short row of shops.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_2_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_TWO_METADATA, indonesianA2Practical2Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 2 abgeschlossen und kannst Auswahlentscheidungen freundlich vergleichen und begründen.', en: 'You have completed Indonesian A2 Practical 2 and can compare choices and explain them politely.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_THREE_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-3', title: 'Indonesisch A2 Praxis 3', shortTitle: 'A2 Praxis 3',
  subtitle: { de: 'Erledigte Dinge mit klaren Zeit- und Aspektmarkern erzählen', en: 'Talking about completed events with clear time and aspect markers' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical3Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'saya-sudah-bayar', title: { de: 'Schon bezahlt', en: 'Already paid' },
    situation: { de: 'Die Kassiererin fragt, ob deine Zahlung abgeschlossen ist. Du bestätigst sie und zeigst den Beleg.', en: 'The cashier asks whether your payment is complete. Confirm it and show the receipt.' },
    pedagogicalGoal: 'Mit sudah ausdrücken, dass eine Zahlung bereits erledigt ist.',
    targetText: 'Saya sudah bayar, Bu. Ini struknya.', baseText: { de: 'Ich habe schon bezahlt. Hier ist der Kassenbon.', en: 'I have already paid, ma’am. Here is the receipt.' },
    chunks: [{ targetText: 'Saya sudah', baseText: { de: 'Ich habe schon', en: 'I have already' } }, { targetText: 'bayar, Bu.', baseText: { de: 'bezahlt.', en: 'paid, ma’am.' } }, { targetText: 'Ini struknya.', baseText: { de: 'Hier ist der Kassenbon.', en: 'Here is the receipt.' } }],
    terms: [{ targetText: 'sudah', baseText: { de: 'schon, bereits', en: 'already' } }, { targetText: 'bayar', baseText: { de: 'bezahlen', en: 'to pay' } }, { targetText: 'struknya', baseText: { de: 'der Kassenbon', en: 'the receipt' } }, { targetText: 'kasir', baseText: { de: 'Kassiererin oder Kassierer', en: 'cashier' } }, { targetText: 'pembayaran', baseText: { de: 'Zahlung', en: 'payment' } }],
    recall: { before: 'Saya sudah ', answer: 'bayar', after: ', Bu. Ini struknya.', fallbackChoices: ['bayar', 'pesan', 'cari', 'bawa'] }, speakRequired: ['sudah', 'bayar', 'struknya'],
    sceneCaption: { de: 'Die Kassiererin prüft das Terminal und fragt: „Pembayarannya sudah, Pak?“', en: 'The cashier checks the terminal and asks: “Pembayarannya sudah, Pak?”' },
    trophyWord: { word: 'sudah', meaning: { de: 'schon, bereits', en: 'already' }, example: 'Saya sudah makan siang.', whyThisWord: { de: 'Der Marker zeigt eindeutig, dass die Zahlung abgeschlossen ist und nicht mehr offensteht.', en: 'The marker makes clear that the payment is complete and no longer outstanding.' } },
    distractors: ['saya masih memilih', 'kartunya di tas'], placeholderCaption: { de: 'Ein Zahlungsbeleg liegt neben dem bestätigten Kartenterminal.', en: 'A payment receipt lies beside the confirmed card terminal.' }, songMood: 'a crisp completed cadence as the payment receipt appears', visualNotes: 'Checkout counter, female cashier, green terminal confirmation and a paper receipt in the customer hand.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tiba-kemarin-malam', title: { de: 'Gestern Abend angekommen', en: 'Arrived last night' },
    situation: { de: 'An der Hotelrezeption fragt die Mitarbeiterin, wann du in der Stadt angekommen bist. Du nennst den gestrigen Abend und die Uhrzeit.', en: 'At hotel reception, the receptionist asks when you arrived in the city. Give last night and the time.' },
    pedagogicalGoal: 'Mit kemarin malam eine Ankunft klar in der Vergangenheit verankern.',
    targetText: 'Saya tiba kemarin malam, Bu, sekitar jam delapan.', baseText: { de: 'Ich bin gestern Abend gegen acht Uhr angekommen.', en: 'I arrived last night at around eight, ma’am.' },
    chunks: [{ targetText: 'Saya tiba', baseText: { de: 'Ich bin angekommen', en: 'I arrived' } }, { targetText: 'kemarin malam, Bu,', baseText: { de: 'gestern Abend,', en: 'last night, ma’am,' } }, { targetText: 'sekitar jam delapan.', baseText: { de: 'gegen acht Uhr.', en: 'at around eight.' } }],
    terms: [{ targetText: 'tiba', baseText: { de: 'ankommen', en: 'to arrive' } }, { targetText: 'kemarin malam', baseText: { de: 'gestern Abend', en: 'last night' } }, { targetText: 'sekitar', baseText: { de: 'ungefähr, gegen', en: 'around, approximately' } }, { targetText: 'jam delapan', baseText: { de: 'acht Uhr', en: 'eight o’clock' } }, { targetText: 'kota', baseText: { de: 'Stadt', en: 'city' } }],
    recall: { before: 'Saya tiba ', answer: 'kemarin', after: ' malam, Bu, sekitar jam delapan.', fallbackChoices: ['kemarin', 'besok', 'sekarang', 'nanti'] }, speakRequired: ['tiba', 'kemarin', 'malam'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet das Ankunftsformular und fragt: „Kapan Anda tiba di kota ini, Pak?“', en: 'The receptionist opens the arrival form and asks: “Kapan Anda tiba di kota ini, Pak?”' },
    trophyWord: { word: 'kemarin', meaning: { de: 'gestern', en: 'yesterday' }, example: 'Kemarin saya makan di restoran itu.', whyThisWord: { de: 'Dieses Zeitwort setzt die Ankunft eindeutig in die Vergangenheit und beantwortet die Frage an der Rezeption direkt.', en: 'This time word clearly places the arrival in the past and directly answers reception’s question.' } },
    distractors: ['pagi jam tujuh', 'minggu di Jakarta'], placeholderCaption: { de: 'Ein Ankunftsformular zeigt neben dem Hoteltresen die Uhrzeit acht Uhr.', en: 'An arrival form at the hotel counter shows the time as eight o’clock.' }, songMood: 'an evening arrival theme with a clear timestamp', visualNotes: 'Hotel reception at night, female receptionist, arrival form, wall clock near eight and luggage at the desk.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sudah-pesan-nasi-goreng', title: { de: 'Schon bestellt', en: 'Already ordered' },
    situation: { de: 'Die Bedienung fragt, ob du noch auswählst. Du sagst, dass deine Bestellung ohne Sambal schon aufgenommen wurde.', en: 'The server asks whether you are still choosing. Say that your order without sambal has already been taken.' },
    pedagogicalGoal: 'Mit baru saja pesan eine unmittelbar zuvor erledigte Bestellung bestätigen.',
    targetText: 'Saya baru saja pesan nasi goreng, Bu, tanpa sambal.', baseText: { de: 'Ich habe gerade gebratenen Reis ohne Sambal bestellt.', en: 'I just ordered fried rice without sambal, ma’am.' },
    chunks: [{ targetText: 'Saya baru saja pesan', baseText: { de: 'Ich habe gerade bestellt', en: 'I just ordered' } }, { targetText: 'nasi goreng, Bu,', baseText: { de: 'gebratenen Reis,', en: 'fried rice, ma’am,' } }, { targetText: 'tanpa sambal.', baseText: { de: 'ohne Sambal.', en: 'without sambal.' } }],
    terms: [{ targetText: 'baru saja pesan', baseText: { de: 'gerade bestellt haben', en: 'to have just ordered' } }, { targetText: 'nasi goreng', baseText: { de: 'gebratener Reis', en: 'fried rice' } }, { targetText: 'tanpa sambal', baseText: { de: 'ohne Sambal', en: 'without sambal' } }, { targetText: 'memilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'pelayan', baseText: { de: 'Bedienung', en: 'server' } }],
    recall: { before: 'Saya baru saja ', answer: 'pesan', after: ' nasi goreng, Bu, tanpa sambal.', fallbackChoices: ['pesan', 'bayar', 'bawa', 'jual'] }, speakRequired: ['pesan', 'nasi', 'sambal'],
    sceneCaption: { de: 'Die Bedienung hält den Bestellblock bereit und fragt: „Bapak sudah memesan atau masih memilih?“', en: 'The server holds her order pad ready and asks: “Bapak sudah memesan atau masih memilih?”' },
    trophyWord: { word: 'pesan', meaning: { de: 'bestellen', en: 'to order' }, example: 'Saya pesan sup tanpa cabai.', whyThisWord: { de: 'Das Verb bestätigt genau die Handlung, die vor der Rückfrage der Bedienung schon abgeschlossen wurde.', en: 'The verb confirms the exact action that was completed before the server’s follow-up question.' } },
    distractors: ['masih membaca menu', 'minta sambal tambahan'], placeholderCaption: { de: 'Ein Bestellblock liegt neben dem markierten Gericht ohne Sambal.', en: 'An order pad rests beside the marked dish without sambal.' }, songMood: 'a settled restaurant phrase with the order already on the pad', visualNotes: 'Restaurant table, female server with order pad, fried-rice menu picture and a no-sambal note.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tadi-pagi-beli-buah', title: { de: 'Heute Morgen auf dem Markt', en: 'At the market this morning' },
    situation: { de: 'Eine Händlerin sieht deine Obsttüte und fragt, wann du sie gekauft hast. Du antwortest: heute Morgen.', en: 'A vendor sees your bag of fruit and asks when you bought it. Reply that you bought it this morning.' },
    pedagogicalGoal: 'Mit tadi pagi einen Kauf vom heutigen Morgen in der Vergangenheit verankern.',
    targetText: 'Tadi pagi saya beli buah di pasar, Bu.', baseText: { de: 'Heute Morgen habe ich auf dem Markt Obst gekauft.', en: 'I bought fruit at the market this morning, ma’am.' },
    chunks: [{ targetText: 'Tadi pagi', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: 'saya beli buah', baseText: { de: 'habe ich Obst gekauft', en: 'I bought fruit' } }, { targetText: 'di pasar, Bu.', baseText: { de: 'auf dem Markt.', en: 'at the market, ma’am.' } }],
    terms: [{ targetText: 'tadi pagi', baseText: { de: 'heute Morgen', en: 'this morning' } }, { targetText: 'beli', baseText: { de: 'kaufen', en: 'to buy' } }, { targetText: 'buah', baseText: { de: 'Obst', en: 'fruit' } }, { targetText: 'pasar', baseText: { de: 'Markt', en: 'market' } }, { targetText: 'pedagang', baseText: { de: 'Händlerin oder Händler', en: 'vendor' } }],
    recall: { before: 'Tadi pagi saya beli ', answer: 'buah', after: ' di pasar, Bu.', fallbackChoices: ['buah', 'roti', 'obat', 'baju'] }, speakRequired: ['pagi', 'beli', 'buah'],
    sceneCaption: { de: 'Die Händlerin sieht die volle Obsttüte und fragt: „Buah itu Bapak beli kapan?“', en: 'The vendor notices the full fruit bag and asks: “Buah itu Bapak beli kapan?”' },
    trophyWord: { word: 'buah', meaning: { de: 'Obst, Frucht', en: 'fruit' }, example: 'Buah di pasar itu manis.', whyThisWord: { de: 'Das Wort macht aus der Zeitangabe eine konkrete kleine Geschichte über deinen Einkauf am Morgen.', en: 'The word turns the time marker into a concrete little story about your morning shopping.' } },
    distractors: ['sayur dari toko', 'kopi dekat hotel'], placeholderCaption: { de: 'Eine Papiertüte mit Obst steht auf dem Marktstand im Morgenlicht.', en: 'A paper bag full of fruit sits on the market stall in the morning light.' }, songMood: 'a fresh morning-market motif tied to one completed purchase', visualNotes: 'Morning market, female vendor, fruit-filled paper bag and soft early sunlight across the stall.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tadi-belanja-di-pasar', title: { de: 'Vorhin eingekauft', en: 'Shopped earlier' },
    situation: { de: 'Eine Markthändlerin fragt, ob du noch einkaufen möchtest. Du erklärst, dass du vorhin schon einkaufen warst und jetzt nur schaust.', en: 'A market vendor asks whether you still want to shop. Explain that you shopped earlier and are only looking now.' },
    pedagogicalGoal: 'Mit tadi eine frühere Handlung am selben Tag von der Gegenwart abgrenzen.',
    targetText: 'Tadi saya belanja di pasar, Bu. Sekarang saya hanya lihat-lihat.', baseText: { de: 'Vorhin habe ich auf dem Markt eingekauft. Jetzt schaue ich mich nur um.', en: 'I shopped at the market earlier, ma’am. Now I am just looking around.' },
    chunks: [{ targetText: 'Tadi saya belanja', baseText: { de: 'Vorhin habe ich eingekauft', en: 'I shopped earlier' } }, { targetText: 'di pasar, Bu.', baseText: { de: 'auf dem Markt.', en: 'at the market, ma’am.' } }, { targetText: 'Sekarang saya hanya', baseText: { de: 'Jetzt schaue ich mich nur', en: 'Now I am just' } }, { targetText: 'lihat-lihat.', baseText: { de: 'um.', en: 'looking around.' } }],
    terms: [{ targetText: 'tadi', baseText: { de: 'vorhin', en: 'earlier today' } }, { targetText: 'belanja', baseText: { de: 'einkaufen', en: 'to shop' } }, { targetText: 'pasar', baseText: { de: 'Markt', en: 'market' } }, { targetText: 'hanya', baseText: { de: 'nur', en: 'only' } }, { targetText: 'lihat-lihat', baseText: { de: 'sich umsehen', en: 'to look around' } }],
    recall: { before: 'Tadi saya ', answer: 'belanja', after: ' di pasar, Bu. Sekarang saya hanya lihat-lihat.', fallbackChoices: ['belanja', 'bekerja', 'makan', 'tidur'] }, speakRequired: ['tadi', 'belanja', 'pasar'],
    sceneCaption: { de: 'Die Händlerin hält einen leeren Korb hin und fragt: „Masih mau belanja, Pak?“', en: 'The vendor holds out an empty basket and asks: “Masih mau belanja, Pak?”' },
    trophyWord: { word: 'belanja', meaning: { de: 'einkaufen', en: 'to shop' }, example: 'Saya belanja di pasar dekat rumah.', whyThisWord: { de: 'Das Verb erklärt, welche Handlung vorhin abgeschlossen wurde und warum du jetzt nichts mehr suchst.', en: 'The verb explains what you completed earlier and why you are no longer looking to buy.' } },
    distractors: ['mencari buah murah', 'membawa keranjang besar'], placeholderCaption: { de: 'Ein leerer Einkaufskorb steht vor einem Marktbesucher, der nur die Stände betrachtet.', en: 'An empty shopping basket sits before a market visitor who is only browsing the stalls.' }, songMood: 'a relaxed post-shopping stroll through the market', visualNotes: 'Market aisle, female vendor offering a basket, customer with purchases already bagged and looking around.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tadi-malam-kurang-tidur', title: { de: 'Zu wenig geschlafen', en: 'Not enough sleep' },
    situation: { de: 'Die Rezeptionistin fragt nach deiner Nacht. Du sagst, dass du wenig geschlafen hast, dich heute aber besser fühlst.', en: 'The receptionist asks about your night. Say that you did not sleep enough but feel better today.' },
    pedagogicalGoal: 'Mit tadi malam einen Schlafzustand in der vergangenen Nacht verankern und mit heute kontrastieren.',
    targetText: 'Tadi malam saya kurang tidur, Bu, tetapi hari ini lebih baik.', baseText: { de: 'Letzte Nacht habe ich zu wenig geschlafen, aber heute geht es mir besser.', en: 'I did not get enough sleep last night, ma’am, but today I feel better.' },
    chunks: [{ targetText: 'Tadi malam', baseText: { de: 'letzte Nacht', en: 'last night' } }, { targetText: 'saya kurang tidur, Bu,', baseText: { de: 'habe ich zu wenig geschlafen,', en: 'I did not get enough sleep, ma’am,' } }, { targetText: 'tetapi hari ini', baseText: { de: 'aber heute', en: 'but today' } }, { targetText: 'lebih baik.', baseText: { de: 'geht es mir besser.', en: 'I feel better.' } }],
    terms: [{ targetText: 'tadi malam', baseText: { de: 'letzte Nacht', en: 'last night' } }, { targetText: 'kurang tidur', baseText: { de: 'zu wenig schlafen', en: 'not to get enough sleep' } }, { targetText: 'hari ini', baseText: { de: 'heute', en: 'today' } }, { targetText: 'lebih baik', baseText: { de: 'besser', en: 'better' } }, { targetText: 'nyenyak', baseText: { de: 'tief und fest', en: 'soundly' } }],
    recall: { before: 'Tadi malam saya ', answer: 'kurang', after: ' tidur, Bu, tetapi hari ini lebih baik.', fallbackChoices: ['kurang', 'banyak', 'cukup', 'lama'] }, speakRequired: ['malam', 'kurang', 'tidur'],
    sceneCaption: { de: 'Die Rezeptionistin sieht dein müdes Gesicht und fragt: „Anda tidur nyenyak tadi malam, Pak?“', en: 'The receptionist notices your tired face and asks: “Anda tidur nyenyak tadi malam, Pak?”' },
    trophyWord: { word: 'kurang', meaning: { de: 'zu wenig, nicht genug', en: 'less, not enough' }, example: 'Hari ini saya kurang minum air.', whyThisWord: { de: 'Das Wort beschreibt präzise, warum die vergangene Nacht nicht erholsam war.', en: 'The word precisely explains why the previous night was not restful.' } },
    distractors: ['kamar terasa panas', 'sarapan mulai pagi'], placeholderCaption: { de: 'Ein zerknittertes Kissen liegt im Hotelzimmer, während Morgenlicht hereinfällt.', en: 'A rumpled pillow lies in the hotel room as morning light comes in.' }, songMood: 'a sleepy night phrase resolving into a brighter morning', visualNotes: 'Hotel lobby morning, female receptionist, tired guest, rumpled pillow visible through an open room door.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sudah-coba-soto-betawi', title: { de: 'Das lokale Gericht probiert', en: 'Tried the local dish' },
    situation: { de: 'Ein Kellner empfiehlt Soto Betawi. Du sagst, dass du das Gericht schon probiert hast und es dir schmeckt.', en: 'A waiter recommends Soto Betawi. Say that you have already tried it and like the taste.' },
    pedagogicalGoal: 'Mit sudah coba eine abgeschlossene erste Erfahrung mit einem Gericht ausdrücken.',
    targetText: 'Saya sudah coba soto Betawi, Pak. Rasanya enak.', baseText: { de: 'Ich habe Soto Betawi schon probiert. Es schmeckt gut.', en: 'I have already tried Soto Betawi, sir. It tastes good.' },
    chunks: [{ targetText: 'Saya sudah coba', baseText: { de: 'Ich habe schon probiert', en: 'I have already tried' } }, { targetText: 'soto Betawi, Pak.', baseText: { de: 'Soto Betawi.', en: 'Soto Betawi, sir.' } }, { targetText: 'Rasanya enak.', baseText: { de: 'Es schmeckt gut.', en: 'It tastes good.' } }],
    terms: [{ targetText: 'sudah coba', baseText: { de: 'schon probiert haben', en: 'to have already tried' } }, { targetText: 'soto Betawi', baseText: { de: 'Suppe nach Betawi-Art', en: 'Betawi-style soup' } }, { targetText: 'rasanya', baseText: { de: 'sein Geschmack', en: 'its taste' } }, { targetText: 'enak', baseText: { de: 'lecker', en: 'delicious' } }, { targetText: 'hidangan lokal', baseText: { de: 'lokales Gericht', en: 'local dish' } }],
    recall: { before: 'Saya sudah ', answer: 'coba', after: ' soto Betawi, Pak. Rasanya enak.', fallbackChoices: ['coba', 'pesan', 'bayar', 'jual'] }, speakRequired: ['coba', 'soto', 'rasanya'],
    sceneCaption: { de: 'Der Kellner zeigt auf die Spezialität der Karte und fragt: „Bapak mau coba soto Betawi?“', en: 'The waiter points to the house specialty and asks: “Bapak mau coba soto Betawi?”' },
    trophyWord: { word: 'coba', meaning: { de: 'probieren, versuchen', en: 'to try' }, example: 'Saya coba makanan lokal di pasar.', whyThisWord: { de: 'Das Verb benennt die abgeschlossene Erfahrung, auf die du bei einer Empfehlung zurückgreifen kannst.', en: 'The verb names the completed experience you can draw on when someone makes a recommendation.' } },
    distractors: ['belum membaca menu', 'minta hidangan lain'], placeholderCaption: { de: 'Eine dampfende Schale Soto Betawi steht neben der Spezialitätenkarte.', en: 'A steaming bowl of Soto Betawi sits beside the house-specialty menu.' }, songMood: 'a savory local melody for recognizing a dish already tasted', visualNotes: 'Restaurant table, male waiter pointing to Soto Betawi, steaming bowl and an approving guest expression.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'belum-lihat-kota-tua', title: { de: 'Die Altstadt noch nicht gesehen', en: 'Not seen the old town yet' },
    situation: { de: 'Die Rezeptionistin fragt, ob du die Altstadt schon gesehen hast. Du verneinst, möchtest aber hin.', en: 'The receptionist asks whether you have seen the old town. Say you have not, but want to go.' },
    pedagogicalGoal: 'Mit belum eine noch nicht gemachte Erfahrung ausdrücken.',
    targetText: 'Saya belum lihat kota tua, Bu, tetapi ingin ke sana.', baseText: { de: 'Ich habe die Altstadt noch nicht gesehen, möchte aber dorthin.', en: 'I have not seen the old town yet, ma’am, but I want to go there.' },
    chunks: [{ targetText: 'Saya belum lihat', baseText: { de: 'Ich habe noch nicht gesehen', en: 'I have not seen yet' } }, { targetText: 'kota tua, Bu,', baseText: { de: 'die Altstadt,', en: 'the old town, ma’am,' } }, { targetText: 'tetapi ingin', baseText: { de: 'möchte aber', en: 'but I want' } }, { targetText: 'ke sana.', baseText: { de: 'dorthin.', en: 'to go there.' } }],
    terms: [{ targetText: 'belum lihat', baseText: { de: 'noch nicht gesehen haben', en: 'not to have seen yet' } }, { targetText: 'kota tua', baseText: { de: 'Altstadt', en: 'old town' } }, { targetText: 'ingin', baseText: { de: 'möchten', en: 'to want' } }, { targetText: 'ke sana', baseText: { de: 'dorthin', en: 'there' } }, { targetText: 'wisata', baseText: { de: 'Besichtigung, Tourismus', en: 'sightseeing, tourism' } }],
    recall: { before: 'Saya ', answer: 'belum', after: ' lihat kota tua, Bu, tetapi ingin ke sana.', fallbackChoices: ['belum', 'sudah', 'sering', 'selalu'] }, speakRequired: ['belum', 'lihat', 'kota'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet einen Stadtplan und fragt: „Anda sudah lihat kota tua, Pak?“', en: 'The receptionist opens a city map and asks: “Anda sudah lihat kota tua, Pak?”' },
    trophyWord: { word: 'belum', meaning: { de: 'noch nicht', en: 'not yet' }, example: 'Saya belum makan malam.', whyThisWord: { de: 'Der Marker zeigt, dass der Besuch noch aussteht, ohne den Wunsch nach der Besichtigung aufzugeben.', en: 'The marker shows that the visit is still pending without giving up the wish to go.' } },
    distractors: ['sudah hafal jalannya', 'tidak suka museum'], placeholderCaption: { de: 'Ein Stadtplan zeigt die Altstadt als noch unbesuchtes Ziel.', en: 'A city map marks the old town as a destination not yet visited.' }, songMood: 'a curious open-ended motif for a place still waiting to be seen', visualNotes: 'Hotel desk, female receptionist opening a map, old-town district circled and the guest leaning closer.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kemarin-ke-museum', title: { de: 'Gestern im Museum', en: 'At the museum yesterday' },
    situation: { de: 'Ein Hotelmitarbeiter fragt, wohin du gestern gegangen bist. Du erzählst von einem langen Museumsbesuch.', en: 'A hotel staff member asks where you went yesterday. Tell him about a long museum visit.' },
    pedagogicalGoal: 'Mit kemarin und einer Ortsangabe einen abgeschlossenen Tagesbesuch erzählen.',
    targetText: 'Pak, kemarin saya ke museum dari pagi sampai siang.', baseText: { de: 'Gestern war ich vom Morgen bis zum Mittag im Museum.', en: 'Sir, I was at the museum from morning until noon yesterday.' },
    chunks: [{ targetText: 'Pak, kemarin saya', baseText: { de: 'Gestern war ich', en: 'Sir, yesterday I was' } }, { targetText: 'ke museum', baseText: { de: 'im Museum', en: 'at the museum' } }, { targetText: 'dari pagi sampai siang.', baseText: { de: 'vom Morgen bis zum Mittag.', en: 'from morning until noon.' } }],
    terms: [{ targetText: 'kemarin', baseText: { de: 'gestern', en: 'yesterday' } }, { targetText: 'ke museum', baseText: { de: 'ins Museum', en: 'to the museum' } }, { targetText: 'dari pagi', baseText: { de: 'vom Morgen an', en: 'from the morning' } }, { targetText: 'sampai siang', baseText: { de: 'bis zum Mittag', en: 'until noon' } }, { targetText: 'pameran', baseText: { de: 'Ausstellung', en: 'exhibition' } }],
    recall: { before: 'Pak, kemarin saya ke ', answer: 'museum', after: ' dari pagi sampai siang.', fallbackChoices: ['museum', 'pasar', 'pantai', 'kantor'] }, speakRequired: ['kemarin', 'museum', 'pagi'],
    sceneCaption: { de: 'Der Hotelmitarbeiter sieht den Museumsprospekt und fragt: „Kemarin Anda pergi ke mana?“', en: 'The hotel staff member notices the museum brochure and asks: “Kemarin Anda pergi ke mana?”' },
    trophyWord: { word: 'museum', meaning: { de: 'Museum', en: 'museum' }, example: 'Museum itu punya pameran foto.', whyThisWord: { de: 'Der Ort macht deine gestrige Zeitangabe zu einer konkreten Erzählung über den Tag.', en: 'The place turns your time marker into a concrete account of the day.' } },
    distractors: ['hanya satu jam', 'naik bus merah'], placeholderCaption: { de: 'Ein Museumsprospekt und eine Eintrittskarte liegen auf dem Hoteltresen.', en: 'A museum brochure and admission ticket rest on the hotel counter.' }, songMood: 'a reflective daytime motif stretching from morning to noon', visualNotes: 'Hotel lobby, male staff member, museum brochure and ticket, morning-to-noon timeline on a small map.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minggu-ini-sudah-banyak', title: { de: 'Eine volle Woche', en: 'A full week' },
    situation: { de: 'Eine bekannte Markthändlerin fragt, wie deine Woche war. Du fasst deine vielen Wege und Lernmomente zusammen.', en: 'A familiar market vendor asks how your week has been. Sum up your many outings and learning moments.' },
    pedagogicalGoal: 'Mit minggu ini und sudah viele abgeschlossene Erlebnisse der Woche zusammenfassen.',
    targetText: 'Minggu ini saya sudah banyak jalan-jalan dan belajar, Bu.', baseText: { de: 'Diese Woche habe ich schon viel unternommen und gelernt.', en: 'This week I have already done a lot of sightseeing and studying, ma’am.' },
    chunks: [{ targetText: 'Minggu ini', baseText: { de: 'Diese Woche', en: 'This week' } }, { targetText: 'saya sudah banyak jalan-jalan', baseText: { de: 'habe ich schon viel unternommen', en: 'I have already done a lot of sightseeing' } }, { targetText: 'dan belajar, Bu.', baseText: { de: 'und gelernt.', en: 'and studying, ma’am.' } }],
    terms: [{ targetText: 'minggu ini', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'sudah banyak', baseText: { de: 'schon viel', en: 'already a lot' } }, { targetText: 'jalan-jalan', baseText: { de: 'Ausflüge machen', en: 'to go sightseeing' } }, { targetText: 'belajar', baseText: { de: 'lernen', en: 'to study' } }, { targetText: 'pengalaman', baseText: { de: 'Erfahrung', en: 'experience' } }],
    recall: { before: 'Minggu ini saya sudah ', answer: 'banyak', after: ' jalan-jalan dan belajar, Bu.', fallbackChoices: ['banyak', 'sedikit', 'jarang', 'cukup'] }, speakRequired: ['minggu', 'banyak', 'belajar'],
    sceneCaption: { de: 'Die bekannte Händlerin reicht dir die Tüte und fragt: „Bagaimana minggu Anda, Pak?“', en: 'The familiar vendor hands over your bag and asks: “Bagaimana minggu Anda, Pak?”' },
    trophyWord: { word: 'banyak', meaning: { de: 'viel, viele', en: 'much, many, a lot' }, example: 'Di kota ini ada banyak tempat menarik.', whyThisWord: { de: 'Das Mengenwort bündelt mehrere abgeschlossene Erlebnisse zu einem natürlichen Wochenrückblick.', en: 'The quantity word gathers several completed experiences into a natural review of the week.' } },
    distractors: ['hanya duduk di hotel', 'mencari satu alamat'], placeholderCaption: { de: 'Markttüten, ein Stadtplan und ein Lernheft liegen als Erinnerungen an die Woche zusammen.', en: 'Market bags, a city map, and a study notebook sit together as memories of the week.' }, songMood: 'a satisfied weekly recap with footsteps and study notes in the rhythm', visualNotes: 'Familiar market stall, female vendor handing over a bag, city map and small language notebook visible.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_3_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_THREE_METADATA, indonesianA2Practical3Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 3 abgeschlossen und kannst erledigte Alltagserlebnisse mit klaren Zeitmarkern erzählen.', en: 'You have completed Indonesian A2 Practical 3 and can describe completed everyday events with clear time markers.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_FOUR_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-4', title: 'Indonesisch A2 Praxis 4', shortTitle: 'A2 Praxis 4',
  subtitle: { de: 'Mit einem Freund Pläne machen, ändern und freundlich absagen', en: 'Making, changing, and politely declining plans with a friend' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical4Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'bagaimana-kalau-nanti', title: { de: 'Kaffee um sieben', en: 'Coffee at seven' },
    situation: { de: 'Deine Nachbarin ist inzwischen eine Freundin und lädt dich auf einen Kaffee ein. Du schlägst eine Uhrzeit vor.', en: 'Your neighbor has become a friend and invites you for coffee. Suggest a time.' },
    pedagogicalGoal: 'Mit Bagaimana kalau und nanti einen gemeinsamen Zeitpunkt vorschlagen.',
    targetText: 'Bagaimana kalau kita minum kopi nanti jam tujuh? Kamu bisa?', baseText: { de: 'Wie wäre es, wenn wir später um sieben Kaffee trinken? Kannst du da?', en: 'How about coffee later at seven? Can you make it?' },
    chunks: [{ targetText: 'Bagaimana kalau kita minum kopi', baseText: { de: 'Wie wäre es, wenn wir Kaffee trinken', en: 'How about having coffee' } }, { targetText: 'nanti jam tujuh?', baseText: { de: 'später um sieben?', en: 'later at seven?' } }, { targetText: 'Kamu bisa?', baseText: { de: 'Kannst du da?', en: 'Can you make it?' } }],
    terms: [{ targetText: 'bagaimana kalau', baseText: { de: 'wie wäre es, wenn', en: 'how about' } }, { targetText: 'minum kopi', baseText: { de: 'Kaffee trinken', en: 'to have coffee' } }, { targetText: 'nanti', baseText: { de: 'später', en: 'later' } }, { targetText: 'jam tujuh', baseText: { de: 'um sieben Uhr', en: 'at seven o’clock' } }, { targetText: 'bisa', baseText: { de: 'können, Zeit haben', en: 'can, be able to make it' } }],
    recall: { before: '', answer: 'Bagaimana', after: ' kalau kita minum kopi nanti jam tujuh? Kamu bisa?', fallbackChoices: ['Bagaimana', 'Kapan', 'Mengapa', 'Berapa'] }, speakRequired: ['minum', 'kopi', 'tujuh'],
    sceneCaption: { de: 'Deine Freundin lächelt vom Gartentor herüber und fragt: „Kamu mau minum kopi kapan?“', en: 'Your friend smiles over from the garden gate and asks: “Kamu mau minum kopi kapan?”' },
    trophyWord: { word: 'bagaimana', meaning: { de: 'wie, wie wäre es', en: 'how, how about' }, example: 'Bagaimana kalau kita makan di kafe itu?', whyThisWord: { de: 'Damit verwandelst du eine Einladung in einen freundlichen, konkreten Gegenvorschlag.', en: 'It turns an invitation into a friendly, concrete counterproposal.' } },
    distractors: ['saya minum teh', 'kopinya sangat panas'], placeholderCaption: { de: 'Zwei Kaffeetassen und eine Uhr mit sieben Uhr stehen auf einem kleinen Gartentisch.', en: 'Two coffee cups and a clock showing seven sit on a small garden table.' }, songMood: 'a friendly evening invitation with a light question-and-answer rhythm', visualNotes: 'Residential garden gate, two friends, coffee cups and a clear seven-o’clock cue in warm evening light.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'besok-mau-ke-museum', title: { de: 'Morgen ins Museum', en: 'Museum tomorrow' },
    situation: { de: 'Dein Freund fragt nach deinen Plänen für morgen. Du erzählst von deinem Museumsbesuch und lädst ihn ein.', en: 'Your friend asks about your plans for tomorrow. Tell him about your museum visit and invite him along.' },
    pedagogicalGoal: 'Mit besok und mau einen morgigen Plan ausdrücken und mit ikut eine Einladung ergänzen.',
    targetText: 'Besok saya mau ke museum. Kamu mau ikut?', baseText: { de: 'Morgen möchte ich ins Museum. Möchtest du mitkommen?', en: 'I am going to the museum tomorrow. Do you want to come along?' },
    chunks: [{ targetText: 'Besok saya mau', baseText: { de: 'Morgen möchte ich', en: 'Tomorrow I am going' } }, { targetText: 'ke museum.', baseText: { de: 'ins Museum.', en: 'to the museum.' } }, { targetText: 'Kamu mau ikut?', baseText: { de: 'Möchtest du mitkommen?', en: 'Do you want to come along?' } }],
    terms: [{ targetText: 'besok', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'mau', baseText: { de: 'möchten, vorhaben', en: 'to want, be going to' } }, { targetText: 'ke museum', baseText: { de: 'ins Museum', en: 'to the museum' } }, { targetText: 'ikut', baseText: { de: 'mitkommen', en: 'to come along' } }, { targetText: 'rencana', baseText: { de: 'Plan', en: 'plan' } }],
    recall: { before: 'Besok saya mau ke museum. Kamu mau ', answer: 'ikut', after: '?', fallbackChoices: ['ikut', 'pulang', 'bekerja', 'memasak'] }, speakRequired: ['besok', 'museum', 'ikut'],
    sceneCaption: { de: 'Dein Freund klappt seinen Kalender auf und fragt: „Besok kamu ada rencana apa?“', en: 'Your friend opens his calendar and asks: “Besok kamu ada rencana apa?”' },
    trophyWord: { word: 'ikut', meaning: { de: 'mitkommen, teilnehmen', en: 'to come along, join' }, example: 'Kamu mau ikut ke pasar?', whyThisWord: { de: 'Mit diesem Verb wird aus deinem eigenen Plan eine unkomplizierte Einladung an einen Freund.', en: 'This verb turns your own plan into an easy invitation for a friend.' } },
    distractors: ['hari ini ke pasar', 'museum dekat hotel'], placeholderCaption: { de: 'Ein Kalender mit dem morgigen Datum liegt neben zwei Museumskarten.', en: 'A calendar marked for tomorrow lies beside two museum tickets.' }, songMood: 'an upbeat next-day plan with room for a friend to join', visualNotes: 'Two friends with an open calendar, museum brochure and two ticket-shaped placeholders.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'mau-menonton-hari-jumat', title: { de: 'Film am Freitag', en: 'A film on Friday' },
    situation: { de: 'Eine Freundin erzählt dir von einem neuen Film. Du fragst, ob sie am Freitagabend mitkommen möchte.', en: 'A friend tells you about a new film. Ask whether she wants to go on Friday evening.' },
    pedagogicalGoal: 'Mit mau und Bagaimana kalau einen Kinoplan für Freitag vorschlagen.',
    targetText: 'Kamu mau menonton film hari Jumat? Bagaimana kalau malam?', baseText: { de: 'Möchtest du am Freitag einen Film sehen? Wie wäre es am Abend?', en: 'Do you want to watch a film on Friday? How about the evening?' },
    chunks: [{ targetText: 'Kamu mau menonton film', baseText: { de: 'Möchtest du einen Film sehen', en: 'Do you want to watch a film' } }, { targetText: 'hari Jumat?', baseText: { de: 'am Freitag?', en: 'on Friday?' } }, { targetText: 'Bagaimana kalau malam?', baseText: { de: 'Wie wäre es am Abend?', en: 'How about the evening?' } }],
    terms: [{ targetText: 'menonton', baseText: { de: 'ansehen', en: 'to watch' } }, { targetText: 'film', baseText: { de: 'Film', en: 'film' } }, { targetText: 'hari Jumat', baseText: { de: 'am Freitag', en: 'on Friday' } }, { targetText: 'malam', baseText: { de: 'Abend', en: 'evening' } }, { targetText: 'tertarik', baseText: { de: 'interessiert', en: 'interested' } }],
    recall: { before: 'Kamu mau ', answer: 'menonton', after: ' film hari Jumat? Bagaimana kalau malam?', fallbackChoices: ['menonton', 'membaca', 'membeli', 'mencuci'] }, speakRequired: ['menonton', 'film', 'jumat'],
    sceneCaption: { de: 'Deine Freundin zeigt dir das Filmplakat und sagt: „Ada film baru minggu ini. Kamu tertarik?“', en: 'Your friend shows you the film poster and says: “Ada film baru minggu ini. Kamu tertarik?”' },
    trophyWord: { word: 'menonton', meaning: { de: 'anschauen, ansehen', en: 'to watch' }, example: 'Kami menonton film pada Jumat malam.', whyThisWord: { de: 'Das Verb benennt die gemeinsame Aktivität und macht den Wochenplan sofort verständlich.', en: 'The verb names the shared activity and makes the weekly plan immediately clear.' } },
    distractors: ['hari Sabtu pagi', 'makan di warung'], placeholderCaption: { de: 'Ein Filmplakat hängt neben einem Kalender, auf dem Freitagabend markiert ist.', en: 'A film poster hangs beside a calendar with Friday evening marked.' }, songMood: 'a playful cinema invitation with a Friday-night lift', visualNotes: 'Two friends by a cinema poster, Friday highlighted on a phone calendar, evening city lights.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'bertemu-di-pintu-mal', title: { de: 'Am Eingang treffen', en: 'Meet at the entrance' },
    situation: { de: 'Dein Freund möchte Zeit und Treffpunkt festlegen. Du schlägst sieben Uhr am Eingang des Einkaufszentrums vor.', en: 'Your friend wants to settle the time and meeting point. Suggest seven at the mall entrance.' },
    pedagogicalGoal: 'Mit nanti eine geplante Verabredung und mit di pintu masuk einen eindeutigen Treffpunkt nennen.',
    targetText: 'Nanti kita bertemu jam tujuh di pintu masuk mal. Kamu setuju?', baseText: { de: 'Später treffen wir uns um sieben am Eingang des Einkaufszentrums. Bist du einverstanden?', en: 'We will meet later at seven at the mall entrance. Do you agree?' },
    chunks: [{ targetText: 'Nanti kita bertemu', baseText: { de: 'Später treffen wir uns', en: 'We will meet later' } }, { targetText: 'jam tujuh', baseText: { de: 'um sieben Uhr', en: 'at seven' } }, { targetText: 'di pintu masuk mal.', baseText: { de: 'am Eingang des Einkaufszentrums.', en: 'at the mall entrance.' } }, { targetText: 'Kamu setuju?', baseText: { de: 'Bist du einverstanden?', en: 'Do you agree?' } }],
    terms: [{ targetText: 'bertemu', baseText: { de: 'sich treffen', en: 'to meet' } }, { targetText: 'pintu masuk', baseText: { de: 'Eingang', en: 'entrance' } }, { targetText: 'mal', baseText: { de: 'Einkaufszentrum', en: 'mall' } }, { targetText: 'setuju', baseText: { de: 'einverstanden sein', en: 'to agree' } }, { targetText: 'jam tujuh', baseText: { de: 'um sieben Uhr', en: 'at seven' } }],
    recall: { before: 'Nanti kita bertemu jam tujuh di ', answer: 'pintu', after: ' masuk mal. Kamu setuju?', fallbackChoices: ['pintu', 'lantai', 'taman', 'jalan'] }, speakRequired: ['bertemu', 'pintu', 'setuju'],
    sceneCaption: { de: 'Dein Freund schaut auf den Stadtplan und fragt: „Kamu mau bertemu jam berapa dan di mana?“', en: 'Your friend looks at the city map and asks: “Kamu mau bertemu jam berapa dan di mana?”' },
    trophyWord: { word: 'pintu', meaning: { de: 'Tür, Eingang', en: 'door, entrance' }, example: 'Saya tunggu di pintu masuk mal.', whyThisWord: { de: 'Das Wort macht aus einem großen Einkaufszentrum einen klaren und leicht auffindbaren Treffpunkt.', en: 'The word turns a large mall into a clear, easy-to-find meeting point.' } },
    distractors: ['di halte bus', 'jam delapan pagi'], placeholderCaption: { de: 'Der große Eingang eines Einkaufszentrums ist mit einer Uhr auf sieben als Treffpunkt markiert.', en: 'A large mall entrance is marked as the meeting point with a clock at seven.' }, songMood: 'a precise meet-up pulse centered on one bright entrance', visualNotes: 'Mall entrance at dusk, two friends approaching, large clock showing seven and clear doorway signage.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'ganti-rencana-ke-sabtu', title: { de: 'Auf Samstag verschieben', en: 'Move it to Saturday' },
    situation: { de: 'Deine Freundin fragt, ob der Plan für morgen noch passt. Du schlägst vor, ihn auf Samstag zu verschieben.', en: 'Your friend asks whether tomorrow’s plan still works. Suggest moving it to Saturday.' },
    pedagogicalGoal: 'Mit ganti einen Plan ändern und mit besok den betroffenen Termin zeitlich markieren.',
    targetText: 'Bisa kita ganti jadwal besok ke hari Sabtu? Kamu setuju?', baseText: { de: 'Können wir den Termin von morgen auf Samstag verschieben? Bist du einverstanden?', en: 'Can we move tomorrow’s appointment to Saturday? Do you agree?' },
    chunks: [{ targetText: 'Bisa kita ganti', baseText: { de: 'Können wir verschieben', en: 'Can we move' } }, { targetText: 'jadwal besok', baseText: { de: 'den Termin von morgen', en: 'tomorrow’s appointment' } }, { targetText: 'ke hari Sabtu?', baseText: { de: 'auf Samstag?', en: 'to Saturday?' } }, { targetText: 'Kamu setuju?', baseText: { de: 'Bist du einverstanden?', en: 'Do you agree?' } }],
    terms: [{ targetText: 'ganti', baseText: { de: 'ändern, wechseln', en: 'to change' } }, { targetText: 'jadwal', baseText: { de: 'Termin, Zeitplan', en: 'schedule, appointment' } }, { targetText: 'besok', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'hari Sabtu', baseText: { de: 'Samstag', en: 'Saturday' } }, { targetText: 'setuju', baseText: { de: 'einverstanden sein', en: 'to agree' } }],
    recall: { before: 'Bisa kita ', answer: 'ganti', after: ' jadwal besok ke hari Sabtu? Kamu setuju?', fallbackChoices: ['ganti', 'bawa', 'tulis', 'lihat'] }, speakRequired: ['ganti', 'jadwal', 'sabtu'],
    sceneCaption: { de: 'Deine Freundin zeigt auf den morgigen Termin und fragt: „Besok kamu masih bisa?“', en: 'Your friend points to tomorrow’s appointment and asks: “Besok kamu masih bisa?”' },
    trophyWord: { word: 'ganti', meaning: { de: 'ändern, austauschen', en: 'to change, replace' }, example: 'Kita ganti waktu pertemuan ke hari Sabtu.', whyThisWord: { de: 'Mit diesem Verb kannst du eine Verabredung retten, wenn der ursprüngliche Tag nicht mehr passt.', en: 'This verb lets you save a plan when the original day no longer works.' } },
    distractors: ['tetap hari Jumat', 'bertemu pagi ini'], placeholderCaption: { de: 'Ein Kalenderpfeil verschiebt eine Verabredung von morgen auf Samstag.', en: 'A calendar arrow moves an appointment from tomorrow to Saturday.' }, songMood: 'a flexible calendar rhythm that lands neatly on Saturday', visualNotes: 'Two friends with a phone calendar, an event moving from tomorrow to Saturday with a simple arrow.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tidak-bisa-nanti-malam', title: { de: 'Heute Abend geht es nicht', en: 'Cannot make it tonight' },
    situation: { de: 'Dein Freund fragt, ob du heute Abend wirklich kommst. Du sagst wegen der Arbeit höflich ab.', en: 'Your friend asks whether you are really coming tonight. Politely decline because of work.' },
    pedagogicalGoal: 'Mit maaf, tidak bisa und nanti malam eine freundliche Absage mit einfachem Grund formulieren.',
    targetText: 'Maaf, saya tidak bisa datang nanti malam karena harus bekerja. Kamu mengerti?', baseText: { de: 'Tut mir leid, ich kann heute Abend nicht kommen, weil ich arbeiten muss. Verstehst du?', en: 'Sorry, I cannot come tonight because I have to work. Do you understand?' },
    chunks: [{ targetText: 'Maaf, saya tidak bisa datang', baseText: { de: 'Tut mir leid, ich kann nicht kommen', en: 'Sorry, I cannot come' } }, { targetText: 'nanti malam', baseText: { de: 'heute Abend', en: 'tonight' } }, { targetText: 'karena harus bekerja.', baseText: { de: 'weil ich arbeiten muss.', en: 'because I have to work.' } }, { targetText: 'Kamu mengerti?', baseText: { de: 'Verstehst du?', en: 'Do you understand?' } }],
    terms: [{ targetText: 'maaf', baseText: { de: 'Entschuldigung, tut mir leid', en: 'sorry' } }, { targetText: 'tidak bisa datang', baseText: { de: 'nicht kommen können', en: 'cannot come' } }, { targetText: 'nanti malam', baseText: { de: 'heute Abend', en: 'tonight' } }, { targetText: 'harus bekerja', baseText: { de: 'arbeiten müssen', en: 'to have to work' } }, { targetText: 'mengerti', baseText: { de: 'verstehen', en: 'to understand' } }],
    recall: { before: 'Maaf, saya tidak bisa datang nanti malam karena harus bekerja. Kamu ', answer: 'mengerti', after: '?', fallbackChoices: ['mengerti', 'membayar', 'mencari', 'membawa'] }, speakRequired: ['datang', 'bekerja', 'mengerti'],
    sceneCaption: { de: 'Dein Freund wartet auf deine Bestätigung und fragt: „Kamu jadi datang nanti malam?“', en: 'Your friend waits for your confirmation and asks: “Kamu jadi datang nanti malam?”' },
    trophyWord: { word: 'mengerti', meaning: { de: 'verstehen', en: 'to understand' }, example: 'Saya mengerti alasan kamu.', whyThisWord: { de: 'Das Verb prüft behutsam, ob dein Freund die Absage und ihren Grund nachvollzieht.', en: 'The verb gently checks whether your friend understands the cancellation and its reason.' } },
    distractors: ['saya datang lebih awal', 'kita makan di luar'], placeholderCaption: { de: 'Ein Abendtermin im Kalender steht neben einem geöffneten Arbeitslaptop.', en: 'An evening appointment in the calendar sits beside an open work laptop.' }, songMood: 'a gentle apologetic phrase resolving into understanding', visualNotes: 'Friend on a phone call, evening calendar reminder, open laptop and a calm apologetic expression.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'ayo-makan-malam-besok', title: { de: 'Ich lade dich ein', en: 'Dinner is on me' },
    situation: { de: 'Du möchtest dich bei deiner Freundin bedanken. Du lädst sie für morgen zum Abendessen ein und lässt sie den Ort wählen.', en: 'You want to thank your friend. Invite her to dinner tomorrow and let her choose the place.' },
    pedagogicalGoal: 'Mit ayo und besok eine warme Einladung aussprechen und die Rollen beim Planen verteilen.',
    targetText: 'Ayo makan malam besok. Kamu pilih tempatnya, saya yang bayar.', baseText: { de: 'Lass uns morgen Abend essen gehen. Du wählst den Ort aus, ich bezahle.', en: 'Let’s have dinner tomorrow. You choose the place, and I will pay.' },
    chunks: [{ targetText: 'Ayo makan malam besok.', baseText: { de: 'Lass uns morgen Abend essen gehen.', en: 'Let’s have dinner tomorrow.' } }, { targetText: 'Kamu pilih tempatnya,', baseText: { de: 'Du wählst den Ort aus,', en: 'You choose the place,' } }, { targetText: 'saya yang bayar.', baseText: { de: 'ich bezahle.', en: 'and I will pay.' } }],
    terms: [{ targetText: 'ayo', baseText: { de: 'komm, lass uns', en: 'come on, let’s' } }, { targetText: 'makan malam', baseText: { de: 'zu Abend essen', en: 'to have dinner' } }, { targetText: 'besok', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'pilih tempatnya', baseText: { de: 'den Ort auswählen', en: 'choose the place' } }, { targetText: 'saya yang bayar', baseText: { de: 'ich bezahle', en: 'I will pay' } }],
    recall: { before: '', answer: 'Ayo', after: ' makan malam besok. Kamu pilih tempatnya, saya yang bayar.', fallbackChoices: ['Ayo', 'Maaf', 'Tolong', 'Permisi'] }, speakRequired: ['makan', 'tempatnya', 'bayar'],
    sceneCaption: { de: 'Deine Freundin zeigt auf den freien Abend und fragt: „Besok malam kamu ada waktu?“', en: 'Your friend points to the free evening and asks: “Besok malam kamu ada waktu?”' },
    trophyWord: { word: 'ayo', meaning: { de: 'komm, lass uns', en: 'come on, let’s' }, example: 'Ayo kita makan di warung dekat rumah.', whyThisWord: { de: 'Dieser kurze Auftakt macht aus einer Idee sofort eine herzliche gemeinsame Einladung.', en: 'This short opener instantly turns an idea into a warm shared invitation.' } },
    distractors: ['kamu bayar semuanya', 'makan siang hari ini'], placeholderCaption: { de: 'Zwei Teller und ein Kalender mit dem morgigen Abend liegen auf einem Tisch.', en: 'Two plates and a calendar marked for tomorrow evening sit on a table.' }, songMood: 'a generous dinner invitation with an easy shared beat', visualNotes: 'Two friends planning dinner, tomorrow highlighted, restaurant choices on a phone and one person reaching for the bill.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'akan-terlambat-sepuluh-menit', title: { de: 'Zehn Minuten später', en: 'Ten minutes late' },
    situation: { de: 'Deine Freundin fragt, wo du bist. Du kündigst eine kleine Verspätung an und bittest sie, im Café zu warten.', en: 'Your friend asks where you are. Say you will be a little late and ask her to wait at the cafe.' },
    pedagogicalGoal: 'Mit akan eine kommende Verspätung ankündigen und mit tunggu eine klare Zwischenlösung geben.',
    targetText: 'Maaf, saya akan terlambat sepuluh menit. Kamu tunggu di kafe, ya?', baseText: { de: 'Tut mir leid, ich werde zehn Minuten zu spät sein. Warte bitte im Café, ja?', en: 'Sorry, I will be ten minutes late. Wait at the cafe, okay?' },
    chunks: [{ targetText: 'Maaf, saya akan terlambat', baseText: { de: 'Tut mir leid, ich werde zu spät sein', en: 'Sorry, I will be late' } }, { targetText: 'sepuluh menit.', baseText: { de: 'um zehn Minuten.', en: 'by ten minutes.' } }, { targetText: 'Kamu tunggu di kafe, ya?', baseText: { de: 'Warte bitte im Café, ja?', en: 'Wait at the cafe, okay?' } }],
    terms: [{ targetText: 'akan', baseText: { de: 'werden', en: 'will' } }, { targetText: 'terlambat', baseText: { de: 'zu spät sein', en: 'to be late' } }, { targetText: 'sepuluh menit', baseText: { de: 'zehn Minuten', en: 'ten minutes' } }, { targetText: 'tunggu', baseText: { de: 'warten', en: 'to wait' } }, { targetText: 'di kafe', baseText: { de: 'im Café', en: 'at the cafe' } }],
    recall: { before: 'Maaf, saya akan terlambat sepuluh menit. Kamu ', answer: 'tunggu', after: ' di kafe, ya?', fallbackChoices: ['tunggu', 'jalan', 'tidur', 'belanja'] }, speakRequired: ['akan', 'menit', 'tunggu'],
    sceneCaption: { de: 'Deine Freundin ruft vom Café aus an und fragt: „Kamu ada di mana?“', en: 'Your friend calls from the cafe and asks: “Kamu ada di mana?”' },
    trophyWord: { word: 'tunggu', meaning: { de: 'warten', en: 'to wait' }, example: 'Kamu tunggu di dalam kafe, ya?', whyThisWord: { de: 'Das Verb gibt deiner Freundin während der kurzen Verspätung eine klare und praktische Handlungsanweisung.', en: 'The verb gives your friend a clear, practical action during the short delay.' } },
    distractors: ['saya tiba sekarang', 'kamu pulang saja'], placeholderCaption: { de: 'Eine Freundin wartet mit einer Tasse im Café, während eine Nachricht zehn Minuten Verspätung anzeigt.', en: 'A friend waits with a cup in the cafe while a message shows a ten-minute delay.' }, songMood: 'a quick apologetic pulse counting down ten minutes', visualNotes: 'Cafe window, waiting friend, phone message showing ten minutes and city movement outside.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'besok-bertemu-di-sini', title: { de: 'Der neue Plan steht', en: 'The new plan is set' },
    situation: { de: 'Nach mehreren Nachrichten möchte dein Freund den geänderten Plan noch einmal hören. Du bestätigst Zeit und Ort.', en: 'After several messages, your friend wants to hear the changed plan once more. Confirm the time and place.' },
    pedagogicalGoal: 'Mit jadi und besok einen geänderten Plan knapp zusammenfassen und rückbestätigen.',
    targetText: 'Jadi, besok kita bertemu jam tujuh di sini, ya? Kamu ingat?', baseText: { de: 'Also, morgen treffen wir uns um sieben hier, ja? Erinnerst du dich?', en: 'So, we meet here tomorrow at seven, okay? Do you remember?' },
    chunks: [{ targetText: 'Jadi, besok kita bertemu', baseText: { de: 'Also, morgen treffen wir uns', en: 'So, we meet tomorrow' } }, { targetText: 'jam tujuh di sini, ya?', baseText: { de: 'um sieben hier, ja?', en: 'here at seven, okay?' } }, { targetText: 'Kamu ingat?', baseText: { de: 'Erinnerst du dich?', en: 'Do you remember?' } }],
    terms: [{ targetText: 'jadi', baseText: { de: 'also, dann', en: 'so, then' } }, { targetText: 'besok', baseText: { de: 'morgen', en: 'tomorrow' } }, { targetText: 'bertemu', baseText: { de: 'sich treffen', en: 'to meet' } }, { targetText: 'di sini', baseText: { de: 'hier', en: 'here' } }, { targetText: 'ingat', baseText: { de: 'sich erinnern', en: 'to remember' } }],
    recall: { before: 'Jadi, besok kita bertemu jam tujuh di sini, ya? Kamu ', answer: 'ingat', after: '?', fallbackChoices: ['ingat', 'makan', 'bawa', 'sewa'] }, speakRequired: ['besok', 'bertemu', 'ingat'],
    sceneCaption: { de: 'Dein Freund scrollt durch die Nachrichten und fragt: „Besok kita jadi bertemu jam berapa dan di mana?“', en: 'Your friend scrolls through the messages and asks: “Besok kita jadi bertemu jam berapa dan di mana?”' },
    trophyWord: { word: 'ingat', meaning: { de: 'sich erinnern', en: 'to remember' }, example: 'Saya ingat tempat pertemuan kita.', whyThisWord: { de: 'Das Verb prüft, ob die geänderten Einzelheiten bei euch beiden gleich angekommen sind.', en: 'The verb checks that both of you have the same changed details in mind.' } },
    distractors: ['hari Sabtu jam delapan', 'di pintu museum'], placeholderCaption: { de: 'Eine Chatansicht zeigt den bestätigten Treffpunkt für morgen um sieben.', en: 'A chat screen shows the confirmed meeting point for tomorrow at seven.' }, songMood: 'a tidy confirmation refrain that locks the new plan in place', visualNotes: 'Two friends comparing a message thread, tomorrow at seven highlighted and the meeting spot visible nearby.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minggu-depan-ke-bogor', title: { de: 'Ausflug nächste Woche', en: 'Trip next week' },
    situation: { de: 'Dein Freund fragt nach dem nächsten Wochenende. Du erzählst von einem kurzen Ausflug nach Bogor und lädst ihn ein.', en: 'Your friend asks about next weekend. Tell him about a short trip to Bogor and invite him.' },
    pedagogicalGoal: 'Mit minggu depan und mau einen weiter vorausliegenden Plan ausdrücken.',
    targetText: 'Minggu depan saya mau pergi ke Bogor. Kamu mau ikut?', baseText: { de: 'Nächste Woche möchte ich nach Bogor fahren. Möchtest du mitkommen?', en: 'I am going to Bogor next week. Do you want to come along?' },
    chunks: [{ targetText: 'Minggu depan saya mau pergi', baseText: { de: 'Nächste Woche möchte ich fahren', en: 'Next week I am going' } }, { targetText: 'ke Bogor.', baseText: { de: 'nach Bogor.', en: 'to Bogor.' } }, { targetText: 'Kamu mau ikut?', baseText: { de: 'Möchtest du mitkommen?', en: 'Do you want to come along?' } }],
    terms: [{ targetText: 'minggu depan', baseText: { de: 'nächste Woche', en: 'next week' } }, { targetText: 'mau pergi', baseText: { de: 'fahren wollen', en: 'to be going' } }, { targetText: 'Bogor', baseText: { de: 'Bogor', en: 'Bogor' } }, { targetText: 'ikut', baseText: { de: 'mitkommen', en: 'to come along' } }, { targetText: 'perjalanan singkat', baseText: { de: 'kurzer Ausflug', en: 'short trip' } }],
    recall: { before: '', answer: 'Minggu', after: ' depan saya mau pergi ke Bogor. Kamu mau ikut?', fallbackChoices: ['Minggu', 'Bulan', 'Tahun', 'Pagi'] }, speakRequired: ['minggu', 'bogor', 'ikut'],
    sceneCaption: { de: 'Dein Freund öffnet die Seite für nächste Woche im Kalender und fragt: „Minggu depan kamu mau ke mana?“', en: 'Your friend opens next week’s page in the calendar and asks: “Minggu depan kamu mau ke mana?”' },
    trophyWord: { word: 'minggu', meaning: { de: 'Woche', en: 'week' }, example: 'Minggu depan kami pergi ke Bogor.', whyThisWord: { de: 'Das Zeitwort erweitert deine Planung von morgen auf einen ganzen Horizont der nächsten Woche.', en: 'This time word expands your planning horizon from tomorrow to the whole of next week.' } },
    distractors: ['hari ini ke pasar', 'tinggal di hotel'], placeholderCaption: { de: 'Ein Kalender für nächste Woche liegt neben einer kleinen Karte der Strecke nach Bogor.', en: 'A next-week calendar lies beside a small map of the route to Bogor.' }, songMood: 'an open-road acoustic finish pointing toward next week', visualNotes: 'Two friends planning a short trip, Bogor on a map, next week highlighted and a small day bag ready.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_4_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_FOUR_METADATA, indonesianA2Practical4Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 4 abgeschlossen und kannst mit einem Freund Pläne machen, ändern und bestätigen.', en: 'You have completed Indonesian A2 Practical 4 and can make, change, and confirm plans with a friend.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_FIVE_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-5', title: 'Indonesisch A2 Praxis 5', shortTitle: 'A2 Praxis 5',
  subtitle: { de: 'Höflich widersprechen, korrigieren und eine Alternative verlangen', en: 'Politely disagreeing, correcting, and asking for an alternative' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical5Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'tadi-pesan-teh-bukan-kopi', title: { de: 'Tee, nicht Kaffee', en: 'Tea, not coffee' },
    situation: { de: 'Die Bedienung bringt dir Kaffee, obwohl du Tee bestellt hast. Du korrigierst die Bestellung ruhig.', en: 'The server brings you coffee even though you ordered tea. Correct the order calmly.' },
    pedagogicalGoal: 'Mit tadi eine frühere Bestellung markieren und mit bukan ein Nomen höflich korrigieren.',
    targetText: 'Tadi saya pesan teh, bukan kopi, Bu.', baseText: { de: 'Vorhin habe ich Tee bestellt, nicht Kaffee.', en: 'I ordered tea earlier, not coffee, ma’am.' },
    chunks: [{ targetText: 'Tadi saya pesan', baseText: { de: 'Vorhin habe ich bestellt', en: 'I ordered earlier' } }, { targetText: 'teh, bukan kopi,', baseText: { de: 'Tee, nicht Kaffee,', en: 'tea, not coffee,' } }, { targetText: 'Bu.', baseText: { de: 'bitte.', en: 'ma’am.' } }],
    terms: [{ targetText: 'tadi', baseText: { de: 'vorhin', en: 'earlier today' } }, { targetText: 'pesan', baseText: { de: 'bestellen', en: 'to order' } }, { targetText: 'teh', baseText: { de: 'Tee', en: 'tea' } }, { targetText: 'bukan', baseText: { de: 'nicht, kein bei Nomen', en: 'not, used with nouns' } }, { targetText: 'kopi', baseText: { de: 'Kaffee', en: 'coffee' } }],
    recall: { before: 'Tadi saya pesan teh, ', answer: 'bukan', after: ' kopi, Bu.', fallbackChoices: ['bukan', 'tidak', 'belum', 'sudah'] }, speakRequired: ['pesan', 'teh', 'bukan'],
    sceneCaption: { de: 'Die Bedienung stellt eine Kaffeetasse hin und sagt: „Ini kopi yang Anda pesan, Pak.“', en: 'The server sets down a cup of coffee and says: “Ini kopi yang Anda pesan, Pak.”' },
    trophyWord: { word: 'bukan', meaning: { de: 'nicht, kein bei Nomen', en: 'not, used with nouns' }, example: 'Saya pesan teh, bukan kopi.', whyThisWord: { de: 'Dieses Wort korrigiert genau den falschen Gegenstand, ohne die Bedienung schroff anzusprechen.', en: 'This word corrects the wrong item precisely without sounding harsh to the server.' } },
    distractors: ['saya mau gula', 'kopinya masih panas'], placeholderCaption: { de: 'Eine Kaffeetasse steht neben einem Bestellzettel, auf dem Tee notiert ist.', en: 'A coffee cup sits beside an order slip marked for tea.' }, songMood: 'a calm corrective phrase with a clear tea-not-coffee turn', visualNotes: 'Restaurant table, female server, coffee cup placed beside an order pad clearly marked for tea.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'boleh-ganti-ukuran', title: { de: 'Eine andere Größe', en: 'A different size' },
    situation: { de: 'Im Kleidungsgeschäft ist das Hemd zu klein. Du bittest die Verkäuferin höflich um eine andere Größe.', en: 'At the clothing shop, the shirt is too small. Politely ask the clerk for a different size.' },
    pedagogicalGoal: 'Mit terlalu kecil ein Problem benennen und mit Boleh ganti ukuran? eine feste Reparaturformel verwenden.',
    targetText: 'Maaf, baju ini terlalu kecil. Boleh ganti ukuran, Bu?', baseText: { de: 'Entschuldigung, dieses Hemd ist zu klein. Kann ich es gegen eine andere Größe umtauschen?', en: 'Excuse me, this shirt is too small. Could I exchange it for another size, ma’am?' },
    chunks: [{ targetText: 'Maaf, baju ini', baseText: { de: 'Entschuldigung, dieses Hemd', en: 'Excuse me, this shirt' } }, { targetText: 'terlalu kecil.', baseText: { de: 'ist zu klein.', en: 'is too small.' } }, { targetText: 'Boleh ganti ukuran, Bu?', baseText: { de: 'Kann ich die Größe wechseln?', en: 'May I change the size, ma’am?' } }],
    terms: [{ targetText: 'baju', baseText: { de: 'Hemd, Kleidungsstück', en: 'shirt, item of clothing' } }, { targetText: 'terlalu kecil', baseText: { de: 'zu klein', en: 'too small' } }, { targetText: 'boleh', baseText: { de: 'dürfen', en: 'may' } }, { targetText: 'ganti ukuran', baseText: { de: 'die Größe wechseln', en: 'change the size' } }, { targetText: 'ruang ganti', baseText: { de: 'Umkleidekabine', en: 'fitting room' } }],
    recall: { before: 'Maaf, baju ini terlalu kecil. Boleh ganti ', answer: 'ukuran', after: ', Bu?', fallbackChoices: ['ukuran', 'warna', 'bahan', 'harga'] }, speakRequired: ['baju', 'kecil', 'ukuran'],
    sceneCaption: { de: 'Die Verkäuferin betrachtet das Hemd im Spiegel und fragt: „Ukurannya cocok, Pak?“', en: 'The saleswoman looks at the shirt in the mirror and asks: “Ukurannya cocok, Pak?”' },
    trophyWord: { word: 'ukuran', meaning: { de: 'Größe, Maß', en: 'size, measurement' }, example: 'Saya perlu ukuran yang lebih besar.', whyThisWord: { de: 'Das Wort benennt die eine Eigenschaft, die geändert werden muss, damit das Hemd passt.', en: 'The word identifies the one feature that needs changing for the shirt to fit.' } },
    distractors: ['baju biru itu', 'saya lihat dulu'], placeholderCaption: { de: 'Ein zu kleines Hemd hängt neben mehreren deutlich markierten Größen.', en: 'A shirt that is too small hangs beside several clearly marked sizes.' }, songMood: 'a neat fitting-room correction with a polite upward lift', visualNotes: 'Clothing shop mirror, female clerk, tight-fitting shirt and a rack of clearly labeled sizes.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minta-air-putih-saja', title: { de: 'Stilles Wasser stattdessen', en: 'Plain water instead' },
    situation: { de: 'Im Restaurant wird dir Eistee gebracht. Du bittest höflich darum, das Getränk gegen stilles Wasser auszutauschen.', en: 'At the restaurant, iced tea is brought to you. Politely ask to replace it with plain water.' },
    pedagogicalGoal: 'Mit boleh ganti eine Korrektur einleiten und mit saya minta … saja die gewünschte Alternative nennen.',
    targetText: 'Maaf, boleh ganti minumannya? Saya minta air putih saja, Bu.', baseText: { de: 'Entschuldigung, könnte ich stattdessen ein anderes Getränk bekommen? Ich hätte gern stilles Wasser.', en: 'Excuse me, could I have a different drink instead? I’d like plain water, ma’am.' },
    chunks: [{ targetText: 'Maaf, boleh ganti minumannya?', baseText: { de: 'Entschuldigung, kann ich das Getränk tauschen?', en: 'Excuse me, may I change the drink?' } }, { targetText: 'Saya minta', baseText: { de: 'Ich hätte bitte', en: 'I would like' } }, { targetText: 'air putih saja, Bu.', baseText: { de: 'nur stilles Wasser.', en: 'plain water instead, ma’am.' } }],
    terms: [{ targetText: 'ganti minumannya', baseText: { de: 'das Getränk tauschen', en: 'change the drink' } }, { targetText: 'minta', baseText: { de: 'bitten um', en: 'to ask for' } }, { targetText: 'air putih', baseText: { de: 'stilles Wasser', en: 'plain water' } }, { targetText: 'saja', baseText: { de: 'nur, stattdessen', en: 'just, instead' } }, { targetText: 'minuman', baseText: { de: 'Getränk', en: 'drink' } }],
    recall: { before: 'Maaf, boleh ganti minumannya? Saya minta air ', answer: 'putih', after: ' saja, Bu.', fallbackChoices: ['putih', 'merah', 'hijau', 'kuning'] }, speakRequired: ['ganti', 'minumannya', 'putih'],
    sceneCaption: { de: 'Die Bedienung stellt ein Glas Eistee ab und sagt: „Ini es tehnya, Pak.“', en: 'The server sets down a glass of iced tea and says: “Ini es tehnya, Pak.”' },
    trophyWord: { word: 'putih', meaning: { de: 'weiß; in air putih: stilles Wasser', en: 'white; in air putih: plain water' }, example: 'Saya minum air putih saat makan.', whyThisWord: { de: 'In dieser festen Verbindung bekommst du zuverlässig einfaches Wasser statt eines süßen Getränks.', en: 'In this fixed phrase, it reliably gets you plain water instead of a sweet drink.' } },
    distractors: ['es teh manis', 'tambah satu gelas'], placeholderCaption: { de: 'Ein Glas Eistee steht neben einer schlichten Karaffe mit Wasser.', en: 'A glass of iced tea stands beside a simple carafe of plain water.' }, songMood: 'a cool restaurant reset from sweet tea to clear water', visualNotes: 'Restaurant table, female server, iced tea and plain-water carafe presented as a clear substitution.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minta-yang-itu-saja', title: { de: 'Nicht diese, sondern jene', en: 'Not these, those' },
    situation: { de: 'Auf dem Markt greift die Händlerin nach der falschen Ware. Du zeigst höflich auf die andere Auswahl.', en: 'At the market, the vendor reaches for the wrong items. Politely point to the other selection.' },
    pedagogicalGoal: 'Mit bukan yang ini eine sichtbare Auswahl korrigieren und mit saya minta die Alternative festlegen.',
    targetText: 'Maaf, bukan yang ini, Bu. Saya minta yang itu saja.', baseText: { de: 'Entschuldigung, nicht diese hier. Ich hätte gern die dort.', en: 'Excuse me, not these, ma’am. I’d like those instead.' },
    chunks: [{ targetText: 'Maaf, bukan yang ini, Bu.', baseText: { de: 'Entschuldigung, nicht diese hier.', en: 'Excuse me, not these, ma’am.' } }, { targetText: 'Saya minta', baseText: { de: 'Ich möchte', en: 'I would like' } }, { targetText: 'yang itu saja.', baseText: { de: 'nur jene dort.', en: 'those ones instead.' } }],
    terms: [{ targetText: 'bukan yang ini', baseText: { de: 'nicht diese hier', en: 'not these ones' } }, { targetText: 'minta', baseText: { de: 'bitten um, möchten', en: 'to ask for, want' } }, { targetText: 'yang itu', baseText: { de: 'jene dort', en: 'those ones' } }, { targetText: 'saja', baseText: { de: 'nur, stattdessen', en: 'just, instead' } }, { targetText: 'pilihan', baseText: { de: 'Auswahl', en: 'selection' } }],
    recall: { before: 'Maaf, bukan yang ini, Bu. Saya ', answer: 'minta', after: ' yang itu saja.', fallbackChoices: ['minta', 'lihat', 'bawa', 'pegang'] }, speakRequired: ['bukan', 'minta', 'saja'],
    sceneCaption: { de: 'Die Händlerin hält die nähere Schale hoch und fragt: „Yang ini untuk Anda, Pak?“', en: 'The vendor lifts the nearer tray and asks: “Yang ini untuk Anda, Pak?”' },
    trophyWord: { word: 'minta', meaning: { de: 'bitten um, verlangen', en: 'to ask for, request' }, example: 'Saya minta yang di sebelah kanan.', whyThisWord: { de: 'Das Verb nennt nach der Korrektur klar die Ware, die du tatsächlich haben möchtest.', en: 'After the correction, this verb clearly identifies what you actually want.' } },
    distractors: ['semua yang ini', 'dua kilo juga'], placeholderCaption: { de: 'Zwei Warenschalen stehen nebeneinander, während eine Hand deutlich auf die hintere zeigt.', en: 'Two trays of goods sit side by side while a hand clearly points to the farther one.' }, songMood: 'a market-call response that shifts cleanly from this to that', visualNotes: 'Market stall, female vendor lifting one tray, customer politely pointing to the other selection.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kamar-terlalu-berisik', title: { de: 'Das Zimmer ist zu laut', en: 'The room is too noisy' },
    situation: { de: 'Die Rezeptionistin fragt, ob dein Zimmer angenehm ist. Du erklärst das Lärmproblem und bittest um einen Wechsel.', en: 'The receptionist asks whether your room is comfortable. Explain the noise problem and ask to change rooms.' },
    pedagogicalGoal: 'Mit terlalu berisik ein gegenwärtiges Problem benennen und mit Boleh ganti kamar? höflich Abhilfe verlangen.',
    targetText: 'Maaf, kamar ini terlalu berisik. Boleh ganti kamar, Bu?', baseText: { de: 'Entschuldigung, dieses Zimmer ist zu laut. Kann ich das Zimmer wechseln?', en: 'Excuse me, this room is too noisy. May I change rooms, ma’am?' },
    chunks: [{ targetText: 'Maaf, kamar ini', baseText: { de: 'Entschuldigung, dieses Zimmer', en: 'Excuse me, this room' } }, { targetText: 'terlalu berisik.', baseText: { de: 'ist zu laut.', en: 'is too noisy.' } }, { targetText: 'Boleh ganti kamar, Bu?', baseText: { de: 'Kann ich das Zimmer wechseln?', en: 'May I change rooms, ma’am?' } }],
    terms: [{ targetText: 'kamar', baseText: { de: 'Zimmer', en: 'room' } }, { targetText: 'terlalu', baseText: { de: 'zu, allzu', en: 'too' } }, { targetText: 'berisik', baseText: { de: 'laut, lärmig', en: 'noisy' } }, { targetText: 'ganti kamar', baseText: { de: 'das Zimmer wechseln', en: 'change rooms' } }, { targetText: 'suara', baseText: { de: 'Geräusch, Stimme', en: 'sound, voice' } }],
    recall: { before: 'Maaf, kamar ini terlalu ', answer: 'berisik', after: '. Boleh ganti kamar, Bu?', fallbackChoices: ['berisik', 'bersih', 'kosong', 'terang'] }, speakRequired: ['kamar', 'berisik', 'ganti'],
    sceneCaption: { de: 'Die Rezeptionistin blickt vom Zimmerschlüssel auf und fragt: „Kamarnya nyaman, Pak?“', en: 'The receptionist looks up from the room key and asks: “Kamarnya nyaman, Pak?”' },
    trophyWord: { word: 'berisik', meaning: { de: 'laut, lärmig', en: 'noisy' }, example: 'Kamar dekat jalan sangat berisik.', whyThisWord: { de: 'Das Adjektiv beschreibt das konkrete Problem, das einen Zimmerwechsel nachvollziehbar macht.', en: 'The adjective describes the concrete problem that makes a room change reasonable.' } },
    distractors: ['kamarnya sangat luas', 'saya perlu handuk'], placeholderCaption: { de: 'Eine Zimmertür liegt direkt neben einer lauten Straße, während ein zweiter Schlüssel bereitliegt.', en: 'A room door faces a noisy street while a second key card waits nearby.' }, songMood: 'a hushed hotel phrase pushing gently against street noise', visualNotes: 'Hotel reception, female receptionist, room card, noisy street visible near one room and a quieter corridor beyond.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'cukup-yang-ini-saja', title: { de: 'Nur dieses, danke', en: 'Just this, thanks' },
    situation: { de: 'Die Verkäuferin bietet dir noch Batterien zu deinem Einkauf an. Du lehnst das Zusatzangebot freundlich ab.', en: 'The clerk offers batteries in addition to your purchase. Politely decline the extra item.' },
    pedagogicalGoal: 'Mit Tidak, terima kasih und cukup … saja ein Zusatzangebot freundlich begrenzen.',
    targetText: 'Tidak, terima kasih, Bu. Cukup yang ini saja.', baseText: { de: 'Nein, danke. Nur dieses hier reicht mir.', en: 'No, thank you, ma’am. This one alone is enough.' },
    chunks: [{ targetText: 'Tidak, terima kasih, Bu.', baseText: { de: 'Nein, danke.', en: 'No, thank you, ma’am.' } }, { targetText: 'Cukup yang ini', baseText: { de: 'Dieses hier reicht', en: 'This one is enough' } }, { targetText: 'saja.', baseText: { de: 'allein.', en: 'on its own.' } }],
    terms: [{ targetText: 'tidak', baseText: { de: 'nein, nicht', en: 'no, not' } }, { targetText: 'terima kasih', baseText: { de: 'vielen Dank', en: 'thank you' } }, { targetText: 'cukup', baseText: { de: 'genug, ausreichend', en: 'enough' } }, { targetText: 'yang ini', baseText: { de: 'dieses hier', en: 'this one' } }, { targetText: 'saja', baseText: { de: 'nur', en: 'just' } }],
    recall: { before: 'Tidak, terima kasih, Bu. ', answer: 'Cukup', after: ' yang ini saja.', fallbackChoices: ['Cukup', 'Benar', 'Mahal', 'Besar'] }, speakRequired: ['terima', 'cukup', 'saja'],
    sceneCaption: { de: 'Die Verkäuferin legt Batterien neben deinen Einkauf und fragt: „Mau tambah baterai juga, Pak?“', en: 'The clerk places batteries beside your purchase and asks: “Mau tambah baterai juga, Pak?”' },
    trophyWord: { word: 'cukup', meaning: { de: 'genug, ausreichend', en: 'enough, sufficient' }, example: 'Satu botol cukup untuk hari ini.', whyThisWord: { de: 'Das Wort setzt eine freundliche Grenze, ohne das Angebot oder die Verkäuferin abzuwerten.', en: 'The word sets a friendly limit without dismissing the offer or the clerk.' } },
    distractors: ['tambah dua baterai', 'saya cari kabel'], placeholderCaption: { de: 'Ein einzelner Artikel liegt an der Kasse, während die angebotenen Batterien zurückbleiben.', en: 'A single item sits at the register while the offered batteries remain aside.' }, songMood: 'a soft declining cadence that closes with exactly enough', visualNotes: 'Shop counter, female clerk offering batteries, customer politely keeping only the original item.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sepertinya-salah-hitung', title: { de: 'Die Rechnung stimmt nicht', en: 'The total seems wrong' },
    situation: { de: 'Die Kassiererin nennt eine Summe, die nicht zu den Preisen passt. Du bittest ruhig um eine neue Prüfung.', en: 'The cashier gives a total that does not match the prices. Calmly ask her to check it again.' },
    pedagogicalGoal: 'Mit sepertinya salah hitung vorsichtig auf einen Rechenfehler hinweisen und eine Prüfung erbitten.',
    targetText: 'Maaf, Bu, sepertinya salah hitung. Bisa periksa lagi?', baseText: { de: 'Entschuldigung, anscheinend stimmt die Rechnung nicht. Können Sie noch einmal nachsehen?', en: 'Excuse me, ma’am, there seems to be a calculation error. Can you check again?' },
    chunks: [{ targetText: 'Maaf, Bu,', baseText: { de: 'Entschuldigung,', en: 'Excuse me, ma’am,' } }, { targetText: 'sepertinya salah hitung.', baseText: { de: 'anscheinend stimmt die Rechnung nicht.', en: 'there seems to be a calculation error.' } }, { targetText: 'Bisa periksa lagi?', baseText: { de: 'Können Sie noch einmal nachsehen?', en: 'Can you check again?' } }],
    terms: [{ targetText: 'sepertinya', baseText: { de: 'anscheinend', en: 'it seems' } }, { targetText: 'salah hitung', baseText: { de: 'Rechenfehler', en: 'calculation error' } }, { targetText: 'periksa', baseText: { de: 'prüfen', en: 'to check' } }, { targetText: 'lagi', baseText: { de: 'noch einmal', en: 'again' } }, { targetText: 'jumlah', baseText: { de: 'Summe', en: 'total' } }],
    recall: { before: 'Maaf, Bu, sepertinya salah ', answer: 'hitung', after: '. Bisa periksa lagi?', fallbackChoices: ['hitung', 'alamat', 'kamar', 'pesan'] }, speakRequired: ['sepertinya', 'hitung', 'periksa'],
    sceneCaption: { de: 'Die Kassiererin zeigt auf die Summe und sagt: „Jumlahnya seratus ribu, Pak.“', en: 'The cashier points to the total and says: “Jumlahnya seratus ribu, Pak.”' },
    trophyWord: { word: 'hitung', meaning: { de: 'rechnen, zählen', en: 'to calculate, count' }, example: 'Tolong hitung harganya sekali lagi.', whyThisWord: { de: 'In der festen Verbindung salah hitung benennst du den möglichen Fehler sachlich statt vorwurfsvoll.', en: 'In the fixed phrase salah hitung, it identifies the possible error factually rather than accusingly.' } },
    distractors: ['jumlahnya sudah benar', 'saya bayar tunai'], placeholderCaption: { de: 'Preisschilder und Kassensumme liegen sichtbar nebeneinander und passen nicht zusammen.', en: 'Price labels and the register total are visible side by side and do not match.' }, songMood: 'a careful counting rhythm that pauses for one more check', visualNotes: 'Checkout counter, female cashier, receipt, item prices and total displayed for a calm recheck.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minta-kemasan-lebih-kecil', title: { de: 'Die kleinere Packung', en: 'The smaller pack' },
    situation: { de: 'In der Apotheke wird dir eine große Packung angeboten. Du bittest höflich um eine kleinere.', en: 'At the pharmacy, you are offered a large pack. Politely ask for a smaller one.' },
    pedagogicalGoal: 'Mit boleh minta eine Alternative erfragen und mit kemasan yang lebih kecil präzisieren.',
    targetText: 'Maaf, boleh minta kemasan yang lebih kecil, Bu?', baseText: { de: 'Entschuldigung, könnte ich bitte eine kleinere Packung bekommen?', en: 'Excuse me, may I have a smaller pack, ma’am?' },
    chunks: [{ targetText: 'Maaf, boleh minta', baseText: { de: 'Entschuldigung, könnte ich bitte bekommen', en: 'Excuse me, may I have' } }, { targetText: 'kemasan yang lebih kecil,', baseText: { de: 'eine kleinere Packung,', en: 'a smaller pack,' } }, { targetText: 'Bu?', baseText: { de: 'bitte?', en: 'ma’am?' } }],
    terms: [{ targetText: 'kemasan', baseText: { de: 'Packung, Verpackung', en: 'pack, packaging' } }, { targetText: 'lebih kecil', baseText: { de: 'kleiner', en: 'smaller' } }, { targetText: 'boleh minta', baseText: { de: 'könnte ich bitte haben', en: 'may I have' } }, { targetText: 'satu bulan', baseText: { de: 'ein Monat', en: 'one month' } }, { targetText: 'apoteker', baseText: { de: 'Apothekerin oder Apotheker', en: 'pharmacist' } }],
    recall: { before: 'Maaf, boleh minta ', answer: 'kemasan', after: ' yang lebih kecil, Bu?', fallbackChoices: ['kemasan', 'warna', 'meja', 'jalan'] }, speakRequired: ['minta', 'kemasan', 'kecil'],
    sceneCaption: { de: 'Die Apothekerin zeigt eine große Packung und erklärt: „Kemasan besar ini cukup untuk satu bulan, Pak.“', en: 'The pharmacist shows a large pack and explains: “Kemasan besar ini cukup untuk satu bulan, Pak.”' },
    trophyWord: { word: 'kemasan', meaning: { de: 'Packung, Verpackung', en: 'pack, packaging' }, example: 'Saya pilih kemasan yang kecil.', whyThisWord: { de: 'Das Wort hilft dir, die gewünschte Menge über die Packungsgröße statt über das Medikament selbst zu ändern.', en: 'The word lets you change the quantity through the pack size rather than changing the medicine itself.' } },
    distractors: ['kemasan besar itu', 'dua obat lain'], placeholderCaption: { de: 'Eine große und eine kleine Arzneipackung stehen nebeneinander auf dem Apothekentresen.', en: 'A large and a small medicine pack stand side by side on the pharmacy counter.' }, songMood: 'a measured pharmacy phrase choosing the smaller box', visualNotes: 'Pharmacy counter, female pharmacist, large and small packages clearly contrasted under clean light.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tujuan-stasiun-bukan-mal', title: { de: 'Zum Bahnhof, nicht zum Einkaufszentrum', en: 'The station, not the mall' },
    situation: { de: 'Der Fahrer nennt das Einkaufszentrum als Ziel. Du korrigierst ihn höflich und nennst den Bahnhof.', en: 'The driver names the mall as the destination. Politely correct him and state the station.' },
    pedagogicalGoal: 'Mit tujuan saya das richtige Ziel nennen und mit bukan ein falsches Ortsnomen korrigieren.',
    targetText: 'Maaf, Pak, tujuan saya stasiun, bukan mal.', baseText: { de: 'Entschuldigung, mein Ziel ist der Bahnhof, nicht das Einkaufszentrum.', en: 'Excuse me, sir, my destination is the station, not the mall.' },
    chunks: [{ targetText: 'Maaf, Pak,', baseText: { de: 'Entschuldigung,', en: 'Excuse me, sir,' } }, { targetText: 'tujuan saya stasiun,', baseText: { de: 'mein Ziel ist der Bahnhof,', en: 'my destination is the station,' } }, { targetText: 'bukan mal.', baseText: { de: 'nicht das Einkaufszentrum.', en: 'not the mall.' } }],
    terms: [{ targetText: 'tujuan', baseText: { de: 'Ziel', en: 'destination' } }, { targetText: 'stasiun', baseText: { de: 'Bahnhof', en: 'station' } }, { targetText: 'bukan', baseText: { de: 'nicht, kein bei Nomen', en: 'not, used with nouns' } }, { targetText: 'mal', baseText: { de: 'Einkaufszentrum', en: 'mall' } }, { targetText: 'pengemudi', baseText: { de: 'Fahrer', en: 'driver' } }],
    recall: { before: 'Maaf, Pak, ', answer: 'tujuan', after: ' saya stasiun, bukan mal.', fallbackChoices: ['tujuan', 'barang', 'warna', 'ukuran'] }, speakRequired: ['tujuan', 'stasiun', 'bukan'],
    sceneCaption: { de: 'Der Fahrer prüft die Route und fragt: „Tujuannya mal, Pak?“', en: 'The driver checks the route and asks: “Tujuannya mal, Pak?”' },
    trophyWord: { word: 'tujuan', meaning: { de: 'Ziel, Reiseziel', en: 'destination, goal' }, example: 'Tujuan saya stasiun pusat.', whyThisWord: { de: 'Das Wort lenkt die Korrektur sofort auf den entscheidenden Punkt der Fahrt: den richtigen Zielort.', en: 'The word directs the correction straight to the key point of the ride: the right destination.' } },
    distractors: ['ke mal saja', 'lewat jalan besar'], placeholderCaption: { de: 'Eine Navigationskarte zeigt Bahnhof und Einkaufszentrum als zwei verschiedene Ziele.', en: 'A navigation map shows the station and mall as two different destinations.' }, songMood: 'a clear route correction that turns toward the station', visualNotes: 'Taxi dashboard, male driver, navigation screen with station and mall pins and the station selected.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'maaf-hari-ini-tidak-bisa', title: { de: 'Heute leider nicht', en: 'Not today, sorry' },
    situation: { de: 'Ein älterer Kollege lädt dich heute zum Mittagessen ein. Du lehnst höflich ab und lässt die Tür für ein anderes Mal offen.', en: 'An older colleague invites you to lunch today. Politely decline and leave the door open for another time.' },
    pedagogicalGoal: 'Mit maaf und hari ini saya tidak bisa eine Einladung respektvoll und ohne lange Erklärung ablehnen.',
    targetText: 'Maaf, hari ini saya tidak bisa, Pak. Lain kali, ya.', baseText: { de: 'Entschuldigung, heute kann ich leider nicht. Ein anderes Mal, ja?', en: 'Sorry, I cannot today, sir. Another time, okay?' },
    chunks: [{ targetText: 'Maaf, hari ini', baseText: { de: 'Entschuldigung, heute', en: 'Sorry, today' } }, { targetText: 'saya tidak bisa, Pak.', baseText: { de: 'kann ich leider nicht.', en: 'I cannot, sir.' } }, { targetText: 'Lain kali, ya.', baseText: { de: 'Ein anderes Mal, ja?', en: 'Another time, okay?' } }],
    terms: [{ targetText: 'maaf', baseText: { de: 'Entschuldigung, tut mir leid', en: 'sorry' } }, { targetText: 'hari ini', baseText: { de: 'heute', en: 'today' } }, { targetText: 'tidak bisa', baseText: { de: 'nicht können', en: 'cannot' } }, { targetText: 'lain kali', baseText: { de: 'ein anderes Mal', en: 'another time' } }, { targetText: 'makan siang', baseText: { de: 'Mittagessen', en: 'lunch' } }],
    recall: { before: 'Maaf, hari ini saya tidak ', answer: 'bisa', after: ', Pak. Lain kali, ya.', fallbackChoices: ['bisa', 'datang', 'makan', 'bayar'] }, speakRequired: ['maaf', 'bisa', 'kali'],
    sceneCaption: { de: 'Der ältere Kollege deutet auf das Restaurant und fragt: „Anda mau ikut makan siang hari ini?“', en: 'The older colleague gestures toward the restaurant and asks: “Anda mau ikut makan siang hari ini?”' },
    trophyWord: { word: 'maaf', meaning: { de: 'Entschuldigung, tut mir leid', en: 'sorry, excuse me' }, example: 'Maaf, hari ini saya sibuk.', whyThisWord: { de: 'Dieser höfliche Einstieg schützt die Beziehung, bevor du eine Einladung ablehnst.', en: 'This polite opener protects the relationship before you decline an invitation.' } },
    distractors: ['saya ikut sekarang', 'makan siang di sana'], placeholderCaption: { de: 'Ein Kollege wartet vor einem Restaurant, während du freundlich auf deinen vollen Tagesplan zeigst.', en: 'A colleague waits outside a restaurant while you politely point to your full schedule for today.' }, songMood: 'a respectful soft refusal that leaves another day open', visualNotes: 'Older male colleague near a lunch spot, polite exchange and a busy same-day calendar on the phone.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_5_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_FIVE_METADATA, indonesianA2Practical5Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 5 abgeschlossen und kannst Fehler, falsche Auswahl und Einladungen höflich korrigieren.', en: 'You have completed Indonesian A2 Practical 5 and can politely correct mistakes, wrong choices, and invitations.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_SIX_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-6', title: 'Indonesisch A2 Praxis 6', shortTitle: 'A2 Praxis 6',
  subtitle: { de: 'Dienstleistungen organisieren und alltägliche Besorgungen abschließen', en: 'Arranging services and completing everyday errands' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical6Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'tiga-baju-untuk-laundry', title: { de: 'Drei Teile zur Reinigung', en: 'Three items for laundry' },
    situation: { de: 'Du gibst drei Kleidungsstücke in einer Wäscherei ab. Du nennst die Menge und fragst nach der Fertigstellung.', en: 'You drop off three items at a laundry. State the quantity and ask when they can be ready.' },
    pedagogicalGoal: 'Mit titip drei Kleidungsstücke beim Wäscheservice abgeben und mit Bisa selesai kapan? nach der Fertigstellung fragen.',
    targetText: 'Saya mau laundry tiga baju ini, Bu. Kapan bisa selesai?', baseText: { de: 'Ich möchte diese drei Kleidungsstücke waschen lassen. Wann sind sie fertig?', en: 'I would like to have these three items washed, ma’am. When can they be done?' },
    chunks: [{ targetText: 'Saya mau laundry', baseText: { de: 'Ich möchte waschen lassen', en: 'I want to launder' } }, { targetText: 'tiga baju ini, Bu.', baseText: { de: 'diese drei Kleidungsstücke.', en: 'these three items, ma’am.' } }, { targetText: 'Kapan bisa selesai?', baseText: { de: 'Wann sind sie fertig?', en: 'When can they be done?' } }],
    terms: [{ targetText: 'titip', baseText: { de: 'zur Aufbewahrung geben, abgeben', en: 'to leave in someone’s care' } }, { targetText: 'tiga baju', baseText: { de: 'drei Kleidungsstücke', en: 'three items of clothing' } }, { targetText: 'laundry', baseText: { de: 'Wäscherei, Wäscheservice', en: 'laundry service' } }, { targetText: 'selesai', baseText: { de: 'fertig', en: 'finished, ready' } }, { targetText: 'kapan', baseText: { de: 'wann', en: 'when' } }],
    recall: { before: 'Saya mau ', answer: 'laundry', after: ' tiga baju ini, Bu. Kapan bisa selesai?', fallbackChoices: ['laundry', 'restoran', 'apotek', 'bengkel'] }, speakRequired: ['laundry', 'baju', 'selesai'],
    sceneCaption: { de: 'Die Mitarbeiterin zählt die Kleiderbügel und fragt: „Ada berapa baju untuk laundry, Pak?“', en: 'The attendant counts the hangers and asks: “Ada berapa baju untuk laundry, Pak?”' },
    trophyWord: { word: 'laundry', meaning: { de: 'Wäscherei, Wäscheservice', en: 'laundry service' }, example: 'Laundry ini buka sampai malam.', whyThisWord: { de: 'Dieses alltägliche Lehnwort bringt dich in Indonesien direkt zum richtigen Service für deine Kleidung.', en: 'This everyday loanword takes you straight to the right clothing service in Indonesia.' } },
    distractors: ['dua handuk hotel', 'ambil hari ini'], placeholderCaption: { de: 'Drei Kleidungsstücke hängen über dem Tresen einer kleinen Wäscherei.', en: 'Three items of clothing hang over the counter of a small laundry.' }, songMood: 'a practical drop-off rhythm with three garments in the count', visualNotes: 'Neighborhood laundry counter, female attendant, three garments on hangers and a service ticket.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'perbaiki-layar-telepon', title: { de: 'Der kaputte Bildschirm', en: 'The broken screen' },
    situation: { de: 'In einer Handywerkstatt bietet der Mitarbeiter Hilfe an. Du zeigst den kaputten Bildschirm und bittest um eine Reparatur.', en: 'At a phone repair shop, the technician offers help. Show the broken screen and ask for a repair.' },
    pedagogicalGoal: 'Mit Bisa perbaiki …? direkt um eine Reparatur bitten und das Problem mit rusak benennen.',
    targetText: 'Bisa perbaiki layar telepon ini, Pak? Layarnya rusak.', baseText: { de: 'Können Sie den Bildschirm dieses Handys reparieren? Der Bildschirm ist kaputt.', en: 'Can you repair this phone screen, sir? The screen is broken.' },
    chunks: [{ targetText: 'Bisa perbaiki', baseText: { de: 'Können Sie reparieren', en: 'Can you repair' } }, { targetText: 'layar telepon ini, Pak?', baseText: { de: 'den Bildschirm dieses Handys?', en: 'this phone screen, sir?' } }, { targetText: 'Layarnya rusak.', baseText: { de: 'Der Bildschirm ist kaputt.', en: 'The screen is broken.' } }],
    terms: [{ targetText: 'perbaiki', baseText: { de: 'reparieren', en: 'to repair' } }, { targetText: 'layar', baseText: { de: 'Bildschirm', en: 'screen' } }, { targetText: 'telepon', baseText: { de: 'Telefon, Handy', en: 'phone' } }, { targetText: 'rusak', baseText: { de: 'kaputt', en: 'broken' } }, { targetText: 'bengkel', baseText: { de: 'Werkstatt', en: 'repair shop' } }],
    recall: { before: 'Bisa ', answer: 'perbaiki', after: ' layar telepon ini, Pak? Layarnya rusak.', fallbackChoices: ['perbaiki', 'pesan', 'masak', 'sewa'] }, speakRequired: ['perbaiki', 'layar', 'rusak'],
    sceneCaption: { de: 'Der Techniker sieht dein Handy an und fragt: „Ada yang bisa saya bantu, Pak?“', en: 'The technician looks at your phone and asks: “Ada yang bisa saya bantu, Pak?”' },
    trophyWord: { word: 'perbaiki', meaning: { de: 'reparieren, in Ordnung bringen', en: 'to repair, fix' }, example: 'Tolong perbaiki layar telepon saya.', whyThisWord: { de: 'Das Verb sagt dem Techniker ohne Umweg, welche Dienstleistung du brauchst.', en: 'The verb tells the technician directly which service you need.' } },
    distractors: ['telepon baru itu', 'layarnya sangat besar'], placeholderCaption: { de: 'Ein Handy mit gesprungenem Bildschirm liegt auf der Werkbank.', en: 'A phone with a cracked screen lies on the repair bench.' }, songMood: 'a precise workshop beat focused on fixing one screen', visualNotes: 'Phone repair counter, male technician, cracked screen, small tools and a clear customer request.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'isi-pulsa-lima-puluh-ribu', title: { de: 'Guthaben aufladen', en: 'Top up phone credit' },
    situation: { de: 'Am Handyschalter fragt die Mitarbeiterin nach dem gewünschten Guthaben. Du nennst Betrag und Telefonnummer.', en: 'At the phone counter, the clerk asks how much credit you need. State the amount and phone number.' },
    pedagogicalGoal: 'Mit isi pulsa eine Aufladung verlangen und einen kurzen Betrag in ribu nennen.',
    targetText: 'Tolong isi pulsa lima puluh ribu, Bu. Nomor ini.', baseText: { de: 'Bitte laden Sie fünfzigtausend Rupiah Guthaben auf. Diese Nummer hier.', en: 'Please top up fifty thousand rupiah of phone credit, ma’am. This number.' },
    chunks: [{ targetText: 'Tolong isi pulsa', baseText: { de: 'Bitte laden Sie Guthaben auf', en: 'Please top up phone credit' } }, { targetText: 'lima puluh ribu, Bu.', baseText: { de: 'für fünfzigtausend Rupiah.', en: 'for fifty thousand rupiah, ma’am.' } }, { targetText: 'Nomor ini.', baseText: { de: 'Diese Nummer hier.', en: 'This number.' } }],
    terms: [{ targetText: 'isi pulsa', baseText: { de: 'Guthaben aufladen', en: 'top up phone credit' } }, { targetText: 'lima puluh ribu', baseText: { de: 'fünfzigtausend Rupiah', en: 'fifty thousand rupiah' } }, { targetText: 'nomor', baseText: { de: 'Nummer', en: 'number' } }, { targetText: 'pulsa', baseText: { de: 'Handyguthaben', en: 'phone credit' } }, { targetText: 'konter', baseText: { de: 'Verkaufsschalter', en: 'service counter' } }],
    recall: { before: 'Tolong ', answer: 'isi', after: ' pulsa lima puluh ribu, Bu. Nomor ini.', fallbackChoices: ['isi', 'tulis', 'baca', 'hitung'] }, speakRequired: ['isi', 'pulsa', 'nomor'],
    sceneCaption: { de: 'Die Mitarbeiterin öffnet das Aufladeformular und fragt: „Berapa pulsa yang Anda perlukan, Pak?“', en: 'The clerk opens the top-up form and asks: “Berapa pulsa yang Anda perlukan, Pak?”' },
    trophyWord: { word: 'isi', meaning: { de: 'füllen, aufladen', en: 'to fill, top up' }, example: 'Saya isi pulsa di konter ini.', whyThisWord: { de: 'In der festen Verbindung isi pulsa bezeichnet das Wort genau die gewünschte Aufladung.', en: 'In the fixed phrase isi pulsa, the word names the exact top-up service you want.' } },
    distractors: ['beli kartu baru', 'sepuluh ribu saja'], placeholderCaption: { de: 'Ein Aufladeformular zeigt fünfzigtausend Rupiah und eine Handynummer.', en: 'A top-up form shows fifty thousand rupiah and a phone number.' }, songMood: 'a bright digital pulse landing on a clear top-up amount', visualNotes: 'Phone-credit kiosk, female clerk, top-up screen with amount in words and customer phone number.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'buat-janji-hari-kamis', title: { de: 'Termin am Donnerstag', en: 'Appointment on Thursday' },
    situation: { de: 'Eine Sprechstundenhilfe fragt, welcher Tag für dich passt. Du vereinbarst einen Termin am Donnerstag um sieben.', en: 'A receptionist asks which day works for you. Make an appointment for Thursday at seven.' },
    pedagogicalGoal: 'Mit buat janji eine Terminabsicht ausdrücken und Tag sowie volle Uhrzeit nennen.',
    targetText: 'Saya perlu buat janji hari Kamis, Bu. Jam tujuh bisa?', baseText: { de: 'Ich muss einen Termin für Donnerstag vereinbaren. Ist sieben Uhr möglich?', en: 'I need to make an appointment for Thursday, ma’am. Is seven possible?' },
    chunks: [{ targetText: 'Saya perlu buat janji', baseText: { de: 'Ich muss einen Termin vereinbaren', en: 'I need to make an appointment' } }, { targetText: 'hari Kamis, Bu.', baseText: { de: 'für Donnerstag.', en: 'for Thursday, ma’am.' } }, { targetText: 'Jam tujuh bisa?', baseText: { de: 'Ist sieben Uhr möglich?', en: 'Is seven possible?' } }],
    terms: [{ targetText: 'buat janji', baseText: { de: 'einen Termin vereinbaren', en: 'make an appointment' } }, { targetText: 'hari Kamis', baseText: { de: 'Donnerstag', en: 'Thursday' } }, { targetText: 'jam tujuh', baseText: { de: 'sieben Uhr', en: 'seven o’clock' } }, { targetText: 'perlu', baseText: { de: 'brauchen, müssen', en: 'to need' } }, { targetText: 'cocok', baseText: { de: 'passen', en: 'to suit' } }],
    recall: { before: 'Saya perlu buat ', answer: 'janji', after: ' hari Kamis, Bu. Jam tujuh bisa?', fallbackChoices: ['janji', 'salinan', 'paket', 'meja'] }, speakRequired: ['janji', 'kamis', 'tujuh'],
    sceneCaption: { de: 'Die Sprechstundenhilfe öffnet den Kalender und fragt: „Hari apa yang cocok untuk Anda, Pak?“', en: 'The receptionist opens the calendar and asks: “Hari apa yang cocok untuk Anda, Pak?”' },
    trophyWord: { word: 'janji', meaning: { de: 'Termin, Verabredung', en: 'appointment, arrangement' }, example: 'Saya buat janji untuk hari Kamis.', whyThisWord: { de: 'Das Wort verwandelt eine lose Zeitfrage in einen festen, benennbaren Termin.', en: 'The word turns a loose question about time into a definite appointment.' } },
    distractors: ['hari Jumat siang', 'datang tanpa waktu'], placeholderCaption: { de: 'Ein Terminkalender zeigt Donnerstag um sieben als freien Platz.', en: 'An appointment calendar shows an open slot on Thursday at seven.' }, songMood: 'an orderly calendar phrase settling into a Thursday slot', visualNotes: 'Service desk, female receptionist, appointment book with Thursday and seven clearly marked.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minta-duplikat-kunci', title: { de: 'Einen Schlüssel kopieren', en: 'Copy a key' },
    situation: { de: 'In einem Schlüsseldienst fragt der Mitarbeiter, was du brauchst. Du verlangst eine Kopie und fragst nach dem Preis.', en: 'At a key-cutting shop, the clerk asks what you need. Request a copy and ask the price.' },
    pedagogicalGoal: 'Mit minta duplikat kunci eine konkrete Dienstleistung und anschließend den Preis erfragen.',
    targetText: 'Saya minta duplikat kunci ini, Pak. Berapa harganya?', baseText: { de: 'Ich möchte eine Kopie dieses Schlüssels. Wie viel kostet sie?', en: 'I would like a copy of this key, sir. How much is it?' },
    chunks: [{ targetText: 'Saya minta duplikat', baseText: { de: 'Ich möchte eine Kopie', en: 'I would like a copy' } }, { targetText: 'kunci ini, Pak.', baseText: { de: 'dieses Schlüssels.', en: 'of this key, sir.' } }, { targetText: 'Berapa harganya?', baseText: { de: 'Wie viel kostet sie?', en: 'How much is it?' } }],
    terms: [{ targetText: 'duplikat', baseText: { de: 'Duplikat, Kopie', en: 'duplicate, copy' } }, { targetText: 'kunci', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'minta', baseText: { de: 'bitten um, möchten', en: 'to ask for, want' } }, { targetText: 'harganya', baseText: { de: 'der Preis', en: 'the price' } }, { targetText: 'tukang kunci', baseText: { de: 'Schlüsseldienst', en: 'locksmith' } }],
    recall: { before: 'Saya minta ', answer: 'duplikat', after: ' kunci ini, Pak. Berapa harganya?', fallbackChoices: ['duplikat', 'nomor', 'warna', 'alamat'] }, speakRequired: ['duplikat', 'kunci', 'harganya'],
    sceneCaption: { de: 'Der Mitarbeiter betrachtet deinen Schlüssel und fragt: „Ada yang bisa saya bantu, Pak?“', en: 'The clerk examines your key and asks: “Ada yang bisa saya bantu, Pak?”' },
    trophyWord: { word: 'duplikat', meaning: { de: 'Duplikat, Kopie', en: 'duplicate, copy' }, example: 'Saya perlu duplikat kunci kamar.', whyThisWord: { de: 'Das Lehnwort bezeichnet am Schlüsseldienst genau das zweite Exemplar, das du brauchst.', en: 'At a key-cutting shop, this loanword names exactly the second copy you need.' } },
    distractors: ['kunci kamar rusak', 'dua gembok besar'], placeholderCaption: { de: 'Ein Originalschlüssel liegt neben einem frisch geschnittenen Duplikat.', en: 'An original key lies beside a freshly cut duplicate.' }, songMood: 'a metallic workshop rhythm shaped around one clean copy', visualNotes: 'Key-cutting counter, male clerk, original key and fresh duplicate beside the machine.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'ambil-paket-atas-nama', title: { de: 'Ein Paket abholen', en: 'Pick up a package' },
    situation: { de: 'Am Abholschalter fragt die Mitarbeiterin nach dem Namen auf dem Paket. Du nennst ihn und zeigst deine Karte.', en: 'At the collection counter, the clerk asks for the name on the package. State it and show your card.' },
    pedagogicalGoal: 'Mit ambil paket eine Abholung benennen und mit atas nama die Sendung zuordnen.',
    targetText: 'Saya ambil paket atas nama Martin, Bu. Ini kartunya.', baseText: { de: 'Ich hole ein Paket auf den Namen Martin ab. Hier ist die Karte.', en: 'I am picking up a package under the name Martin, ma’am. Here is the card.' },
    chunks: [{ targetText: 'Saya ambil paket', baseText: { de: 'Ich hole ein Paket ab', en: 'I am picking up a package' } }, { targetText: 'atas nama Martin, Bu.', baseText: { de: 'auf den Namen Martin.', en: 'under the name Martin, ma’am.' } }, { targetText: 'Ini kartunya.', baseText: { de: 'Hier ist die Karte.', en: 'Here is the card.' } }],
    terms: [{ targetText: 'ambil', baseText: { de: 'abholen, nehmen', en: 'to pick up, take' } }, { targetText: 'paket', baseText: { de: 'Paket', en: 'package' } }, { targetText: 'atas nama', baseText: { de: 'auf den Namen', en: 'under the name' } }, { targetText: 'kartunya', baseText: { de: 'die Karte', en: 'the card' } }, { targetText: 'loket', baseText: { de: 'Schalter', en: 'counter' } }],
    recall: { before: 'Saya ', answer: 'ambil', after: ' paket atas nama Martin, Bu. Ini kartunya.', fallbackChoices: ['ambil', 'kirim', 'buka', 'cari'] }, speakRequired: ['ambil', 'paket', 'kartunya'],
    sceneCaption: { de: 'Die Mitarbeiterin sucht in der Paketliste und fragt: „Paketnya atas nama siapa, Pak?“', en: 'The clerk searches the package list and asks: “Paketnya atas nama siapa, Pak?”' },
    trophyWord: { word: 'ambil', meaning: { de: 'nehmen, abholen', en: 'to take, pick up' }, example: 'Saya ambil paket di loket depan.', whyThisWord: { de: 'Das Verb unterscheidet eine Abholung klar von einer neuen Sendung oder Bestellung.', en: 'The verb clearly distinguishes collecting an item from sending or ordering one.' } },
    distractors: ['kirim paket kecil', 'nama pada tiket'], placeholderCaption: { de: 'Ein beschriftetes Paket und eine Abholkarte liegen am Serviceschalter.', en: 'A labeled package and collection card sit at the service counter.' }, songMood: 'a satisfying counter rhythm as the right package comes forward', visualNotes: 'Collection desk, female clerk, package labeled Martin and customer holding up a card.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sewa-sepeda-dua-hari', title: { de: 'Fahrrad für zwei Tage', en: 'Bike for two days' },
    situation: { de: 'Beim Fahrradverleih fragt der Mitarbeiter nach der Dauer. Du mietest das gezeigte Fahrrad für zwei Tage.', en: 'At the bicycle rental, the attendant asks for the duration. Rent the bike shown for two days.' },
    pedagogicalGoal: 'Mit sewa eine Miete ausdrücken und mit untuk dua hari die Dauer nennen.',
    targetText: 'Saya sewa sepeda ini untuk dua hari, Pak.', baseText: { de: 'Ich miete dieses Fahrrad für zwei Tage.', en: 'I am renting this bicycle for two days, sir.' },
    chunks: [{ targetText: 'Saya sewa', baseText: { de: 'Ich miete', en: 'I am renting' } }, { targetText: 'sepeda ini', baseText: { de: 'dieses Fahrrad', en: 'this bicycle' } }, { targetText: 'untuk dua hari, Pak.', baseText: { de: 'für zwei Tage.', en: 'for two days, sir.' } }],
    terms: [{ targetText: 'sewa', baseText: { de: 'mieten', en: 'to rent' } }, { targetText: 'sepeda', baseText: { de: 'Fahrrad', en: 'bicycle' } }, { targetText: 'dua hari', baseText: { de: 'zwei Tage', en: 'two days' } }, { targetText: 'helm', baseText: { de: 'Helm', en: 'helmet' } }, { targetText: 'harga sewa', baseText: { de: 'Mietpreis', en: 'rental price' } }],
    recall: { before: 'Saya ', answer: 'sewa', after: ' sepeda ini untuk dua hari, Pak.', fallbackChoices: ['sewa', 'jual', 'cuci', 'lihat'] }, speakRequired: ['sewa', 'sepeda', 'hari'],
    sceneCaption: { de: 'Der Mitarbeiter hält das Fahrrad fest und fragt: „Sepedanya untuk berapa hari, Pak?“', en: 'The attendant holds the bicycle and asks: “Sepedanya untuk berapa hari, Pak?”' },
    trophyWord: { word: 'sewa', meaning: { de: 'mieten, Miete', en: 'to rent, rental' }, example: 'Saya sewa sepeda dekat hotel.', whyThisWord: { de: 'Das Verb macht klar, dass du das Fahrrad zeitweise nutzt und nicht kaufst.', en: 'The verb makes clear that you are using the bicycle temporarily rather than buying it.' } },
    distractors: ['satu hari saja', 'beli sepeda baru'], placeholderCaption: { de: 'Ein Mietfahrrad steht neben einem Schild mit zwei markierten Tagen.', en: 'A rental bicycle stands beside a sign with two days marked.' }, songMood: 'a rolling two-day rhythm ready for city streets', visualNotes: 'Bicycle rental counter, male attendant, city bike, helmet and a two-day rental card.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'toko-buka-sampai-kapan', title: { de: 'Bis wann geöffnet?', en: 'Open until when?' },
    situation: { de: 'In einem Kopierladen bietet die Mitarbeiterin Hilfe an. Du fragst nach der Schließzeit des Geschäfts.', en: 'At a copy shop, the clerk offers help. Ask what time the shop closes.' },
    pedagogicalGoal: 'Mit buka sampai jam berapa nach den gegenwärtigen Öffnungszeiten eines Geschäfts fragen.',
    targetText: 'Permisi, toko ini buka sampai jam berapa, Bu?', baseText: { de: 'Entschuldigung, bis wie viel Uhr ist dieses Geschäft geöffnet?', en: 'Excuse me, what time is this shop open until, ma’am?' },
    chunks: [{ targetText: 'Permisi, toko ini', baseText: { de: 'Entschuldigung, dieses Geschäft', en: 'Excuse me, this shop' } }, { targetText: 'buka sampai', baseText: { de: 'ist geöffnet bis', en: 'is open until' } }, { targetText: 'jam berapa, Bu?', baseText: { de: 'wie viel Uhr?', en: 'what time, ma’am?' } }],
    terms: [{ targetText: 'toko', baseText: { de: 'Geschäft, Laden', en: 'shop, store' } }, { targetText: 'buka', baseText: { de: 'geöffnet sein', en: 'to be open' } }, { targetText: 'sampai', baseText: { de: 'bis', en: 'until' } }, { targetText: 'jam berapa', baseText: { de: 'um wie viel Uhr', en: 'what time' } }, { targetText: 'fotokopi', baseText: { de: 'Fotokopie', en: 'photocopy' } }],
    recall: { before: 'Permisi, toko ini buka sampai jam ', answer: 'berapa', after: ', Bu?', fallbackChoices: ['berapa', 'siapa', 'mengapa', 'bagaimana'] }, speakRequired: ['toko', 'buka', 'berapa'],
    sceneCaption: { de: 'Die Mitarbeiterin steht am Kopierer und fragt: „Ada yang Anda cari, Pak?“', en: 'The clerk stands by the copier and asks: “Ada yang Anda cari, Pak?”' },
    trophyWord: { word: 'toko', meaning: { de: 'Geschäft, Laden', en: 'shop, store' }, example: 'Toko fotokopi ini buka sampai malam.', whyThisWord: { de: 'Das Wort bindet die Zeitfrage eindeutig an das Geschäft und seine Öffnungszeiten.', en: 'The word clearly ties the time question to the shop and its opening hours.' } },
    distractors: ['saya perlu dua salinan', 'mesinnya dekat pintu'], placeholderCaption: { de: 'Ein Kopierladen zeigt seine Öffnungszeiten neben der Eingangstür.', en: 'A copy shop displays its opening hours beside the entrance.' }, songMood: 'a ticking storefront phrase that checks the closing hour', visualNotes: 'Copy shop, female clerk by a copier, opening-hours sign beside the door and a wall clock.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'teleponnya-siap', title: { de: 'Das Handy abholen', en: 'Collect the phone' },
    situation: { de: 'Du kehrst in die Handywerkstatt zurück. Du sagst, dass du dein Handy abholst, und fragst, ob es bereit ist.', en: 'You return to the phone repair shop. Say you are collecting your phone and ask whether it is ready.' },
    pedagogicalGoal: 'Eine Abholung im Präsens mit ambil benennen und mit siap nach dem aktuellen Zustand fragen.',
    targetText: 'Saya ambil telepon saya, Pak. Teleponnya siap?', baseText: { de: 'Ich hole mein Handy ab. Ist es bereit?', en: 'I am picking up my phone, sir. Is it ready?' },
    chunks: [{ targetText: 'Saya ambil', baseText: { de: 'Ich hole ab', en: 'I am picking up' } }, { targetText: 'telepon saya, Pak.', baseText: { de: 'mein Handy.', en: 'my phone, sir.' } }, { targetText: 'Teleponnya siap?', baseText: { de: 'Ist es bereit?', en: 'Is the phone ready?' } }],
    terms: [{ targetText: 'ambil', baseText: { de: 'abholen', en: 'to pick up' } }, { targetText: 'telepon saya', baseText: { de: 'mein Handy', en: 'my phone' } }, { targetText: 'siap', baseText: { de: 'bereit, fertig', en: 'ready' } }, { targetText: 'tanda terima', baseText: { de: 'Abholschein', en: 'receipt slip' } }, { targetText: 'perbaikan', baseText: { de: 'Reparatur', en: 'repair' } }],
    recall: { before: 'Saya ambil telepon saya, Pak. Teleponnya ', answer: 'siap', after: '?', fallbackChoices: ['siap', 'rusak', 'baru', 'mahal'] }, speakRequired: ['ambil', 'telepon', 'siap'],
    sceneCaption: { de: 'Der Techniker begrüßt dich am Werkstatttresen und fragt: „Ada yang bisa saya bantu, Pak?“', en: 'The technician greets you at the repair counter and asks: “Ada yang bisa saya bantu, Pak?”' },
    trophyWord: { word: 'siap', meaning: { de: 'bereit, fertig', en: 'ready' }, example: 'Teleponnya siap di meja depan.', whyThisWord: { de: 'Das Adjektiv prüft den aktuellen Zustand des Geräts, ohne eine vergangene Reparaturhandlung erzählen zu müssen.', en: 'The adjective checks the device’s current state without narrating a past repair action.' } },
    distractors: ['saya beli telepon', 'layarnya masih rusak'], placeholderCaption: { de: 'Ein Handy liegt fertig am Werkstatttresen neben einem Abholschein.', en: 'A phone rests ready on the repair counter beside a collection slip.' }, songMood: 'a resolved workshop cadence as the phone returns to the counter', visualNotes: 'Phone repair shop, male technician, ready phone, receipt slip and organized tools in the background.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'semua-urusan-selesai', title: { de: 'Alles erledigt', en: 'All errands done' },
    situation: { de: 'Nach deinem letzten Servicegang fragt die Mitarbeiterin, ob du noch etwas brauchst. Du bedankst dich und verabschiedest dich bis Donnerstag.', en: 'After your final service stop, the clerk asks whether you need anything else. Thank her and say goodbye until Thursday.' },
    pedagogicalGoal: 'Mit semua urusan selesai den aktuellen Abschluss der Besorgungen ausdrücken und eine knappe Verabschiedung anschließen.',
    targetText: 'Terima kasih, Bu. Semua urusan selesai. Sampai hari Kamis.', baseText: { de: 'Vielen Dank. Alle Besorgungen sind erledigt. Bis Donnerstag.', en: 'Thank you, ma’am. All the errands are complete. See you on Thursday.' },
    chunks: [{ targetText: 'Terima kasih, Bu.', baseText: { de: 'Vielen Dank.', en: 'Thank you, ma’am.' } }, { targetText: 'Semua urusan selesai.', baseText: { de: 'Alle Besorgungen sind erledigt.', en: 'All the errands are complete.' } }, { targetText: 'Sampai hari Kamis.', baseText: { de: 'Bis Donnerstag.', en: 'See you on Thursday.' } }],
    terms: [{ targetText: 'semua', baseText: { de: 'alle', en: 'all' } }, { targetText: 'urusan', baseText: { de: 'Besorgung, Angelegenheit', en: 'errand, matter' } }, { targetText: 'selesai', baseText: { de: 'erledigt, fertig', en: 'complete, finished' } }, { targetText: 'sampai', baseText: { de: 'bis', en: 'until, see you' } }, { targetText: 'hari Kamis', baseText: { de: 'Donnerstag', en: 'Thursday' } }],
    recall: { before: 'Terima kasih, Bu. Semua ', answer: 'urusan', after: ' selesai. Sampai hari Kamis.', fallbackChoices: ['urusan', 'paket', 'kamar', 'pesan'] }, speakRequired: ['urusan', 'selesai', 'kamis'],
    sceneCaption: { de: 'Die Mitarbeiterin schließt das Formular und fragt: „Ada lagi yang Anda perlukan, Pak?“', en: 'The clerk closes the form and asks: “Ada lagi yang Anda perlukan, Pak?”' },
    trophyWord: { word: 'urusan', meaning: { de: 'Angelegenheit, Besorgung', en: 'matter, errand' }, example: 'Semua urusan saya selesai hari ini.', whyThisWord: { de: 'Das Wort bündelt Wäscherei, Reparatur und Termine zu einem natürlichen Abschluss deiner Besorgungen.', en: 'The word gathers laundry, repairs, and appointments into a natural close to your errands.' } },
    distractors: ['saya perlu bantuan', 'ambil paket lain'], placeholderCaption: { de: 'Mehrere Servicebelege liegen ordentlich zusammen, während das letzte Formular geschlossen wird.', en: 'Several service receipts lie neatly together as the final form is closed.' }, songMood: 'a satisfied errand-day finale with every loose end tied', visualNotes: 'Service counter, female clerk closing a form, laundry ticket, repair slip and appointment card grouped neatly.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_6_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_SIX_METADATA, indonesianA2Practical6Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 6 abgeschlossen und kannst Dienstleistungen, Termine und Abholungen selbstständig organisieren.', en: 'You have completed Indonesian A2 Practical 6 and can independently arrange services, appointments, and collections.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_SEVEN_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-7', title: 'Indonesisch A2 Praxis 7', shortTitle: 'A2 Praxis 7',
  subtitle: { de: 'Empfehlungen erfragen, Orte beschreiben und die beste Wahl finden', en: 'Asking for recommendations, describing places, and finding the best choice' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical7Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'apa-rekomendasi-ibu', title: { de: 'Was empfehlen Sie?', en: 'What do you recommend?' },
    situation: { de: 'Die Bedienung reicht dir die Mittagskarte. Du fragst nach ihrer Empfehlung für ein leckeres, leichtes Gericht.', en: 'The server hands you the lunch menu. Ask for her recommendation for a tasty, light dish.' },
    pedagogicalGoal: 'Mit Apa rekomendasi Ibu? höflich eine Empfehlung erfragen und zwei gewünschte Eigenschaften nennen.',
    targetText: 'Apa rekomendasi Ibu? Saya ingin makanan yang enak dan ringan.', baseText: { de: 'Was empfehlen Sie? Ich möchte ein Gericht, das lecker und leicht ist.', en: 'What do you recommend, ma’am? I would like food that is tasty and light.' },
    chunks: [{ targetText: 'Apa rekomendasi Ibu?', baseText: { de: 'Was empfehlen Sie?', en: 'What do you recommend, ma’am?' } }, { targetText: 'Saya ingin makanan', baseText: { de: 'Ich möchte ein Gericht', en: 'I would like food' } }, { targetText: 'yang enak dan ringan.', baseText: { de: 'das lecker und leicht ist.', en: 'that is tasty and light.' } }],
    terms: [{ targetText: 'rekomendasi', baseText: { de: 'Empfehlung', en: 'recommendation' } }, { targetText: 'ingin', baseText: { de: 'möchten', en: 'to want' } }, { targetText: 'makanan', baseText: { de: 'Essen, Gericht', en: 'food, dish' } }, { targetText: 'enak', baseText: { de: 'lecker', en: 'tasty' } }, { targetText: 'ringan', baseText: { de: 'leicht', en: 'light' } }],
    recall: { before: 'Apa ', answer: 'rekomendasi', after: ' Ibu? Saya ingin makanan yang enak dan ringan.', fallbackChoices: ['rekomendasi', 'alamat', 'harga', 'jadwal'] }, speakRequired: ['rekomendasi', 'makanan', 'ringan'],
    sceneCaption: { de: 'Die Bedienung öffnet die Mittagskarte und fragt: „Anda siap memilih, Pak?“', en: 'The server opens the lunch menu and asks: “Anda siap memilih, Pak?”' },
    trophyWord: { word: 'rekomendasi', meaning: { de: 'Empfehlung', en: 'recommendation' }, example: 'Apa rekomendasi Ibu untuk makan siang?', whyThisWord: { de: 'Mit diesem Wort bittest du eine ortskundige Person direkt um eine passende Auswahl.', en: 'This word lets you directly ask someone with local knowledge for a suitable choice.' } },
    distractors: ['saya pesan nasi goreng', 'makanan yang sangat pedas'], placeholderCaption: { de: 'Eine geöffnete Mittagskarte liegt zwischen der Bedienung und einem unentschlossenen Gast.', en: 'An open lunch menu lies between the server and an undecided guest.' }, songMood: 'a curious lunchtime melody opening toward a local favorite', visualNotes: 'Small restaurant at lunch, female server with an open menu, light dishes pictured and the guest asking for guidance.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kalau-begitu-pilih-itu', title: { de: 'Das ist meine Wahl', en: 'That is my choice' },
    situation: { de: 'Die Bedienung empfiehlt Gado-Gado als beliebtes Gericht. Du nimmst die Empfehlung an und beschreibst deinen ersten Eindruck.', en: 'The server recommends gado-gado as a popular dish. Accept the recommendation and describe your first impression.' },
    pedagogicalGoal: 'Mit dem festen Ausdruck Kalau begitu eine Empfehlung annehmen und das Gericht mit zwei Adjektiven beschreiben.',
    targetText: 'Kalau begitu, saya pilih itu, Bu. Kelihatannya segar dan ringan.', baseText: { de: 'Dann wähle ich das. Es sieht frisch und leicht aus.', en: 'In that case, I choose that, ma’am. It looks fresh and light.' },
    chunks: [{ targetText: 'Kalau begitu,', baseText: { de: 'Dann,', en: 'In that case,' } }, { targetText: 'saya pilih itu, Bu.', baseText: { de: 'wähle ich das.', en: 'I choose that, ma’am.' } }, { targetText: 'Kelihatannya segar', baseText: { de: 'Es sieht frisch', en: 'It looks fresh' } }, { targetText: 'dan ringan.', baseText: { de: 'und leicht aus.', en: 'and light.' } }],
    terms: [{ targetText: 'kalau begitu', baseText: { de: 'dann, in diesem Fall', en: 'in that case' } }, { targetText: 'pilih', baseText: { de: 'auswählen', en: 'to choose' } }, { targetText: 'kelihatannya', baseText: { de: 'es sieht aus', en: 'it looks' } }, { targetText: 'segar', baseText: { de: 'frisch', en: 'fresh' } }, { targetText: 'ringan', baseText: { de: 'leicht', en: 'light' } }],
    recall: { before: 'Kalau begitu, saya ', answer: 'pilih', after: ' itu, Bu. Kelihatannya segar dan ringan.', fallbackChoices: ['pilih', 'cuci', 'sewa', 'tulis'] }, speakRequired: ['begitu', 'pilih', 'segar'],
    sceneCaption: { de: 'Die Bedienung zeigt auf das beliebteste Gericht und sagt: „Gado-gado paling populer di sini, Pak.“', en: 'The server points to the most popular dish and says: “Gado-gado paling populer di sini, Pak.”' },
    trophyWord: { word: 'begitu', meaning: { de: 'so, auf diese Weise', en: 'like that, in that case' }, example: 'Kalau begitu, saya pilih menu itu.', whyThisWord: { de: 'Im festen Ausdruck Kalau begitu leitest du damit eine natürliche Entscheidung nach einem Rat ein.', en: 'In the fixed phrase Kalau begitu, it naturally introduces a decision made after receiving advice.' } },
    distractors: ['saya masih memilih', 'kelihatannya terlalu pedas'], placeholderCaption: { de: 'Ein Teller Gado-Gado steht neben der markierten Empfehlung auf der Speisekarte.', en: 'A plate of gado-gado sits beside the highlighted recommendation on the menu.' }, songMood: 'a bright accepting cadence with a fresh plate arriving', visualNotes: 'Restaurant table, female server pointing to gado-gado, colorful vegetables and an approving guest response.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'daerah-paling-aman', title: { de: 'Die beste Gegend zum Spazieren', en: 'The best area for a walk' },
    situation: { de: 'Ein Hotelmitarbeiter bietet dir einen Stadtplan an. Du fragst nach der sichersten und ruhigsten Gegend für einen Spaziergang.', en: 'A hotel clerk offers you a city map. Ask for the safest and quietest area for a walk.' },
    pedagogicalGoal: 'Mit paling zwei Eigenschaften hervorheben und nach einer geeigneten Gegend zum Spazieren fragen.',
    targetText: 'Pak, daerah mana yang paling aman dan paling tenang untuk jalan kaki?', baseText: { de: 'Welche Gegend ist am sichersten und am ruhigsten zum Spazierengehen?', en: 'Sir, which area is the safest and quietest for walking?' },
    chunks: [{ targetText: 'Pak, daerah mana', baseText: { de: 'Welche Gegend', en: 'Sir, which area' } }, { targetText: 'yang paling aman dan paling tenang', baseText: { de: 'ist am sichersten und am ruhigsten', en: 'is the safest and quietest' } }, { targetText: 'untuk jalan kaki?', baseText: { de: 'zum Spazierengehen?', en: 'for walking?' } }],
    terms: [{ targetText: 'daerah', baseText: { de: 'Gegend', en: 'area' } }, { targetText: 'paling aman', baseText: { de: 'am sichersten', en: 'safest' } }, { targetText: 'tenang', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'jalan kaki', baseText: { de: 'zu Fuß gehen', en: 'to walk' } }, { targetText: 'sore', baseText: { de: 'später Nachmittag', en: 'late afternoon' } }],
    recall: { before: 'Pak, daerah mana yang paling ', answer: 'aman', after: ' dan paling tenang untuk jalan kaki?', fallbackChoices: ['aman', 'mahal', 'sempit', 'panas'] }, speakRequired: ['daerah', 'aman', 'tenang'],
    sceneCaption: { de: 'Der Hotelmitarbeiter breitet den Stadtplan aus und fragt: „Anda mencari tempat untuk jalan kaki, Pak?“', en: 'The hotel clerk unfolds the city map and asks: “Anda mencari tempat untuk jalan kaki, Pak?”' },
    trophyWord: { word: 'aman', meaning: { de: 'sicher', en: 'safe' }, example: 'Daerah ini aman untuk jalan kaki.', whyThisWord: { de: 'Das Adjektiv macht Sicherheit zu einem klaren Kriterium für deine Wahl einer Spazierroute.', en: 'This adjective makes safety a clear criterion when choosing a walking route.' } },
    distractors: ['dekat pusat belanja', 'untuk naik taksi'], placeholderCaption: { de: 'Ein Stadtplan zeigt eine grüne, ruhige Spazierroute durch ein sicheres Viertel.', en: 'A city map shows a green, quiet walking route through a safe neighborhood.' }, songMood: 'an easy walking rhythm tracing a calm route across the map', visualNotes: 'Hotel desk, male clerk, city map with a shaded walking district, trees and clear pedestrian paths.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'taman-tenang-dan-sejuk', title: { de: 'Der Park am Fluss', en: 'The park by the river' },
    situation: { de: 'Eine ältere Nachbarin fragt nach dem Park am Fluss. Du beschreibst ihn als ruhig und angenehm kühl.', en: 'An older neighbor asks about the park by the river. Describe it as quiet and pleasantly cool.' },
    pedagogicalGoal: 'Einen Ort im Präsens mit zwei Adjektiven und der Lageangabe di sebelah beschreiben.',
    targetText: 'Taman di sebelah sungai itu tenang dan sejuk, Bu.', baseText: { de: 'Der Park neben dem Fluss ist ruhig und angenehm kühl.', en: 'The park beside the river is quiet and pleasantly cool, ma’am.' },
    chunks: [{ targetText: 'Taman di sebelah sungai itu', baseText: { de: 'Der Park neben dem Fluss', en: 'The park beside the river' } }, { targetText: 'tenang dan sejuk,', baseText: { de: 'ist ruhig und angenehm kühl,', en: 'is quiet and pleasantly cool,' } }, { targetText: 'Bu.', baseText: { de: 'bitte.', en: 'ma’am.' } }],
    terms: [{ targetText: 'taman di sebelah sungai', baseText: { de: 'Park neben dem Fluss', en: 'park beside the river' } }, { targetText: 'tenang', baseText: { de: 'ruhig', en: 'quiet' } }, { targetText: 'sejuk', baseText: { de: 'angenehm kühl', en: 'pleasantly cool' } }, { targetText: 'di sebelah', baseText: { de: 'neben', en: 'beside' } }, { targetText: 'sungai', baseText: { de: 'Fluss', en: 'river' } }],
    recall: { before: 'Taman di sebelah sungai itu tenang dan ', answer: 'sejuk', after: ', Bu.', fallbackChoices: ['sejuk', 'panas', 'gelap', 'sempit'] }, speakRequired: ['taman', 'sejuk', 'sungai'],
    sceneCaption: { de: 'Die ältere Nachbarin blickt zum Fluss und fragt: „Bagaimana taman di sebelah sungai itu, Pak?“', en: 'The older neighbor looks toward the river and asks: “Bagaimana taman di sebelah sungai itu, Pak?”' },
    trophyWord: { word: 'sejuk', meaning: { de: 'angenehm kühl', en: 'pleasantly cool' }, example: 'Udara di taman dekat sungai terasa sejuk.', whyThisWord: { de: 'Das Wort beschreibt die angenehme Kühle, die den Park für einen Spaziergang attraktiv macht.', en: 'The word describes the pleasant coolness that makes the park inviting for a walk.' } },
    distractors: ['di belakang hotel', 'tamannya ramai sekali'], placeholderCaption: { de: 'Ein schattiger Park liegt ruhig am Ufer eines breiten Flusses.', en: 'A shaded park rests quietly along the bank of a broad river.' }, songMood: 'a cool riverside acoustic breeze under quiet trees', visualNotes: 'Riverside park, older female neighbor, shaded benches, calm water and leaves moving in a light breeze.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kafe-paling-dekat', title: { de: 'Das beste Café in der Nähe', en: 'The best cafe nearby' },
    situation: { de: 'Ein Hotelmitarbeiter erwähnt mehrere Cafés in der Umgebung. Du fragst nach dem nächsten und leckersten.', en: 'A hotel clerk mentions several cafes nearby. Ask which one is the closest and has the best food.' },
    pedagogicalGoal: 'Mit paling dekat und paling enak zwei Spitzenmerkmale in einer Empfehlungsfrage verbinden.',
    targetText: 'Pak, kafe mana yang paling dekat dan makanannya paling enak?', baseText: { de: 'Welches Café ist am nächsten und hat das beste Essen?', en: 'Sir, which cafe is the closest and has the best food?' },
    chunks: [{ targetText: 'Pak, kafe mana', baseText: { de: 'Welches Café', en: 'Sir, which cafe' } }, { targetText: 'yang paling dekat', baseText: { de: 'ist am nächsten', en: 'is the closest' } }, { targetText: 'dan makanannya paling enak?', baseText: { de: 'und hat das beste Essen?', en: 'and has the best food?' } }],
    terms: [{ targetText: 'kafe', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'paling', baseText: { de: 'am meisten, am besten', en: 'most' } }, { targetText: 'paling dekat', baseText: { de: 'am nächsten', en: 'closest' } }, { targetText: 'paling enak', baseText: { de: 'am leckersten', en: 'tastiest' } }, { targetText: 'sekitar sini', baseText: { de: 'hier in der Umgebung', en: 'around here' } }],
    recall: { before: 'Pak, kafe mana yang paling ', answer: 'dekat', after: ' dan makanannya paling enak?', fallbackChoices: ['dekat', 'jauh', 'mahal', 'ramai'] }, speakRequired: ['kafe', 'paling', 'dekat'],
    sceneCaption: { de: 'Der Hotelmitarbeiter markiert mehrere Orte und sagt: „Ada beberapa kafe di sekitar sini, Pak.“', en: 'The hotel clerk marks several places and says: “Ada beberapa kafe di sekitar sini, Pak.”' },
    trophyWord: { word: 'paling', meaning: { de: 'am meisten, am besten', en: 'most' }, example: 'Kafe ini paling dekat dari hotel.', whyThisWord: { de: 'Mit diesem Wort fragst du nicht nur nach einer guten, sondern nach der besten passenden Option.', en: 'This word lets you ask not merely for a good option but for the best-fitting one.' } },
    distractors: ['kafe di kota tua', 'yang buka besok'], placeholderCaption: { de: 'Drei Cafés sind auf einer kleinen Umgebungskarte mit Entfernung und Speisen markiert.', en: 'Three cafes are marked on a small neighborhood map with distance and food cues.' }, songMood: 'a lively cafe-search motif narrowing toward one nearby favorite', visualNotes: 'Hotel counter, male clerk, neighborhood map with three cafe pins, one close pin highlighted beside a pastry icon.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'ide-oleh-oleh-ringan', title: { de: 'Ein kleines Mitbringsel', en: 'A small gift idea' },
    situation: { de: 'In einem Geschenkgeschäft fragt die Verkäuferin, für wen das Geschenk sein soll. Du bittest um eine Idee für ein kleines, leichtes Mitbringsel.', en: 'In a gift shop, the clerk asks who you are shopping for. Ask for an idea for a small, light souvenir.' },
    pedagogicalGoal: 'Mit ada ide nach einem Vorschlag fragen und zwei praktische Eigenschaften eines Mitbringsels nennen.',
    targetText: 'Bu, ada ide oleh-oleh yang kecil dan ringan untuk teman?', baseText: { de: 'Haben Sie eine Idee für ein kleines, leichtes Mitbringsel für einen Freund?', en: 'Ma’am, do you have an idea for a small, light souvenir for a friend?' },
    chunks: [{ targetText: 'Bu, ada ide', baseText: { de: 'Haben Sie eine Idee', en: 'Ma’am, do you have an idea' } }, { targetText: 'oleh-oleh yang kecil dan ringan', baseText: { de: 'für ein kleines, leichtes Mitbringsel', en: 'for a small, light souvenir' } }, { targetText: 'untuk teman?', baseText: { de: 'für einen Freund?', en: 'for a friend?' } }],
    terms: [{ targetText: 'ide', baseText: { de: 'Idee', en: 'idea' } }, { targetText: 'oleh-oleh', baseText: { de: 'Mitbringsel, Souvenir', en: 'souvenir, gift' } }, { targetText: 'kecil', baseText: { de: 'klein', en: 'small' } }, { targetText: 'ringan', baseText: { de: 'leicht', en: 'light' } }, { targetText: 'teman', baseText: { de: 'Freundin oder Freund', en: 'friend' } }],
    recall: { before: 'Bu, ada ide oleh-oleh yang kecil dan ', answer: 'ringan', after: ' untuk teman?', fallbackChoices: ['ringan', 'berat', 'mahal', 'pedas'] }, speakRequired: ['ide', 'kecil', 'ringan'],
    sceneCaption: { de: 'Die Verkäuferin zeigt auf das Souvenirregal und fragt: „Anda mencari oleh-oleh untuk siapa, Pak?“', en: 'The clerk points to the souvenir shelf and asks: “Anda mencari oleh-oleh untuk siapa, Pak?”' },
    trophyWord: { word: 'ide', meaning: { de: 'Idee, Einfall', en: 'idea' }, example: 'Ide ini cocok untuk oleh-oleh kecil.', whyThisWord: { de: 'Das Wort öffnet die Frage für einen hilfreichen Vorschlag, wenn du noch keinen bestimmten Gegenstand suchst.', en: 'The word opens the question to a helpful suggestion when you do not yet have a specific item in mind.' } },
    distractors: ['hadiah yang sangat besar', 'untuk kamar hotel'], placeholderCaption: { de: 'Kleine leichte Souvenirs stehen ordentlich in einem Geschenkregal.', en: 'Small lightweight souvenirs are arranged neatly on a gift-shop shelf.' }, songMood: 'a playful gift-shop melody searching for one easy keepsake', visualNotes: 'Gift shop, female clerk, compact woven souvenirs, small boxes and a traveler comparing lightweight options.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'restoran-khas-dekat-hotel', title: { de: 'Typisch und günstig', en: 'Local and affordable' },
    situation: { de: 'Der Concierge fragt, ob du in Hotelnähe essen möchtest. Du suchst ein typisches, günstiges Restaurant.', en: 'The concierge asks whether you want to eat near the hotel. Ask for a local, affordable restaurant.' },
    pedagogicalGoal: 'Mit khas und murah zwei Eigenschaften für eine konkrete Restaurantempfehlung nennen.',
    targetText: 'Pak, restoran mana di dekat hotel yang makanannya khas dan murah?', baseText: { de: 'Welches Restaurant in Hotelnähe hat typisches, günstiges Essen?', en: 'Sir, which restaurant near the hotel has local, affordable food?' },
    chunks: [{ targetText: 'Pak, restoran mana', baseText: { de: 'Welches Restaurant', en: 'Sir, which restaurant' } }, { targetText: 'di dekat hotel', baseText: { de: 'in Hotelnähe', en: 'near the hotel' } }, { targetText: 'yang makanannya khas dan murah?', baseText: { de: 'hat typisches, günstiges Essen?', en: 'has local, affordable food?' } }],
    terms: [{ targetText: 'restoran', baseText: { de: 'Restaurant', en: 'restaurant' } }, { targetText: 'khas', baseText: { de: 'typisch, charakteristisch', en: 'typical, distinctive' } }, { targetText: 'murah', baseText: { de: 'günstig', en: 'affordable' } }, { targetText: 'dekat hotel', baseText: { de: 'in Hotelnähe', en: 'near the hotel' } }, { targetText: 'makanan lokal', baseText: { de: 'lokales Essen', en: 'local food' } }],
    recall: { before: 'Pak, restoran mana di dekat hotel yang makanannya ', answer: 'khas', after: ' dan murah?', fallbackChoices: ['khas', 'modern', 'mahal', 'jauh'] }, speakRequired: ['restoran', 'khas', 'murah'],
    sceneCaption: { de: 'Der Concierge nimmt die Umgebungskarte zur Hand und fragt: „Anda mencari tempat makan dekat hotel, Pak?“', en: 'The concierge picks up the neighborhood map and asks: “Anda mencari tempat makan dekat hotel, Pak?”' },
    trophyWord: { word: 'khas', meaning: { de: 'typisch, charakteristisch', en: 'typical, distinctive' }, example: 'Restoran itu menyajikan makanan khas daerah ini.', whyThisWord: { de: 'Das Wort lenkt die Empfehlung auf einen Ort mit lokalem Charakter statt auf eine beliebige Kette.', en: 'The word directs the recommendation toward a place with local character rather than an ordinary chain.' } },
    distractors: ['restoran mahal di mal', 'jauh dari pusat kota'], placeholderCaption: { de: 'Ein kleines lokales Restaurant liegt nur wenige Schritte vom Hotel entfernt.', en: 'A small local restaurant sits only a few steps from the hotel.' }, songMood: 'a warm local-food groove just around the hotel corner', visualNotes: 'Hotel entrance, male concierge pointing toward a modest nearby restaurant with local dishes on a chalkboard.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'pasar-malam-ramai-seru', title: { de: 'Meine Empfehlung für den Abend', en: 'My evening recommendation' },
    situation: { de: 'Eine Besucherin fragt dich nach einer Empfehlung für den Abend. Du empfiehlst den lebhaften, unterhaltsamen Nachtmarkt.', en: 'A visitor asks you for an evening recommendation. Recommend the lively, fun night market.' },
    pedagogicalGoal: 'Mit saya sarankan selbst eine Empfehlung geben und den Ort mit zwei Adjektiven beschreiben.',
    targetText: 'Saya sarankan pasar malam itu, Bu. Tempatnya ramai dan seru.', baseText: { de: 'Ich empfehle Ihnen den Nachtmarkt. Dort ist es lebhaft und unterhaltsam.', en: 'I recommend that night market, ma’am. The place is lively and fun.' },
    chunks: [{ targetText: 'Saya sarankan', baseText: { de: 'Ich empfehle', en: 'I recommend' } }, { targetText: 'pasar malam itu, Bu.', baseText: { de: 'Ihnen den Nachtmarkt.', en: 'that night market, ma’am.' } }, { targetText: 'Tempatnya ramai dan seru.', baseText: { de: 'Dort ist es lebhaft und unterhaltsam.', en: 'The place is lively and fun.' } }],
    terms: [{ targetText: 'sarankan', baseText: { de: 'empfehlen, vorschlagen', en: 'to recommend, suggest' } }, { targetText: 'pasar malam', baseText: { de: 'Nachtmarkt', en: 'night market' } }, { targetText: 'tempatnya', baseText: { de: 'der Ort', en: 'the place' } }, { targetText: 'ramai', baseText: { de: 'belebt', en: 'lively' } }, { targetText: 'seru', baseText: { de: 'spannend, unterhaltsam', en: 'exciting, fun' } }],
    recall: { before: 'Saya sarankan pasar malam itu, Bu. Tempatnya ramai dan ', answer: 'seru', after: '.', fallbackChoices: ['seru', 'sepi', 'mahal', 'jauh'] }, speakRequired: ['sarankan', 'pasar', 'seru'],
    sceneCaption: { de: 'Die Besucherin schaut auf ihren Abendplan und fragt: „Apa rekomendasi Anda untuk malam ini, Pak?“', en: 'The visitor looks at her evening plan and asks: “Apa rekomendasi Anda untuk malam ini, Pak?”' },
    trophyWord: { word: 'seru', meaning: { de: 'spannend, unterhaltsam', en: 'exciting, fun' }, example: 'Pasar malam itu ramai dan seru.', whyThisWord: { de: 'Das Adjektiv erklärt, warum der Nachtmarkt mehr als nur nah oder praktisch ist.', en: 'This adjective explains why the night market offers more than simple convenience or proximity.' } },
    distractors: ['kafe kecil dekat hotel', 'tempatnya tenang sekali'], placeholderCaption: { de: 'Ein heller Nachtmarkt füllt sich mit Essensständen, Lichtern und fröhlichen Besuchern.', en: 'A bright night market fills with food stalls, lights, and cheerful visitors.' }, songMood: 'a lively night-market pulse under strings of warm lights', visualNotes: 'Night market, female visitor listening, colorful food stalls, lanterns and a lively crowd stretching down the lane.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'makanan-penutup-manis', title: { de: 'Etwas Süßes zum Kaffee', en: 'Something sweet with coffee' },
    situation: { de: 'Die Bedienung bietet dir Nachtisch zum Kaffee an. Du fragst, welche Option süß ist und gut dazu passt.', en: 'The server offers dessert with your coffee. Ask which option is sweet and pairs well with it.' },
    pedagogicalGoal: 'Mit mana eine Empfehlung eingrenzen und zwei passende Eigenschaften für einen Nachtisch nennen.',
    targetText: 'Bu, makanan penutup mana yang manis dan cocok dengan kopi?', baseText: { de: 'Welcher Nachtisch ist süß und passt gut zum Kaffee?', en: 'Ma’am, which dessert is sweet and goes well with coffee?' },
    chunks: [{ targetText: 'Bu, makanan penutup mana', baseText: { de: 'Welcher Nachtisch', en: 'Ma’am, which dessert' } }, { targetText: 'yang manis dan cocok', baseText: { de: 'ist süß und passt gut', en: 'is sweet and goes well' } }, { targetText: 'dengan kopi?', baseText: { de: 'zum Kaffee?', en: 'with coffee?' } }],
    terms: [{ targetText: 'makanan penutup', baseText: { de: 'Nachtisch', en: 'dessert' } }, { targetText: 'manis', baseText: { de: 'süß', en: 'sweet' } }, { targetText: 'cocok', baseText: { de: 'passen', en: 'to suit, pair well' } }, { targetText: 'dengan kopi', baseText: { de: 'zum Kaffee', en: 'with coffee' } }, { targetText: 'kue', baseText: { de: 'Kuchen, Gebäck', en: 'cake, pastry' } }],
    recall: { before: 'Bu, makanan penutup mana yang ', answer: 'manis', after: ' dan cocok dengan kopi?', fallbackChoices: ['manis', 'asin', 'pedas', 'pahit'] }, speakRequired: ['penutup', 'manis', 'cocok'],
    sceneCaption: { de: 'Die Bedienung stellt die Dessertkarte neben den Kaffee und fragt: „Anda mencari makanan penutup untuk kopi, Pak?“', en: 'The server places the dessert menu beside the coffee and asks: “Anda mencari makanan penutup untuk kopi, Pak?”' },
    trophyWord: { word: 'manis', meaning: { de: 'süß', en: 'sweet' }, example: 'Kue kelapa ini manis dan cocok dengan kopi.', whyThisWord: { de: 'Das Adjektiv benennt die Geschmacksrichtung, die du als Ergänzung zum Kaffee suchst.', en: 'The adjective names the flavor you want as a complement to coffee.' } },
    distractors: ['minuman dingin itu', 'yang pedas dan asin'], placeholderCaption: { de: 'Kaffee und mehrere kleine Desserts stehen gemeinsam auf einem Probiertablett.', en: 'Coffee and several small desserts share a tasting tray.' }, songMood: 'a sweet cafe refrain pairing pastry with a warm cup', visualNotes: 'Cafe table, female server, coffee cup, coconut cake and several dessert choices arranged on a small tray.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kue-lembut-enak', title: { de: 'Wirklich köstlich', en: 'Really delicious' },
    situation: { de: 'Die Bedienung fragt nach deinem Urteil über den empfohlenen Kuchen. Du bedankst dich und beschreibst ihn begeistert.', en: 'The server asks what you think of the recommended cake. Thank her and describe it enthusiastically.' },
    pedagogicalGoal: 'Eine Empfehlung mit terima kasih würdigen und das Ergebnis mit zwei positiven Adjektiven beschreiben.',
    targetText: 'Terima kasih, Bu. Kue ini sangat lembut dan enak sekali.', baseText: { de: 'Vielen Dank. Dieser Kuchen ist sehr weich und wirklich köstlich.', en: 'Thank you, ma’am. This cake is very soft and truly delicious.' },
    chunks: [{ targetText: 'Terima kasih, Bu.', baseText: { de: 'Vielen Dank.', en: 'Thank you, ma’am.' } }, { targetText: 'Kue ini sangat lembut', baseText: { de: 'Dieser Kuchen ist sehr weich', en: 'This cake is very soft' } }, { targetText: 'dan enak sekali.', baseText: { de: 'und wirklich köstlich.', en: 'and truly delicious.' } }],
    terms: [{ targetText: 'terima kasih', baseText: { de: 'vielen Dank', en: 'thank you' } }, { targetText: 'kue', baseText: { de: 'Kuchen, Gebäck', en: 'cake, pastry' } }, { targetText: 'sangat', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'lembut', baseText: { de: 'weich, zart', en: 'soft, tender' } }, { targetText: 'enak sekali', baseText: { de: 'wirklich köstlich', en: 'very delicious' } }],
    recall: { before: 'Terima kasih, Bu. Kue ini sangat ', answer: 'lembut', after: ' dan enak sekali.', fallbackChoices: ['lembut', 'keras', 'kering', 'asin'] }, speakRequired: ['kue', 'lembut', 'enak'],
    sceneCaption: { de: 'Die Bedienung sieht den fast leeren Teller und fragt: „Bagaimana kuenya, Pak?“', en: 'The server notices the nearly empty plate and asks: “Bagaimana kuenya, Pak?”' },
    trophyWord: { word: 'lembut', meaning: { de: 'weich, zart', en: 'soft, tender' }, example: 'Kue ini lembut dan enak sekali.', whyThisWord: { de: 'Das Adjektiv ergänzt den Geschmack um die Textur und macht dein Lob anschaulicher.', en: 'The adjective adds texture to flavor and makes your praise more vivid.' } },
    distractors: ['kopinya terlalu pahit', 'kue itu masih panas'], placeholderCaption: { de: 'Nur ein kleines Stück weicher Kuchen bleibt neben der Kaffeetasse übrig.', en: 'Only a small piece of soft cake remains beside the coffee cup.' }, songMood: 'a satisfied dessert finale with a soft golden cadence', visualNotes: 'Cafe table, female server, nearly empty cake plate, tender crumb visible and a warm coffee cup nearby.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_7_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_SEVEN_METADATA, indonesianA2Practical7Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 7 abgeschlossen und kannst Empfehlungen erfragen, Orte beschreiben und die beste Wahl erkennen.', en: 'You have completed Indonesian A2 Practical 7 and can ask for recommendations, describe places, and identify the best choice.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_EIGHT_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-8', title: 'Indonesisch A2 Praxis 8', shortTitle: 'A2 Praxis 8',
  subtitle: { de: 'Mit einem Freund reagieren, Gefühle teilen und über den Alltag plaudern', en: 'Reacting with a friend, sharing feelings, and making everyday small talk' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical8Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'wah-kamu-pasti-senang', title: { de: 'Was für gute Nachrichten!', en: 'What great news!' },
    situation: { de: 'Deine Kollegin ist inzwischen eine Freundin und erzählt von ihrer neuen Stelle. Du gratulierst ihr begeistert.', en: 'Your colleague has become a friend and tells you about her new job. Congratulate her enthusiastically.' },
    pedagogicalGoal: 'Mit Wah und selamat spontan auf gute Nachrichten reagieren und mit pasti ein Gefühl einschätzen.',
    targetText: 'Wah, selamat! Kamu pasti senang sekali.', baseText: { de: 'Wow, Glückwunsch! Du bist bestimmt sehr froh.', en: 'Wow, congratulations! You must be very happy.' },
    chunks: [{ targetText: 'Wah, selamat!', baseText: { de: 'Wow, Glückwunsch!', en: 'Wow, congratulations!' } }, { targetText: 'Kamu pasti', baseText: { de: 'Du bist bestimmt', en: 'You must be' } }, { targetText: 'senang sekali.', baseText: { de: 'sehr froh.', en: 'very happy.' } }],
    terms: [{ targetText: 'wah', baseText: { de: 'wow', en: 'wow' } }, { targetText: 'selamat', baseText: { de: 'Glückwunsch', en: 'congratulations' } }, { targetText: 'pasti', baseText: { de: 'bestimmt, sicher', en: 'surely, certainly' } }, { targetText: 'senang', baseText: { de: 'froh', en: 'happy' } }, { targetText: 'pekerjaan baru', baseText: { de: 'neue Stelle', en: 'new job' } }],
    recall: { before: 'Wah, selamat! Kamu ', answer: 'pasti', after: ' senang sekali.', fallbackChoices: ['pasti', 'mungkin', 'jarang', 'belum'] }, speakRequired: ['selamat', 'pasti', 'senang'],
    sceneCaption: { de: 'Deine Freundin strahlt und sagt: „Kamu tahu? Saya punya pekerjaan baru!“', en: 'Your friend beams and says: “Kamu tahu? Saya punya pekerjaan baru!”' },
    trophyWord: { word: 'pasti', meaning: { de: 'bestimmt, sicher', en: 'surely, certainly' }, example: 'Kamu pasti senang dengan pekerjaan baru.', whyThisWord: { de: 'Das Wort zeigt, dass du die Freude deiner Freundin sofort erkennst und mit ihr teilst.', en: 'The word shows that you immediately recognize and share the happiness of your friend.' } },
    distractors: ['kamu terlihat lelah', 'pekerjaannya sangat sulit'], placeholderCaption: { de: 'Zwei Freunde feiern lächelnd eine Nachricht über eine neue Stelle.', en: 'Two friends smile as they celebrate news about a new job.' }, songMood: 'a bright congratulatory burst with an easy friendly chorus', visualNotes: 'Two friends near an office cafe, one holding a new-job message while the other reacts with a delighted smile.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'panas-sekali-minum-es', title: { de: 'Heiß heute, oder?', en: 'Hot today, right?' },
    situation: { de: 'Dein Freund spricht die Hitze an. Du stimmst zu und schlägst ein kaltes Getränk vor.', en: 'Your friend comments on the heat. Agree and suggest a cold drink.' },
    pedagogicalGoal: 'Mit panas sekali die gegenwärtige Hitze verstärken und locker ein Getränk vorschlagen.',
    targetText: 'Iya, panas sekali. Kamu mau minum es teh?', baseText: { de: 'Ja, es ist sehr heiß. Möchtest du Eistee trinken?', en: 'Yes, it is very hot. Do you want to drink iced tea?' },
    chunks: [{ targetText: 'Iya, panas sekali.', baseText: { de: 'Ja, es ist sehr heiß.', en: 'Yes, it is very hot.' } }, { targetText: 'Kamu mau minum', baseText: { de: 'Möchtest du trinken', en: 'Do you want to drink' } }, { targetText: 'es teh?', baseText: { de: 'Eistee?', en: 'iced tea?' } }],
    terms: [{ targetText: 'panas', baseText: { de: 'heiß', en: 'hot' } }, { targetText: 'sekali', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'minum', baseText: { de: 'trinken', en: 'to drink' } }, { targetText: 'es teh', baseText: { de: 'Eistee', en: 'iced tea' } }, { targetText: 'merasa', baseText: { de: 'sich fühlen', en: 'to feel' } }],
    recall: { before: 'Iya, ', answer: 'panas', after: ' sekali. Kamu mau minum es teh?', fallbackChoices: ['panas', 'dingin', 'sejuk', 'basah'] }, speakRequired: ['panas', 'minum', 'teh'],
    sceneCaption: { de: 'Dein Freund fächelt sich Luft zu und fragt: „Kamu juga merasa panas sekali hari ini?“', en: 'Your friend fans himself and asks: “Kamu juga merasa panas sekali hari ini?”' },
    trophyWord: { word: 'panas', meaning: { de: 'heiß', en: 'hot' }, example: 'Hari ini panas sekali di luar.', whyThisWord: { de: 'Das Adjektiv greift das gemeinsame Wettergefühl auf und eröffnet ganz natürlich weiteren Small Talk.', en: 'The adjective picks up the shared feeling about the weather and naturally opens more small talk.' } },
    distractors: ['kamu mau kopi panas', 'hari ini hujan'], placeholderCaption: { de: 'Zwei Freunde sitzen im Schatten, während zwei Gläser Eistee auf dem Tisch beschlagen.', en: 'Two friends sit in the shade while two glasses of iced tea gather condensation on the table.' }, songMood: 'a sunlit acoustic groove cooling down over iced tea', visualNotes: 'Shaded street cafe, two friends in hot weather, paper fans and cold tea glasses beaded with water.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kurang-tidur-dan-mengantuk', title: { de: 'Noch müde vom Abend', en: 'Still sleepy from last night' },
    situation: { de: 'Deine Freundin bemerkt, dass du müde aussiehst. Du erzählst von der vergangenen Nacht und fragst nach ihrem Zustand.', en: 'Your friend notices that you look tired. Tell her about last night and ask how she feels.' },
    pedagogicalGoal: 'Mit tadi malam einen abgeschlossenen Schlafmangel markieren und mit mengantuk einen gegenwärtigen Zustand benennen.',
    targetText: 'Iya, tadi malam saya kurang tidur. Kamu juga mengantuk?', baseText: { de: 'Ja, letzte Nacht habe ich zu wenig geschlafen. Bist du auch schläfrig?', en: 'Yes, I did not get enough sleep last night. Are you sleepy too?' },
    chunks: [{ targetText: 'Iya, tadi malam', baseText: { de: 'Ja, letzte Nacht', en: 'Yes, last night' } }, { targetText: 'saya kurang tidur.', baseText: { de: 'habe ich zu wenig geschlafen.', en: 'I did not get enough sleep.' } }, { targetText: 'Kamu juga mengantuk?', baseText: { de: 'Bist du auch schläfrig?', en: 'Are you sleepy too?' } }],
    terms: [{ targetText: 'tadi malam', baseText: { de: 'letzte Nacht', en: 'last night' } }, { targetText: 'kurang tidur', baseText: { de: 'zu wenig schlafen', en: 'not to get enough sleep' } }, { targetText: 'mengantuk', baseText: { de: 'schläfrig', en: 'sleepy' } }, { targetText: 'juga', baseText: { de: 'auch', en: 'also' } }, { targetText: 'kelihatan', baseText: { de: 'aussehen', en: 'to look' } }],
    recall: { before: 'Iya, tadi malam saya kurang tidur. Kamu juga ', answer: 'mengantuk', after: '?', fallbackChoices: ['mengantuk', 'lapar', 'sibuk', 'sehat'] }, speakRequired: ['malam', 'kurang', 'mengantuk'],
    sceneCaption: { de: 'Deine Freundin sieht dein müdes Gesicht und fragt: „Kamu kelihatan mengantuk. Ada apa?“', en: 'Your friend notices your tired face and asks: “Kamu kelihatan mengantuk. Ada apa?”' },
    trophyWord: { word: 'mengantuk', meaning: { de: 'schläfrig', en: 'sleepy' }, example: 'Saya mengantuk karena kurang tidur.', whyThisWord: { de: 'Das Wort verbindet die kurze Geschichte über die Nacht mit deinem Zustand im aktuellen Gespräch.', en: 'The word connects the short story about last night with how you feel in the current conversation.' } },
    distractors: ['saya tidur nyenyak', 'kamu terlihat segar'], placeholderCaption: { de: 'Zwei Freunde halten müde ihre Kaffeetassen im frühen Morgenlicht.', en: 'Two friends hold their coffee cups sleepily in the early morning light.' }, songMood: 'a drowsy morning phrase with a soft shared yawn', visualNotes: 'Morning cafe, two friends, tired eyes, coffee cups and pale sunlight after a short night.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'minggu-ini-sibuk', title: { de: 'Eine volle Woche', en: 'A busy week' },
    situation: { de: 'Dein Freund fragt nach deiner Arbeitswoche. Du sagst, dass du sehr beschäftigt bist, und fragst zurück.', en: 'Your friend asks about your workweek. Say that you are very busy and ask about him.' },
    pedagogicalGoal: 'Mit minggu ini und sibuk sekali einen gegenwärtigen Wochenzustand beschreiben und zurückfragen.',
    targetText: 'Iya, minggu ini saya sibuk sekali. Kamu bagaimana?', baseText: { de: 'Ja, diese Woche bin ich sehr beschäftigt. Und wie ist es bei dir?', en: 'Yes, I am very busy this week. How about you?' },
    chunks: [{ targetText: 'Iya, minggu ini', baseText: { de: 'Ja, diese Woche', en: 'Yes, this week' } }, { targetText: 'saya sibuk sekali.', baseText: { de: 'bin ich sehr beschäftigt.', en: 'I am very busy.' } }, { targetText: 'Kamu bagaimana?', baseText: { de: 'Und wie ist es bei dir?', en: 'How about you?' } }],
    terms: [{ targetText: 'minggu ini', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'sibuk', baseText: { de: 'beschäftigt', en: 'busy' } }, { targetText: 'sekali', baseText: { de: 'sehr', en: 'very' } }, { targetText: 'bagaimana', baseText: { de: 'wie', en: 'how' } }, { targetText: 'pekerjaan', baseText: { de: 'Arbeit', en: 'work' } }],
    recall: { before: 'Iya, minggu ini saya ', answer: 'sibuk', after: ' sekali. Kamu bagaimana?', fallbackChoices: ['sibuk', 'lapar', 'dingin', 'tenang'] }, speakRequired: ['minggu', 'sibuk', 'bagaimana'],
    sceneCaption: { de: 'Dein Freund legt sein Arbeitsheft beiseite und fragt: „Kamu punya banyak pekerjaan minggu ini?“', en: 'Your friend puts his work notebook aside and asks: “Kamu punya banyak pekerjaan minggu ini?”' },
    trophyWord: { word: 'sibuk', meaning: { de: 'beschäftigt', en: 'busy' }, example: 'Minggu ini saya sibuk sekali di kantor.', whyThisWord: { de: 'Das Adjektiv fasst eine volle Woche knapp zusammen und lädt zu einer freundlichen Rückfrage ein.', en: 'The adjective sums up a full week concisely and invites a friendly question in return.' } },
    distractors: ['minggu ini sangat tenang', 'kamu bekerja besok'], placeholderCaption: { de: 'Ein voller Wochenplan liegt zwischen zwei Freunden bei einer kurzen Pause.', en: 'A full weekly schedule lies between two friends during a short break.' }, songMood: 'a quick weekday rhythm pausing for one friendly check-in', visualNotes: 'Two friends on a break, full planner, work notebook and cups on a small table.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'hujan-lagi-menunggu', title: { de: 'Schon wieder Regen', en: 'Rain again' },
    situation: { de: 'Deine Freundin fragt, ob du einen Regenschirm dabeihast. Du reagierst auf den neuen Regen und schlägst vor zu warten.', en: 'Your friend asks whether you brought an umbrella. React to the rain and suggest waiting.' },
    pedagogicalGoal: 'Mit Aduh spontan reagieren und hujan lagi als gegenwärtige Wettersituation benennen.',
    targetText: 'Aduh, hujan lagi. Kamu mau menunggu di sini?', baseText: { de: 'Ach, es regnet schon wieder. Möchtest du hier warten?', en: 'Oh no, it is raining again. Do you want to wait here?' },
    chunks: [{ targetText: 'Aduh, hujan lagi.', baseText: { de: 'Ach, es regnet schon wieder.', en: 'Oh no, it is raining again.' } }, { targetText: 'Kamu mau menunggu', baseText: { de: 'Möchtest du warten', en: 'Do you want to wait' } }, { targetText: 'di sini?', baseText: { de: 'hier?', en: 'here?' } }],
    terms: [{ targetText: 'aduh', baseText: { de: 'ach, oh nein', en: 'oh no' } }, { targetText: 'hujan', baseText: { de: 'Regen, regnen', en: 'rain, to rain' } }, { targetText: 'lagi', baseText: { de: 'wieder', en: 'again' } }, { targetText: 'menunggu', baseText: { de: 'warten', en: 'to wait' } }, { targetText: 'payung', baseText: { de: 'Regenschirm', en: 'umbrella' } }],
    recall: { before: 'Aduh, ', answer: 'hujan', after: ' lagi. Kamu mau menunggu di sini?', fallbackChoices: ['hujan', 'panas', 'angin', 'cerah'] }, speakRequired: ['hujan', 'menunggu', 'sini'],
    sceneCaption: { de: 'Dein Freund schaut aus dem Fenster und sagt: „Wah, deras sekali hujannya.“', en: 'Your friend looks out the window and says: “Wah, deras sekali hujannya.”' },
    trophyWord: { word: 'hujan', meaning: { de: 'Regen, regnen', en: 'rain, to rain' }, example: 'Hari ini hujan lagi sejak siang.', whyThisWord: { de: 'Das Wort benennt sofort die gemeinsame Situation, auf die ihr euren nächsten Schritt abstimmt.', en: 'The word immediately names the shared situation that shapes what you do next.' } },
    distractors: ['kamu jalan sekarang', 'payungnya ada di rumah'], placeholderCaption: { de: 'Zwei Freunde stehen unter einem Vordach, während Regen auf die Straße fällt.', en: 'Two friends stand under an awning as rain falls onto the street.' }, songMood: 'a rainy acoustic patter sheltered beneath a friendly pause', visualNotes: 'Street awning, two friends, sudden rain, one closed umbrella and puddles beginning to form.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sayang-sekali-temani', title: { de: 'Oh, wie schade', en: 'Oh, what a shame' },
    situation: { de: 'Deine Freundin erzählt, dass ihre Katze krank ist. Du reagierst mitfühlend und bietest Begleitung zum Tierarzt an.', en: 'Your friend says that her cat is ill. React sympathetically and offer to accompany her to the vet.' },
    pedagogicalGoal: 'Mit Aduh, sayang sekali! Mitgefühl zeigen und anschließend konkrete Unterstützung anbieten.',
    targetText: 'Aduh, sayang sekali. Kamu mau saya temani ke dokter hewan?', baseText: { de: 'Ach, wie schade. Soll ich dich zum Tierarzt begleiten?', en: 'Oh, what a shame. Do you want me to accompany you to the vet?' },
    chunks: [{ targetText: 'Aduh, sayang sekali.', baseText: { de: 'Ach, wie schade.', en: 'Oh, what a shame.' } }, { targetText: 'Kamu mau saya temani', baseText: { de: 'Soll ich dich begleiten', en: 'Do you want me to accompany you' } }, { targetText: 'ke dokter hewan?', baseText: { de: 'zum Tierarzt?', en: 'to the vet?' } }],
    terms: [{ targetText: 'sayang sekali', baseText: { de: 'wie schade', en: 'what a shame' } }, { targetText: 'temani', baseText: { de: 'begleiten', en: 'to accompany' } }, { targetText: 'dokter hewan', baseText: { de: 'Tierarzt', en: 'vet' } }, { targetText: 'kucing', baseText: { de: 'Katze', en: 'cat' } }, { targetText: 'sakit', baseText: { de: 'krank', en: 'ill' } }],
    recall: { before: 'Aduh, ', answer: 'sayang', after: ' sekali. Kamu mau saya temani ke dokter hewan?', fallbackChoices: ['sayang', 'mahal', 'dingin', 'sibuk'] }, speakRequired: ['sayang', 'temani', 'dokter'],
    sceneCaption: { de: 'Deine Freundin hält den Katzenkorb fest und sagt: „Kamu tahu? Kucing saya sakit hari ini.“', en: 'Your friend holds the cat carrier and says: “Kamu tahu? Kucing saya sakit hari ini.”' },
    trophyWord: { word: 'sayang', meaning: { de: 'schade; lieb', en: 'a pity; dear' }, example: 'Sayang sekali kucing itu sakit.', whyThisWord: { de: 'In sayang sekali drückt das Wort sofort ehrliches Mitgefühl für eine schlechte Nachricht aus.', en: 'In sayang sekali, the word immediately expresses sincere sympathy for bad news.' } },
    distractors: ['kucingnya sangat sehat', 'kamu pergi sendiri'], placeholderCaption: { de: 'Zwei Freunde stehen besorgt neben einem Katzenkorb vor einer Tierarztpraxis.', en: 'Two friends stand concerned beside a cat carrier outside a veterinary clinic.' }, songMood: 'a tender sympathetic phrase moving toward practical support', visualNotes: 'Two friends, cat carrier, veterinary clinic sign and a gentle offer of company.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'cukup-baik-kamu-sendiri', title: { de: 'Ganz gut, und du?', en: 'Pretty good, and you?' },
    situation: { de: 'Dein Freund fragt, wie es dir insgesamt geht. Du antwortest knapp und gibst die Frage zurück.', en: 'Your friend asks how things are going overall. Give a brief answer and return the question.' },
    pedagogicalGoal: 'Mit cukup baik einen ausgewogenen Zustand ausdrücken und mit kamu sendiri natürlich zurückfragen.',
    targetText: 'Cukup baik. Kamu sendiri bagaimana minggu ini?', baseText: { de: 'Ganz gut. Und wie geht es dir diese Woche?', en: 'Pretty good. How about you this week?' },
    chunks: [{ targetText: 'Cukup baik.', baseText: { de: 'Ganz gut.', en: 'Pretty good.' } }, { targetText: 'Kamu sendiri bagaimana', baseText: { de: 'Und wie geht es dir selbst', en: 'How about you' } }, { targetText: 'minggu ini?', baseText: { de: 'diese Woche?', en: 'this week?' } }],
    terms: [{ targetText: 'cukup baik', baseText: { de: 'ganz gut', en: 'pretty good' } }, { targetText: 'sendiri', baseText: { de: 'selbst', en: 'yourself' } }, { targetText: 'bagaimana', baseText: { de: 'wie', en: 'how' } }, { targetText: 'minggu ini', baseText: { de: 'diese Woche', en: 'this week' } }, { targetText: 'kabar', baseText: { de: 'Befinden, Neuigkeiten', en: 'news, condition' } }],
    recall: { before: 'Cukup baik. Kamu ', answer: 'sendiri', after: ' bagaimana minggu ini?', fallbackChoices: ['sendiri', 'juga', 'bahkan', 'memang'] }, speakRequired: ['cukup', 'sendiri', 'minggu'],
    sceneCaption: { de: 'Dein Freund setzt sich zu dir und fragt: „Bagaimana kabarmu? Kamu baik-baik saja?“', en: 'Your friend sits down beside you and asks: “Bagaimana kabarmu? Kamu baik-baik saja?”' },
    trophyWord: { word: 'sendiri', meaning: { de: 'selbst, allein', en: 'yourself, alone' }, example: 'Kamu sendiri bagaimana hari ini?', whyThisWord: { de: 'Das Wort lenkt die Aufmerksamkeit freundlich zurück auf dein Gegenüber und hält das Gespräch im Fluss.', en: 'The word turns attention back to the other person in a friendly way and keeps the conversation moving.' } },
    distractors: ['saya sangat lelah', 'minggu depan sibuk'], placeholderCaption: { de: 'Zwei Freunde sitzen entspannt zusammen und tauschen kurze Neuigkeiten aus.', en: 'Two friends sit together comfortably and exchange brief updates.' }, songMood: 'a relaxed conversational loop passing the question back', visualNotes: 'Neighborhood bench, two friends in easy conversation, relaxed posture and a quiet afternoon street.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kamu-memang-hebat', title: { de: 'Das ist großartig!', en: 'That is fantastic!' },
    situation: { de: 'Deine Freundin zeigt dir ihre sehr gute Prüfungsnote. Du reagierst begeistert und lobst sie.', en: 'Your friend shows you her excellent exam result. React enthusiastically and praise her.' },
    pedagogicalGoal: 'Mit Wah und bagus sekali auf großartige Nachrichten reagieren und mit memang hebat ehrlich loben.',
    targetText: 'Wah, bagus sekali! Kamu memang hebat.', baseText: { de: 'Wow, das ist großartig! Du bist wirklich klasse.', en: 'Wow, that is great! You really are amazing.' },
    chunks: [{ targetText: 'Wah, bagus sekali!', baseText: { de: 'Wow, das ist großartig!', en: 'Wow, that is great!' } }, { targetText: 'Kamu memang', baseText: { de: 'Du bist wirklich', en: 'You really are' } }, { targetText: 'hebat.', baseText: { de: 'klasse.', en: 'amazing.' } }],
    terms: [{ targetText: 'bagus sekali', baseText: { de: 'großartig', en: 'great' } }, { targetText: 'memang', baseText: { de: 'wirklich, tatsächlich', en: 'indeed, really' } }, { targetText: 'hebat', baseText: { de: 'großartig, klasse', en: 'amazing, excellent' } }, { targetText: 'nilai ujian', baseText: { de: 'Prüfungsnote', en: 'exam result' } }, { targetText: 'wah', baseText: { de: 'wow', en: 'wow' } }],
    recall: { before: 'Wah, bagus sekali! Kamu memang ', answer: 'hebat', after: '.', fallbackChoices: ['hebat', 'lelah', 'lapar', 'diam'] }, speakRequired: ['bagus', 'memang', 'hebat'],
    sceneCaption: { de: 'Deine Freundin zeigt dir ihre Prüfungsnote und sagt: „Kamu tahu? Nilai ujian saya bagus sekali!“', en: 'Your friend shows you her exam result and says: “Kamu tahu? Nilai ujian saya bagus sekali!”' },
    trophyWord: { word: 'hebat', meaning: { de: 'großartig, klasse', en: 'amazing, excellent' }, example: 'Kamu memang hebat dalam pelajaran ini.', whyThisWord: { de: 'Das Adjektiv verwandelt deine Überraschung in ein direktes, persönliches Lob.', en: 'The adjective turns your surprise into direct, personal praise.' } },
    distractors: ['nilainya cukup rendah', 'kamu belajar besok'], placeholderCaption: { de: 'Eine sehr gute Prüfungsnote leuchtet auf dem Handy zwischen zwei jubelnden Freunden.', en: 'An excellent exam result glows on a phone between two celebrating friends.' }, songMood: 'a quick triumphant pop of praise between friends', visualNotes: 'Two friends, phone displaying a high exam score, raised hands and delighted expressions.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kopi-hangat-pagi-ini', title: { de: 'Kaffee für den kalten Morgen', en: 'Coffee for the cold morning' },
    situation: { de: 'Ein kalter, regnerischer Morgen überrascht euch beide. Du stimmst deiner Freundin zu und schlägst warmen Kaffee vor.', en: 'A cold, rainy morning catches both of you. Agree with your friend and suggest warm coffee.' },
    pedagogicalGoal: 'Eine gegenwärtige Wetterempfindung mit dingin sekali verstärken und ein passendes warmes Getränk vorschlagen.',
    targetText: 'Iya, dingin sekali. Kamu mau minum kopi hangat?', baseText: { de: 'Ja, es ist sehr kalt. Möchtest du warmen Kaffee trinken?', en: 'Yes, it is very cold. Do you want to drink warm coffee?' },
    chunks: [{ targetText: 'Iya, dingin sekali.', baseText: { de: 'Ja, es ist sehr kalt.', en: 'Yes, it is very cold.' } }, { targetText: 'Kamu mau minum', baseText: { de: 'Möchtest du trinken', en: 'Do you want to drink' } }, { targetText: 'kopi hangat?', baseText: { de: 'warmen Kaffee?', en: 'warm coffee?' } }],
    terms: [{ targetText: 'dingin', baseText: { de: 'kalt', en: 'cold' } }, { targetText: 'kopi hangat', baseText: { de: 'warmer Kaffee', en: 'warm coffee' } }, { targetText: 'minum', baseText: { de: 'trinken', en: 'to drink' } }, { targetText: 'kedinginan', baseText: { de: 'frieren', en: 'to feel cold' } }, { targetText: 'hujan', baseText: { de: 'Regen', en: 'rain' } }],
    recall: { before: 'Iya, dingin sekali. Kamu mau minum kopi ', answer: 'hangat', after: '?', fallbackChoices: ['hangat', 'dingin', 'manis', 'pahit'] }, speakRequired: ['dingin', 'kopi', 'hangat'],
    sceneCaption: { de: 'Deine Freundin zieht ihre Jacke enger und fragt: „Pagi ini dingin dan hujan. Kamu kedinginan?“', en: 'Your friend pulls her jacket tighter and asks: “Pagi ini dingin dan hujan. Kamu kedinginan?”' },
    trophyWord: { word: 'hangat', meaning: { de: 'warm', en: 'warm' }, example: 'Kopi hangat cocok untuk pagi yang dingin.', whyThisWord: { de: 'Das Adjektiv verbindet das Getränk direkt mit dem gemeinsamen Bedürfnis an einem kalten Morgen.', en: 'The adjective directly connects the drink with what both of you need on a cold morning.' } },
    distractors: ['es teh dingin', 'kamu bawa payung'], placeholderCaption: { de: 'Zwei dampfende Kaffeetassen stehen am Fenster eines regnerischen Morgens.', en: 'Two steaming coffee cups sit by the window on a rainy morning.' }, songMood: 'a warm coffee melody rising through cool rain', visualNotes: 'Rainy cafe window, two friends in light jackets, steaming coffee and gray morning streets outside.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'hari-ini-menyenangkan', title: { de: 'Ein schöner Tag', en: 'A lovely day' },
    situation: { de: 'Am Ende eines gemeinsamen Tages fragt dein Freund, ob du müde bist. Du blickst positiv zurück und fragst nach seinem Gefühl.', en: 'At the end of a day together, your friend asks whether you are tired. Look back positively and ask how he feels.' },
    pedagogicalGoal: 'Mit menyenangkan einen gegenwärtigen Gesamteindruck ausdrücken und das Gespräch freundlich zurückgeben.',
    targetText: 'Iya, hari ini menyenangkan. Kamu juga senang?', baseText: { de: 'Ja, heute ist ein schöner Tag. Bist du auch froh?', en: 'Yes, today is lovely. Are you happy too?' },
    chunks: [{ targetText: 'Iya, hari ini', baseText: { de: 'Ja, heute', en: 'Yes, today' } }, { targetText: 'menyenangkan.', baseText: { de: 'ist es schön.', en: 'is lovely.' } }, { targetText: 'Kamu juga senang?', baseText: { de: 'Bist du auch froh?', en: 'Are you happy too?' } }],
    terms: [{ targetText: 'menyenangkan', baseText: { de: 'angenehm, schön', en: 'pleasant, enjoyable' } }, { targetText: 'hari ini', baseText: { de: 'heute', en: 'today' } }, { targetText: 'juga', baseText: { de: 'auch', en: 'also' } }, { targetText: 'senang', baseText: { de: 'froh', en: 'happy' } }, { targetText: 'capek', baseText: { de: 'müde', en: 'tired' } }],
    recall: { before: 'Iya, hari ini ', answer: 'menyenangkan', after: '. Kamu juga senang?', fallbackChoices: ['menyenangkan', 'melelahkan', 'membosankan', 'sibuk'] }, speakRequired: ['hari', 'menyenangkan', 'senang'],
    sceneCaption: { de: 'Dein Freund lächelt auf dem Heimweg und fragt: „Hari yang menyenangkan, ya? Kamu capek?“', en: 'Your friend smiles on the way home and asks: “Hari yang menyenangkan, ya? Kamu capek?”' },
    trophyWord: { word: 'menyenangkan', meaning: { de: 'angenehm, schön', en: 'pleasant, enjoyable' }, example: 'Hari ini sangat menyenangkan bersama kamu.', whyThisWord: { de: 'Das Adjektiv fasst den ganzen gemeinsamen Tag in einem warmen, positiven Urteil zusammen.', en: 'The adjective sums up the whole day together in one warm, positive judgment.' } },
    distractors: ['hari ini terlalu sibuk', 'kamu mau pulang'], placeholderCaption: { de: 'Zwei Freunde gehen bei warmem Abendlicht zufrieden nach Hause.', en: 'Two friends walk home contentedly in warm evening light.' }, songMood: 'a glowing end-of-day refrain shared between friends', visualNotes: 'Two friends walking through a neighborhood at sunset, relaxed smiles and small reminders of the day in hand.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_8_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_EIGHT_METADATA, indonesianA2Practical8Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 8 abgeschlossen und kannst mit einem Freund spontan reagieren, Gefühle teilen und Small Talk führen.', en: 'You have completed Indonesian A2 Practical 8 and can react spontaneously, share feelings, and make small talk with a friend.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_NINE_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-9', title: 'Indonesisch A2 Praxis 9', shortTitle: 'A2 Praxis 9',
  subtitle: { de: 'Probleme erklären, frühere Schritte nennen und höflich eine Lösung verlangen', en: 'Explaining problems, naming prior steps, and politely requesting a solution' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical9Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'air-panas-tidak-keluar', title: { de: 'Kein heißes Wasser', en: 'No hot water' },
    situation: { de: 'Ein Haustechniker kommt in dein Hotelzimmer. Du erklärst das aktuelle Problem, erwähnst deinen Anruf und bittest um Prüfung.', en: 'A maintenance worker comes to your hotel room. Explain the current problem, mention your call, and ask him to check it.' },
    pedagogicalGoal: 'Ein gegenwärtiges Problem mit tidak keluar nennen und einen bereits erledigten Anruf mit sudah markieren.',
    targetText: 'Air panasnya tidak keluar, Pak. Saya sudah telepon resepsionis. Bisa tolong periksa?', baseText: { de: 'Es kommt kein heißes Wasser. Ich habe schon an der Rezeption angerufen. Können Sie bitte nachsehen?', en: 'The hot water is not coming out, sir. I have already called reception. Can you please check?' },
    chunks: [{ targetText: 'Air panasnya tidak keluar, Pak.', baseText: { de: 'Das heiße Wasser kommt nicht.', en: 'The hot water is not coming out, sir.' } }, { targetText: 'Saya sudah telepon resepsionis.', baseText: { de: 'Ich habe schon an der Rezeption angerufen.', en: 'I have already called reception.' } }, { targetText: 'Bisa tolong periksa?', baseText: { de: 'Können Sie bitte nachsehen?', en: 'Can you please check?' } }],
    terms: [{ targetText: 'air panas', baseText: { de: 'heißes Wasser', en: 'hot water' } }, { targetText: 'tidak keluar', baseText: { de: 'nicht herauskommen', en: 'not to come out' } }, { targetText: 'sudah telepon', baseText: { de: 'schon angerufen haben', en: 'to have already called' } }, { targetText: 'resepsionis', baseText: { de: 'Rezeption', en: 'receptionist, reception' } }, { targetText: 'periksa', baseText: { de: 'prüfen', en: 'to check' } }],
    recall: { before: 'Air panasnya tidak ', answer: 'keluar', after: ', Pak. Saya sudah telepon resepsionis. Bisa tolong periksa?', fallbackChoices: ['keluar', 'masuk', 'jatuh', 'naik'] }, speakRequired: ['panasnya', 'keluar', 'telepon'],
    sceneCaption: { de: 'Der Haustechniker prüft die Armaturen und fragt: „Apa masalahnya dengan kamar Anda, Pak?“', en: 'The maintenance worker checks the fixtures and asks: “Apa masalahnya dengan kamar Anda, Pak?”' },
    trophyWord: { word: 'keluar', meaning: { de: 'herauskommen, hinausgehen', en: 'to come out, go out' }, example: 'Air panas tidak keluar dari shower.', whyThisWord: { de: 'Das Verb beschreibt präzise, was am Wasserhahn gerade nicht funktioniert.', en: 'The verb precisely describes what is currently failing at the tap.' } },
    distractors: ['air dinginnya lancar', 'saya perlu handuk'], placeholderCaption: { de: 'Ein trockener Duschkopf hängt über einem geöffneten, aber erfolglosen Warmwasserhahn.', en: 'A dry showerhead hangs over a hot-water tap that is open but not working.' }, songMood: 'a restrained repair rhythm building toward a clear request', visualNotes: 'Hotel bathroom, male maintenance worker, open hot-water tap, dry showerhead and a phone call record on the counter.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'soto-belum-datang', title: { de: 'Die Bestellung fehlt noch', en: 'The order has not arrived' },
    situation: { de: 'Die Bedienung sieht, dass dein Tisch noch leer ist. Du nennst deine abgeschlossene Bestellung, das aktuelle Warten und bittest um Prüfung.', en: 'The server notices that your table is still empty. State your completed order, the current wait, and ask her to check.' },
    pedagogicalGoal: 'Mit sudah pesan eine erledigte Bestellung und mit belum datang ein noch bestehendes Problem verbinden.',
    targetText: 'Saya sudah pesan soto, Bu, tetapi makanannya belum datang. Bisa tolong periksa?', baseText: { de: 'Ich habe schon Soto bestellt, aber das Essen ist noch nicht gekommen. Können Sie bitte nachsehen?', en: 'I have already ordered soto, ma’am, but the food has not arrived yet. Can you please check?' },
    chunks: [{ targetText: 'Saya sudah pesan soto, Bu,', baseText: { de: 'Ich habe schon Soto bestellt,', en: 'I have already ordered soto, ma’am,' } }, { targetText: 'tetapi makanannya belum datang.', baseText: { de: 'aber das Essen ist noch nicht gekommen.', en: 'but the food has not arrived yet.' } }, { targetText: 'Bisa tolong periksa?', baseText: { de: 'Können Sie bitte nachsehen?', en: 'Can you please check?' } }],
    terms: [{ targetText: 'sudah pesan', baseText: { de: 'schon bestellt haben', en: 'to have already ordered' } }, { targetText: 'soto', baseText: { de: 'indonesische Suppe', en: 'Indonesian soup' } }, { targetText: 'belum datang', baseText: { de: 'noch nicht gekommen sein', en: 'not to have arrived yet' } }, { targetText: 'makanannya', baseText: { de: 'das Essen', en: 'the food' } }, { targetText: 'periksa', baseText: { de: 'prüfen', en: 'to check' } }],
    recall: { before: 'Saya sudah pesan soto, Bu, tetapi makanannya belum ', answer: 'datang', after: '. Bisa tolong periksa?', fallbackChoices: ['datang', 'selesai', 'rusak', 'dingin'] }, speakRequired: ['pesan', 'soto', 'datang'],
    sceneCaption: { de: 'Die Bedienung blickt auf den leeren Tisch und fragt: „Anda masih menunggu pesanan, Pak?“', en: 'The server looks at the empty table and asks: “Anda masih menunggu pesanan, Pak?”' },
    trophyWord: { word: 'datang', meaning: { de: 'kommen, ankommen', en: 'to come, arrive' }, example: 'Pesanan saya belum datang sampai sekarang.', whyThisWord: { de: 'Das Verb benennt genau den ausstehenden Schritt zwischen Bestellung und Essen auf dem Tisch.', en: 'The verb names the exact missing step between placing the order and receiving the food.' } },
    distractors: ['saya mau pesan lagi', 'makanannya terlalu pedas'], placeholderCaption: { de: 'Ein Bestellzettel liegt auf einem noch leeren Restauranttisch.', en: 'An order slip rests on a restaurant table that is still empty.' }, songMood: 'a patient restaurant pulse waiting for the missing bowl', visualNotes: 'Restaurant, female server, empty place setting, order slip marked soto and kitchen doorway in the background.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tidak-bisa-pakai-wifi', title: { de: 'Keine WLAN-Verbindung', en: 'No Wi-Fi connection' },
    situation: { de: 'Die Rezeptionistin fragt nach dem WLAN-Problem. Du beschreibst die aktuelle Störung und deine zwei früheren Versuche.', en: 'The receptionist asks about the Wi-Fi problem. Describe the current failure and your two earlier attempts.' },
    pedagogicalGoal: 'Mit tidak bisa pakai eine aktuelle Verbindungsstörung und mit sudah coba einen erledigten Versuch ausdrücken.',
    targetText: 'Saya tidak bisa pakai Wi-Fi, Bu. Saya sudah coba dua kali. Tolong periksa.', baseText: { de: 'Ich kann das WLAN nicht benutzen. Ich habe es schon zweimal versucht. Bitte prüfen Sie das.', en: 'I cannot use the Wi-Fi, ma’am. I have already tried twice. Please check.' },
    chunks: [{ targetText: 'Saya tidak bisa pakai Wi-Fi, Bu.', baseText: { de: 'Ich kann das WLAN nicht benutzen.', en: 'I cannot use the Wi-Fi, ma’am.' } }, { targetText: 'Saya sudah coba dua kali.', baseText: { de: 'Ich habe es schon zweimal versucht.', en: 'I have already tried twice.' } }, { targetText: 'Tolong periksa.', baseText: { de: 'Bitte prüfen Sie das.', en: 'Please check.' } }],
    terms: [{ targetText: 'Wi-Fi', baseText: { de: 'WLAN', en: 'Wi-Fi' }, alsoAccept: ['wifi'] }, { targetText: 'pakai', baseText: { de: 'benutzen', en: 'to use' } }, { targetText: 'sudah coba', baseText: { de: 'schon versucht haben', en: 'to have already tried' } }, { targetText: 'dua kali', baseText: { de: 'zweimal', en: 'twice' } }, { targetText: 'periksa', baseText: { de: 'prüfen', en: 'to check' } }],
    recall: { before: 'Saya tidak bisa ', answer: 'pakai', after: ' Wi-Fi, Bu. Saya sudah coba dua kali. Tolong periksa.', fallbackChoices: ['pakai', 'angkat', 'tutup', 'baca'] }, speakRequired: ['pakai', 'coba', 'periksa'],
    sceneCaption: { de: 'Die Rezeptionistin öffnet die Netzwerkeinstellungen und fragt: „Wi-Fi di kamar Anda bermasalah, Pak?“', en: 'The receptionist opens the network settings and asks: “Wi-Fi di kamar Anda bermasalah, Pak?”' },
    trophyWord: { word: 'pakai', meaning: { de: 'benutzen', en: 'to use' }, example: 'Saya tidak bisa pakai Wi-Fi di kamar.', whyThisWord: { de: 'Pakai ist das Alltagsverb für Geräte und Dienste — damit benennst du das Problem direkt.', en: 'Pakai is the everyday verb for using devices and services — it states the problem directly.' } },
    distractors: ['jaringannya sangat cepat', 'saya perlu kata sandi'], placeholderCaption: { de: 'Ein Handy zeigt neben dem WLAN-Symbol zwei fehlgeschlagene Verbindungsversuche.', en: 'A phone shows two failed connection attempts beside the Wi-Fi symbol.' }, songMood: 'a clipped digital pattern searching for a stable signal', visualNotes: 'Hotel reception, female receptionist, phone network screen, disconnected Wi-Fi icon and two retry marks.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kunci-hilang-tidak-masuk', title: { de: 'Der Schlüssel ist weg', en: 'The key is missing' },
    situation: { de: 'Die Rezeptionistin fragt nach deiner Zimmerkarte. Du erklärst, dass sie weg ist, erwähnst deine Suche und bittest um Hilfe.', en: 'The receptionist asks about your room key. Explain that it is missing, mention your search, and ask for help.' },
    pedagogicalGoal: 'Einen aktuellen Verlust mit hilang, eine erledigte Suche mit sudah und die Folge mit tidak bisa verbinden.',
    targetText: 'Kunci saya hilang, Bu. Saya sudah cari, tetapi tidak bisa masuk kamar. Tolong bantu.', baseText: { de: 'Mein Schlüssel ist weg. Ich habe schon gesucht, kann aber nicht ins Zimmer. Bitte helfen Sie mir.', en: 'My key is missing, ma’am. I have already looked, but I cannot enter the room. Please help.' },
    chunks: [{ targetText: 'Kunci saya hilang, Bu.', baseText: { de: 'Mein Schlüssel ist weg.', en: 'My key is missing, ma’am.' } }, { targetText: 'Saya sudah cari,', baseText: { de: 'Ich habe schon gesucht,', en: 'I have already looked,' } }, { targetText: 'tetapi tidak bisa masuk kamar.', baseText: { de: 'kann aber nicht ins Zimmer.', en: 'but cannot enter the room.' } }, { targetText: 'Tolong bantu.', baseText: { de: 'Bitte helfen Sie mir.', en: 'Please help.' } }],
    terms: [{ targetText: 'kunci', baseText: { de: 'Schlüssel', en: 'key' } }, { targetText: 'hilang', baseText: { de: 'verloren, weg', en: 'lost, missing' } }, { targetText: 'sudah cari', baseText: { de: 'schon gesucht haben', en: 'to have already looked' } }, { targetText: 'tidak bisa masuk', baseText: { de: 'nicht hineinkommen können', en: 'cannot get in' } }, { targetText: 'bantu', baseText: { de: 'helfen', en: 'to help' } }],
    recall: { before: 'Kunci saya ', answer: 'hilang', after: ', Bu. Saya sudah cari, tetapi tidak bisa masuk kamar. Tolong bantu.', fallbackChoices: ['hilang', 'rusak', 'basah', 'mahal'] }, speakRequired: ['kunci', 'hilang', 'bantu'],
    sceneCaption: { de: 'Die Rezeptionistin blickt auf deine leere Kartenhülle und fragt: „Kunci kamar Anda ada, Pak?“', en: 'The receptionist looks at your empty card sleeve and asks: “Kunci kamar Anda ada, Pak?”' },
    trophyWord: { word: 'hilang', meaning: { de: 'verloren, weg', en: 'lost, missing' }, example: 'Kunci kamar saya hilang hari ini.', whyThisWord: { de: 'Das Adjektiv macht sofort klar, warum du trotz deiner Suche nicht in das Zimmer kommst.', en: 'The adjective immediately explains why you cannot enter the room despite looking for the key.' } },
    distractors: ['kuncinya ada di tas', 'saya mau pindah kamar'], placeholderCaption: { de: 'Eine leere Schlüsselkartenhülle liegt auf dem Rezeptionstresen.', en: 'An empty key-card sleeve lies on the reception counter.' }, songMood: 'a tense but polite search motif resolving into a request for help', visualNotes: 'Hotel reception, female receptionist, empty card sleeve, guest checking pockets and room door visible behind.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'taksi-belum-datang', title: { de: 'Das Taxi ist noch nicht da', en: 'The taxi is not here yet' },
    situation: { de: 'Ein Hotelmitarbeiter sieht dich am Eingang warten. Du erklärst die Verzögerung und bittest ihn, ein anderes Taxi zu rufen.', en: 'A hotel clerk sees you waiting at the entrance. Explain the delay and ask him to call another taxi.' },
    pedagogicalGoal: 'Mit belum datang ein aktuelles Ausbleiben und mit sudah menunggu die bereits verbrachte Wartezeit ausdrücken.',
    targetText: 'Taksi saya belum datang, Pak. Saya sudah menunggu lama. Tolong panggil yang lain.', baseText: { de: 'Mein Taxi ist noch nicht gekommen. Ich habe schon lange gewartet. Bitte rufen Sie ein anderes.', en: 'My taxi has not arrived yet, sir. I have already waited a long time. Please call another one.' },
    chunks: [{ targetText: 'Taksi saya belum datang, Pak.', baseText: { de: 'Mein Taxi ist noch nicht gekommen.', en: 'My taxi has not arrived yet, sir.' } }, { targetText: 'Saya sudah menunggu lama.', baseText: { de: 'Ich habe schon lange gewartet.', en: 'I have already waited a long time.' } }, { targetText: 'Tolong panggil yang lain.', baseText: { de: 'Bitte rufen Sie ein anderes.', en: 'Please call another one.' } }],
    terms: [{ targetText: 'belum datang', baseText: { de: 'noch nicht gekommen sein', en: 'not to have arrived yet' } }, { targetText: 'menunggu', baseText: { de: 'warten', en: 'to wait' } }, { targetText: 'lama', baseText: { de: 'lange', en: 'a long time' } }, { targetText: 'panggil', baseText: { de: 'rufen', en: 'to call' } }, { targetText: 'yang lain', baseText: { de: 'ein anderes', en: 'another one' } }],
    recall: { before: 'Taksi saya belum datang, Pak. Saya sudah ', answer: 'menunggu', after: ' lama. Tolong panggil yang lain.', fallbackChoices: ['menunggu', 'membayar', 'memesan', 'berjalan'] }, speakRequired: ['taksi', 'menunggu', 'panggil'],
    sceneCaption: { de: 'Der Hotelmitarbeiter sieht auf die leere Vorfahrt und fragt: „Taksi Anda belum datang, Pak?“', en: 'The hotel clerk looks at the empty driveway and asks: “Taksi Anda belum datang, Pak?”' },
    trophyWord: { word: 'menunggu', meaning: { de: 'warten', en: 'to wait' }, example: 'Saya sudah menunggu taksi cukup lama.', whyThisWord: { de: 'Das Verb zeigt, dass du der ursprünglichen Fahrt bereits Zeit gegeben hast, bevor du eine andere verlangst.', en: 'The verb shows that you already gave the original ride time before requesting another one.' } },
    distractors: ['taksinya sudah di sini', 'saya jalan ke stasiun'], placeholderCaption: { de: 'Ein Reisender wartet mit Gepäck vor einer leeren Hotelvorfahrt.', en: 'A traveler waits with luggage beside an empty hotel driveway.' }, songMood: 'a patient curbside beat turning into a decisive second call', visualNotes: 'Hotel entrance, male clerk, waiting guest with luggage, empty taxi lane and phone ready to call another driver.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kembalian-kurang-dua-ribu', title: { de: 'Zu wenig Rückgeld', en: 'Not enough change' },
    situation: { de: 'Die Kassiererin reicht dir das Rückgeld. Du bemerkst, dass zweitausend Rupiah fehlen, und bittest um eine Prüfung.', en: 'The cashier hands you the change. Notice that two thousand rupiah are missing and ask her to check.' },
    pedagogicalGoal: 'Ein gegenwärtiges Problem mit kembalian kurang benennen und die vollständige Zahlung mit sudah bestätigen.',
    targetText: 'Kembalian saya kurang dua ribu, Bu. Saya sudah bayar penuh. Tolong periksa.', baseText: { de: 'Bei meinem Rückgeld fehlen zweitausend Rupiah. Ich habe vollständig bezahlt. Bitte prüfen Sie es.', en: 'My change is short by two thousand rupiah, ma’am. I have already paid in full. Please check.' },
    chunks: [{ targetText: 'Kembalian saya kurang dua ribu, Bu.', baseText: { de: 'Bei meinem Rückgeld fehlen zweitausend Rupiah.', en: 'My change is short by two thousand rupiah, ma’am.' } }, { targetText: 'Saya sudah bayar penuh.', baseText: { de: 'Ich habe vollständig bezahlt.', en: 'I have already paid in full.' } }, { targetText: 'Tolong periksa.', baseText: { de: 'Bitte prüfen Sie es.', en: 'Please check.' } }],
    terms: [{ targetText: 'kembalian', baseText: { de: 'Rückgeld', en: 'change' } }, { targetText: 'kurang', baseText: { de: 'zu wenig, fehlen', en: 'short, lacking' } }, { targetText: 'dua ribu', baseText: { de: 'zweitausend Rupiah', en: 'two thousand rupiah' } }, { targetText: 'sudah bayar', baseText: { de: 'schon bezahlt haben', en: 'to have already paid' } }, { targetText: 'penuh', baseText: { de: 'vollständig', en: 'in full' } }],
    recall: { before: '', answer: 'Kembalian', after: ' saya kurang dua ribu, Bu. Saya sudah bayar penuh. Tolong periksa.', fallbackChoices: ['Kembalian', 'Jumlah', 'Harga', 'Uang'] }, speakRequired: ['kembalian', 'ribu', 'bayar'],
    sceneCaption: { de: 'Die Kassiererin legt Münzen und Scheine auf den Tresen und sagt: „Ini kembaliannya, Pak.“', en: 'The cashier places coins and notes on the counter and says: “Ini kembaliannya, Pak.”' },
    trophyWord: { word: 'kembalian', meaning: { de: 'Rückgeld', en: 'change' }, example: 'Kembalian saya kurang dua ribu.', whyThisWord: { de: 'Das Wort bezeichnet genau den Teil der Zahlung, bei dem die kleine Differenz entstanden ist.', en: 'The word identifies the exact part of the transaction where the small difference occurred.' } },
    distractors: ['jumlahnya sudah benar', 'saya bayar dengan kartu'], placeholderCaption: { de: 'Rückgeld liegt neben einem Beleg, auf dem eine Differenz von zweitausend Rupiah sichtbar ist.', en: 'Change lies beside a receipt showing a difference of two thousand rupiah.' }, songMood: 'a careful counting rhythm pausing over a small difference', visualNotes: 'Checkout counter, female cashier, receipt, coins and notes arranged for a calm recount.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kipas-sekarang-rusak', title: { de: 'Gerade gekauft, schon kaputt', en: 'Just bought, already broken' },
    situation: { de: 'Ein Verkäufer fragt nach dem Ventilator, den du zurückbringst. Du nennst den Kauf von vorhin und den aktuellen Defekt.', en: 'A clerk asks about the fan you are returning. State that you bought it earlier and that it is now broken.' },
    pedagogicalGoal: 'Mit tadi den Kauf als früher am selben Tag markieren und ihn mit dem aktuellen Zustand sekarang rusak kontrastieren.',
    targetText: 'Saya beli kipas ini tadi, Pak, tetapi sekarang rusak. Tolong ganti.', baseText: { de: 'Ich habe diesen Ventilator vorhin gekauft, aber jetzt ist er kaputt. Bitte tauschen Sie ihn um.', en: 'I bought this fan earlier, sir, but now it is broken. Please replace it.' },
    chunks: [{ targetText: 'Saya beli kipas ini tadi, Pak,', baseText: { de: 'Ich habe diesen Ventilator vorhin gekauft,', en: 'I bought this fan earlier, sir,' } }, { targetText: 'tetapi sekarang rusak.', baseText: { de: 'aber jetzt ist er kaputt.', en: 'but now it is broken.' } }, { targetText: 'Tolong ganti.', baseText: { de: 'Bitte tauschen Sie ihn um.', en: 'Please replace it.' } }],
    terms: [{ targetText: 'beli', baseText: { de: 'kaufen', en: 'to buy' } }, { targetText: 'kipas', baseText: { de: 'Ventilator', en: 'fan' } }, { targetText: 'tadi', baseText: { de: 'vorhin', en: 'earlier today' } }, { targetText: 'rusak', baseText: { de: 'kaputt', en: 'broken' } }, { targetText: 'ganti', baseText: { de: 'umtauschen, ersetzen', en: 'to replace, exchange' } }],
    recall: { before: 'Saya beli kipas ini tadi, Pak, tetapi sekarang ', answer: 'rusak', after: '. Tolong ganti.', fallbackChoices: ['rusak', 'baru', 'mahal', 'besar'] }, speakRequired: ['kipas', 'rusak', 'ganti'],
    sceneCaption: { de: 'Der Verkäufer nimmt den Ventilator entgegen und fragt: „Apa masalahnya dengan kipas Anda, Pak?“', en: 'The clerk takes the fan and asks: “Apa masalahnya dengan kipas Anda, Pak?”' },
    trophyWord: { word: 'rusak', meaning: { de: 'kaputt, beschädigt', en: 'broken, damaged' }, example: 'Kipas yang saya beli tadi sekarang rusak.', whyThisWord: { de: 'Das Adjektiv beschreibt den aktuellen Defekt, der den Umtausch nach dem Kauf begründet.', en: 'The adjective describes the current fault that justifies an exchange after the purchase.' } },
    distractors: ['kipasnya masih baru', 'saya perlu baterai'], placeholderCaption: { de: 'Ein neuer Ventilator steht still neben seinem frischen Kassenbeleg.', en: 'A new fan sits motionless beside its recent receipt.' }, songMood: 'a stalled mechanical beat asking for a clean replacement', visualNotes: 'Electronics counter, male clerk, motionless desk fan, recent receipt and replacement box nearby.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sup-dingin-hangatkan', title: { de: 'Die Suppe ist kalt', en: 'The soup is cold' },
    situation: { de: 'Die Bedienung fragt nach der angekommenen Suppe. Du sagst, dass sie jetzt kalt ist, und bittest ums Aufwärmen.', en: 'The server asks about the soup that arrived. Say that it is now cold and ask her to warm it.' },
    pedagogicalGoal: 'Mit sudah datang die Ankunft markieren, einen aktuellen Zustand nennen und mit hangatkan um Abhilfe bitten.',
    targetText: 'Supnya sudah datang, Bu, tetapi sekarang dingin. Bisa tolong hangatkan?', baseText: { de: 'Die Suppe ist schon da, aber jetzt ist sie kalt. Können Sie sie bitte aufwärmen?', en: 'The soup has arrived, ma’am, but now it is cold. Can you please warm it up?' },
    chunks: [{ targetText: 'Supnya sudah datang, Bu,', baseText: { de: 'Die Suppe ist schon da,', en: 'The soup has arrived, ma’am,' } }, { targetText: 'tetapi sekarang dingin.', baseText: { de: 'aber jetzt ist sie kalt.', en: 'but now it is cold.' } }, { targetText: 'Bisa tolong hangatkan?', baseText: { de: 'Können Sie sie bitte aufwärmen?', en: 'Can you please warm it up?' } }],
    terms: [{ targetText: 'supnya', baseText: { de: 'die Suppe', en: 'the soup' } }, { targetText: 'sudah datang', baseText: { de: 'schon angekommen sein', en: 'to have arrived' } }, { targetText: 'sekarang dingin', baseText: { de: 'jetzt kalt', en: 'cold now' } }, { targetText: 'hangatkan', baseText: { de: 'aufwärmen', en: 'to warm up' } }, { targetText: 'dapur', baseText: { de: 'Küche', en: 'kitchen' } }],
    recall: { before: 'Supnya sudah datang, Bu, tetapi sekarang dingin. Bisa tolong ', answer: 'hangatkan', after: '?', fallbackChoices: ['hangatkan', 'dinginkan', 'bungkus', 'tambahkan'] }, speakRequired: ['supnya', 'dingin', 'hangatkan'],
    sceneCaption: { de: 'Die Bedienung betrachtet die unberührte Schale und fragt: „Ada masalah dengan supnya, Pak?“', en: 'The server looks at the untouched bowl and asks: “Ada masalah dengan supnya, Pak?”' },
    trophyWord: { word: 'hangatkan', meaning: { de: 'aufwärmen', en: 'to warm up' }, example: 'Tolong hangatkan sup ini di dapur.', whyThisWord: { de: 'Das Verb verwandelt die Beschreibung der kalten Suppe direkt in eine klare Lösung.', en: 'The verb turns the description of the cold soup directly into a clear solution.' } },
    distractors: ['supnya masih panas', 'saya pesan minuman'], placeholderCaption: { de: 'Eine kalte Suppenschale wartet neben dem Weg zurück zur Küche.', en: 'A cold bowl of soup waits beside the path back to the kitchen.' }, songMood: 'a cool restaurant phrase warming toward resolution', visualNotes: 'Restaurant table, female server, untouched soup bowl, faint kitchen steam visible in the background.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'kamar-berisik-pindahkan', title: { de: 'Bitte in ein anderes Zimmer', en: 'Please move me to another room' },
    situation: { de: 'Die Rezeptionistin fragt nach dem Zimmer. Du erzählst von der schlechten Nacht, nennst den aktuellen Lärm und verlangst einen Wechsel.', en: 'The receptionist asks about the room. Describe the poor night, name the current noise, and request a move.' },
    pedagogicalGoal: 'Mit tadi malam einen vergangenen Schlafmangel und mit einem Präsenssatz das weiterhin bestehende Problem verbinden.',
    targetText: 'Tadi malam saya kurang tidur. Kamarnya berisik, Bu. Tolong pindahkan saya ke kamar lain.', baseText: { de: 'Letzte Nacht habe ich zu wenig geschlafen. Das Zimmer ist laut. Bitte geben Sie mir ein anderes Zimmer.', en: 'I did not get enough sleep last night. The room is noisy, ma’am. Please move me to another room.' },
    chunks: [{ targetText: 'Tadi malam saya kurang tidur.', baseText: { de: 'Letzte Nacht habe ich zu wenig geschlafen.', en: 'I did not get enough sleep last night.' } }, { targetText: 'Kamarnya berisik, Bu.', baseText: { de: 'Das Zimmer ist laut.', en: 'The room is noisy, ma’am.' } }, { targetText: 'Tolong pindahkan saya', baseText: { de: 'Bitte lassen Sie mich umziehen', en: 'Please move me' } }, { targetText: 'ke kamar lain.', baseText: { de: 'in ein anderes Zimmer.', en: 'to another room.' } }],
    terms: [{ targetText: 'tadi malam', baseText: { de: 'letzte Nacht', en: 'last night' } }, { targetText: 'kurang tidur', baseText: { de: 'zu wenig schlafen', en: 'not to get enough sleep' } }, { targetText: 'berisik', baseText: { de: 'laut, lärmig', en: 'noisy' } }, { targetText: 'pindahkan', baseText: { de: 'verlegen, umziehen lassen', en: 'to move, transfer' } }, { targetText: 'kamar lain', baseText: { de: 'anderes Zimmer', en: 'another room' } }],
    recall: { before: 'Tadi malam saya kurang tidur. Kamarnya berisik, Bu. Tolong ', answer: 'pindahkan', after: ' saya ke kamar lain.', fallbackChoices: ['pindahkan', 'bangunkan', 'telepon', 'bayar'] }, speakRequired: ['berisik', 'pindahkan', 'kamar'],
    sceneCaption: { de: 'Die Rezeptionistin hört den Straßenlärm und fragt: „Ada masalah dengan kamar Anda, Pak?“', en: 'The receptionist hears the street noise and asks: “Ada masalah dengan kamar Anda, Pak?”' },
    trophyWord: { word: 'pindahkan', meaning: { de: 'verlegen, umziehen lassen', en: 'to move, transfer' }, example: 'Tolong pindahkan saya ke kamar yang tenang.', whyThisWord: { de: 'Das Verb fordert nach der Erklärung des Lärms eine eindeutige und praktische Lösung.', en: 'After explaining the noise, the verb requests a clear and practical solution.' } },
    distractors: ['kamarnya sangat tenang', 'saya perlu sarapan'], placeholderCaption: { de: 'Eine laute Zimmertür an der Straße steht einer ruhigen freien Zimmertür gegenüber.', en: 'A noisy street-facing room door stands opposite a quiet available room door.' }, songMood: 'a weary night motif stepping toward a quieter room', visualNotes: 'Hotel reception, female receptionist, street-noise marks near one room card and a quiet replacement card ready.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sekarang-semua-berfungsi', title: { de: 'Jetzt funktioniert alles', en: 'Everything works now' },
    situation: { de: 'Der Haustechniker fragt nach der Reparatur. Du vergleichst den Defekt von vorhin mit dem aktuellen Ergebnis und bedankst dich.', en: 'The maintenance worker asks about the repair. Contrast the earlier fault with the current result and thank him.' },
    pedagogicalGoal: 'Mit tadi einen früheren Defekt und mit sekarang einen funktionierenden Gegenwartszustand in einem Austausch verbinden.',
    targetText: 'Tadi air panasnya tidak keluar, Pak. Sekarang semuanya berfungsi. Terima kasih banyak atas bantuannya.', baseText: { de: 'Vorhin kam kein heißes Wasser. Jetzt funktioniert alles. Vielen Dank für Ihre Hilfe.', en: 'Earlier no hot water was coming out, sir. Now everything works. Thank you very much for your help.' },
    chunks: [{ targetText: 'Tadi air panasnya tidak keluar, Pak.', baseText: { de: 'Vorhin kam kein heißes Wasser.', en: 'Earlier no hot water was coming out, sir.' } }, { targetText: 'Sekarang semuanya berfungsi.', baseText: { de: 'Jetzt funktioniert alles.', en: 'Now everything works.' } }, { targetText: 'Terima kasih banyak atas bantuannya.', baseText: { de: 'Vielen Dank für Ihre Hilfe.', en: 'Thank you very much for your help.' } }],
    terms: [{ targetText: 'tadi', baseText: { de: 'vorhin', en: 'earlier today' } }, { targetText: 'air panas', baseText: { de: 'heißes Wasser', en: 'hot water' } }, { targetText: 'berfungsi', baseText: { de: 'funktionieren', en: 'to function, work' } }, { targetText: 'sekarang', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'bantuannya', baseText: { de: 'Ihre Hilfe', en: 'your help' } }],
    recall: { before: 'Tadi air panasnya tidak keluar, Pak. Sekarang semuanya ', answer: 'berfungsi', after: '. Terima kasih banyak atas bantuannya.', fallbackChoices: ['berfungsi', 'rusak', 'hilang', 'tertutup'] }, speakRequired: ['keluar', 'berfungsi', 'bantuannya'],
    sceneCaption: { de: 'Der Haustechniker dreht den Wasserhahn auf und fragt: „Sekarang semuanya berfungsi, Pak?“', en: 'The maintenance worker turns on the tap and asks: “Sekarang semuanya berfungsi, Pak?”' },
    trophyWord: { word: 'berfungsi', meaning: { de: 'funktionieren', en: 'to function, work' }, example: 'Sekarang kerannya berfungsi dengan baik.', whyThisWord: { de: 'Das Verb bestätigt knapp, dass die Reparatur das gegenwärtige Problem vollständig gelöst hat.', en: 'The verb concisely confirms that the repair has fully solved the current problem.' } },
    distractors: ['airnya belum keluar', 'saya telepon resepsionis'], placeholderCaption: { de: 'Heißes Wasser läuft wieder aus dem Hahn, während der Techniker sein Werkzeug einpackt.', en: 'Hot water runs from the tap again as the maintenance worker packs away his tools.' }, songMood: 'a resolved repair cadence ending in warm gratitude', visualNotes: 'Hotel bathroom, male maintenance worker, running hot water, packed tools and a relieved guest.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_9_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_NINE_METADATA, indonesianA2Practical9Inputs,
  { de: 'Du hast Indonesisch A2 Praxis 9 abgeschlossen und kannst aktuelle Probleme mit erledigten Schritten verbinden und höflich Lösungen verlangen.', en: 'You have completed Indonesian A2 Practical 9 and can connect current problems with completed steps and politely request solutions.' },
)

export const GUIDED_TODAY_PATH_INDONESIAN_A2_TEN_METADATA: GuidedPathMetadata = {
  id: 'indonesian-a2-practical-10', title: 'Indonesisch A2 Praxis 10', shortTitle: 'A2 Praxis 10',
  subtitle: { de: 'Von deinem Alltag erzählen und den gemeinsamen Weg warm abschließen', en: 'Sharing your daily life and warmly closing the journey together' },
  level: 'A2', baseLanguage: 'German', targetLanguage: 'Indonesian', estimatedMinutes: 5,
}

const indonesianA2Practical10Inputs: IndonesianA2LessonInput[] = [
  makeIndonesianA2CompactLesson({
    slug: 'dari-jerman-tinggal-di-sini', title: { de: 'Wo du jetzt lebst', en: 'Where you live now' },
    situation: { de: 'Deine Freundin möchte deine Geschichte besser kennenlernen. Du sagst, woher du kommst und wo du jetzt wohnst, und fragst zurück.', en: 'Your friend wants to know your story better. Say where you come from and where you live now, then ask her in return.' },
    pedagogicalGoal: 'Herkunft und aktuellen Wohnort mit zwei einfachen Präsenssätzen verbinden.',
    targetText: 'Saya dari Jerman dan sekarang tinggal di sini. Kamu dari kota ini?', baseText: { de: 'Ich komme aus Deutschland und wohne jetzt hier. Kommst du aus dieser Stadt?', en: 'I am from Germany and live here now. Are you from this city?' },
    chunks: [{ targetText: 'Saya dari Jerman', baseText: { de: 'Ich komme aus Deutschland', en: 'I am from Germany' } }, { targetText: 'dan sekarang tinggal di sini.', baseText: { de: 'und wohne jetzt hier.', en: 'and live here now.' } }, { targetText: 'Kamu dari kota ini?', baseText: { de: 'Kommst du aus dieser Stadt?', en: 'Are you from this city?' } }],
    terms: [{ targetText: 'dari Jerman', baseText: { de: 'aus Deutschland', en: 'from Germany' } }, { targetText: 'tinggal', baseText: { de: 'wohnen, leben', en: 'to live, stay' } }, { targetText: 'sekarang', baseText: { de: 'jetzt', en: 'now' } }, { targetText: 'kota', baseText: { de: 'Stadt', en: 'city' } }, { targetText: 'di sini', baseText: { de: 'hier', en: 'here' } }],
    recall: { before: 'Saya dari Jerman dan sekarang ', answer: 'tinggal', after: ' di sini. Kamu dari kota ini?', fallbackChoices: ['tinggal', 'bekerja', 'belajar', 'makan'] }, speakRequired: ['jerman', 'tinggal', 'kota'],
    sceneCaption: { de: 'Deine Freundin lehnt sich neugierig vor und fragt: „Kamu dari mana, dan sekarang tinggal di mana?“', en: 'Your friend leans forward with interest and asks: “Kamu dari mana, dan sekarang tinggal di mana?”' },
    trophyWord: { word: 'kota', meaning: { de: 'Stadt', en: 'city' }, example: 'Kota ini ramai pada pagi hari.', whyThisWord: { de: 'Mit diesem Wort fragst du deine Freundin natürlich nach ihrer eigenen Verbindung zu diesem Ort.', en: 'This word lets you naturally ask your friend about her own connection to this place.' } },
    distractors: ['Saya dari kota lain', 'sekarang bekerja di hotel'], placeholderCaption: { de: 'Zwei Freunde sitzen in einem vertrauten Café, während draußen die Stadt vorbeizieht.', en: 'Two friends sit in a familiar cafe while the city moves past outside.' }, songMood: 'a warm conversational opening that places two friends in the same city', visualNotes: 'Familiar neighborhood cafe, two friends at a small table, city street visible through the window and an open map between them.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'bekerja-di-kantor-pusat-kota', title: { de: 'Arbeit im Stadtzentrum', en: 'Work in the city center' },
    situation: { de: 'Dein Freund fragt nach deiner Arbeit. Du beschreibst deinen Arbeitsplatz im Zentrum und stellst ihm dieselbe Frage.', en: 'Your friend asks about your work. Describe your workplace downtown and ask him the same question.' },
    pedagogicalGoal: 'Den eigenen Arbeitsplatz im Präsens nennen und mit di mana nach dem Arbeitsplatz des Freundes fragen.',
    targetText: 'Saya bekerja di kantor di pusat kota. Kamu bekerja di mana?', baseText: { de: 'Ich arbeite in einem Büro im Stadtzentrum. Wo arbeitest du?', en: 'I work in an office in the city center. Where do you work?' },
    chunks: [{ targetText: 'Saya bekerja di kantor', baseText: { de: 'Ich arbeite in einem Büro', en: 'I work in an office' } }, { targetText: 'di pusat kota.', baseText: { de: 'im Stadtzentrum.', en: 'in the city center.' } }, { targetText: 'Kamu bekerja di mana?', baseText: { de: 'Wo arbeitest du?', en: 'Where do you work?' } }],
    terms: [{ targetText: 'bekerja', baseText: { de: 'arbeiten', en: 'to work' } }, { targetText: 'kantor', baseText: { de: 'Büro', en: 'office' } }, { targetText: 'pusat kota', baseText: { de: 'Stadtzentrum', en: 'city center' } }, { targetText: 'di mana', baseText: { de: 'wo', en: 'where' } }, { targetText: 'pekerjaan', baseText: { de: 'Arbeit, Beruf', en: 'work, job' } }],
    recall: { before: 'Saya bekerja di ', answer: 'kantor', after: ' di pusat kota. Kamu bekerja di mana?', fallbackChoices: ['kantor', 'hotel', 'sekolah', 'pasar'] }, speakRequired: ['bekerja', 'kantor', 'kota'],
    sceneCaption: { de: 'Dein Freund zeigt auf die Häuser im Zentrum und fragt: „Kamu bekerja di mana sekarang?“', en: 'Your friend points toward the downtown buildings and asks: “Kamu bekerja di mana sekarang?”' },
    trophyWord: { word: 'kantor', meaning: { de: 'Büro', en: 'office' }, example: 'Kantor saya ada di pusat kota.', whyThisWord: { de: 'Das Wort macht aus einer allgemeinen Arbeitsfrage eine konkrete Beschreibung deines Alltags in der Stadt.', en: 'The word turns a general work question into a concrete description of your daily life in the city.' } },
    distractors: ['rumah saya dekat pasar', 'saya belajar di kafe'], placeholderCaption: { de: 'Bürogebäude stehen hinter dem Caféfenster im belebten Stadtzentrum.', en: 'Office buildings rise beyond the cafe window in the busy city center.' }, songMood: 'a steady daytime acoustic groove for sharing everyday work', visualNotes: 'Two friends by a cafe window, downtown office buildings beyond them and one friend pointing toward the center.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'belajar-bahasa-karena-kamu', title: { de: 'Warum Indonesisch?', en: 'Why Indonesian?' },
    situation: { de: 'Deine Freundin fragt nach deinem Grund, Indonesisch zu lernen. Du antwortest persönlich und direkt.', en: 'Your friend asks why you are learning Indonesian. Give a personal, direct answer.' },
    pedagogicalGoal: 'Einen persönlichen Grund mit karena in einem einfachen Präsensatz ausdrücken.',
    targetText: 'Saya belajar bahasa Indonesia karena saya suka bicara dengan kamu.', baseText: { de: 'Ich lerne Indonesisch, weil ich gern mit dir spreche.', en: 'I study Indonesian because I like talking with you.' },
    chunks: [{ targetText: 'Saya belajar bahasa Indonesia', baseText: { de: 'Ich lerne Indonesisch', en: 'I learn Indonesian' } }, { targetText: 'karena saya suka bicara', baseText: { de: 'weil ich gern spreche', en: 'because I like talking' } }, { targetText: 'dengan kamu.', baseText: { de: 'mit dir.', en: 'with you.' } }],
    terms: [{ targetText: 'bahasa Indonesia', baseText: { de: 'Indonesisch', en: 'Indonesian' } }, { targetText: 'belajar', baseText: { de: 'lernen', en: 'to learn' } }, { targetText: 'karena', baseText: { de: 'weil', en: 'because' } }, { targetText: 'bicara', baseText: { de: 'sprechen', en: 'to speak, talk' } }, { targetText: 'dengan', baseText: { de: 'mit', en: 'with' } }],
    recall: { before: 'Saya belajar bahasa Indonesia ', answer: 'karena', after: ' saya suka bicara dengan kamu.', fallbackChoices: ['karena', 'tetapi', 'dan', 'atau'] }, speakRequired: ['belajar', 'bahasa', 'bicara'],
    sceneCaption: { de: 'Deine Freundin lächelt über eure längeren Gespräche und fragt: „Kenapa kamu belajar bahasa Indonesia?“', en: 'Your friend smiles at your longer conversations and asks: “Kenapa kamu belajar bahasa Indonesia?”' },
    trophyWord: { word: 'bahasa', meaning: { de: 'Sprache', en: 'language' }, example: 'Bahasa Indonesia membantu saya berbicara dengan tetangga.', whyThisWord: { de: 'Dieses Wort benennt das Werkzeug, mit dem aus kurzen Begegnungen echte Gespräche mit deiner Freundin werden.', en: 'This word names the tool that turns brief encounters into real conversations with your friend.' } },
    distractors: ['saya suka makanan lokal', 'tetapi masih bicara pelan'], placeholderCaption: { de: 'Zwei Freunde unterhalten sich entspannt über einem geöffneten Indonesischheft.', en: 'Two friends chat easily over an open Indonesian notebook.' }, songMood: 'an intimate acoustic exchange celebrating a language learned through friendship', visualNotes: 'Cafe table, two friends in conversation, open Indonesian notebook and handwritten phrases beside their drinks.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'sudah-dua-minggu-di-sini', title: { de: 'Seit zwei Wochen hier', en: 'Here for two weeks' },
    situation: { de: 'Dein Freund fragt, wie lange du schon in der Stadt bist. Du nennst die Dauer und fragst nach seiner Cafégewohnheit.', en: 'Your friend asks how long you have been in the city. Give the duration and ask about his cafe routine.' },
    pedagogicalGoal: 'Mit sudah plus Dauer ausdrücken, dass ein gegenwärtiger Aufenthalt seit zwei Wochen andauert.',
    targetText: 'Sudah dua minggu saya di sini. Kamu juga sering ke kafe ini?', baseText: { de: 'Ich bin seit zwei Wochen hier. Kommst du auch oft in dieses Café?', en: 'I have been here for two weeks. Do you also come to this cafe often?' },
    chunks: [{ targetText: 'Sudah dua minggu saya di sini.', baseText: { de: 'Ich bin seit zwei Wochen hier.', en: 'I have been here for two weeks.' } }, { targetText: 'Kamu juga sering', baseText: { de: 'Kommst du auch oft', en: 'Do you also come often' } }, { targetText: 'ke kafe ini?', baseText: { de: 'in dieses Café?', en: 'to this cafe?' } }],
    terms: [{ targetText: 'sudah dua minggu', baseText: { de: 'seit zwei Wochen', en: 'for two weeks' } }, { targetText: 'sering', baseText: { de: 'oft', en: 'often' } }, { targetText: 'kafe', baseText: { de: 'Café', en: 'cafe' } }, { targetText: 'di sini', baseText: { de: 'hier', en: 'here' } }, { targetText: 'juga', baseText: { de: 'auch', en: 'also' } }],
    recall: { before: 'Sudah ', answer: 'dua', after: ' minggu saya di sini. Kamu juga sering ke kafe ini?', fallbackChoices: ['dua', 'tiga', 'empat', 'lima'] }, speakRequired: ['minggu', 'sering', 'kafe'],
    sceneCaption: { de: 'Dein Freund zählt die Tage im Kalender und fragt: „Kamu sudah berapa lama di kota ini?“', en: 'Your friend counts the days on the calendar and asks: “Kamu sudah berapa lama di kota ini?”' },
    trophyWord: { word: 'sering', meaning: { de: 'oft, häufig', en: 'often, frequently' }, example: 'Saya sering minum kopi di sini.', whyThisWord: { de: 'Das Wort führt vom besonderen zweiwöchigen Aufenthalt zurück zu einer vertrauten Gewohnheit unter Freunden.', en: 'The word moves from the special two-week stay back to a familiar habit shared between friends.' } },
    distractors: ['satu bulan di hotel', 'jarang ke pasar ini'], placeholderCaption: { de: 'Ein kleiner Kalender mit zwei markierten Wochen liegt zwischen zwei Kaffeetassen.', en: 'A small calendar with two marked weeks lies between two coffee cups.' }, songMood: 'a reflective two-week refrain grounded in a familiar cafe routine', visualNotes: 'Cafe table, compact calendar with fourteen marked days, two coffee cups and two friends comparing routines.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'keluarga-telepon-setiap-minggu', title: { de: 'Anrufe nach Hause', en: 'Calls back home' },
    situation: { de: 'Deine Freundin fragt nach deiner Familie in Deutschland. Du erzählst von euren regelmäßigen Telefonaten und fragst zurück.', en: 'Your friend asks about your family in Germany. Describe your regular calls and ask her in return.' },
    pedagogicalGoal: 'Familie und eine regelmäßige Gewohnheit mit setiap minggu im Präsens beschreiben.',
    targetText: 'Keluarga saya di Jerman. Saya telepon mereka setiap minggu. Kamu juga?', baseText: { de: 'Meine Familie ist in Deutschland. Ich telefoniere jede Woche mit ihnen. Und du?', en: 'My family is in Germany. I call them every week. How about you?' },
    chunks: [{ targetText: 'Keluarga saya di Jerman.', baseText: { de: 'Meine Familie ist in Deutschland.', en: 'My family is in Germany.' } }, { targetText: 'Saya telepon mereka setiap minggu.', baseText: { de: 'Ich telefoniere jede Woche mit ihnen.', en: 'I call them every week.' } }, { targetText: 'Kamu juga?', baseText: { de: 'Und du?', en: 'How about you?' } }],
    terms: [{ targetText: 'keluarga', baseText: { de: 'Familie', en: 'family' } }, { targetText: 'telepon', baseText: { de: 'telefonieren, anrufen', en: 'to call' } }, { targetText: 'mereka', baseText: { de: 'sie, ihnen', en: 'they, them' } }, { targetText: 'setiap minggu', baseText: { de: 'jede Woche', en: 'every week' } }, { targetText: 'di Jerman', baseText: { de: 'in Deutschland', en: 'in Germany' } }],
    recall: { before: '', answer: 'Keluarga', after: ' saya di Jerman. Saya telepon mereka setiap minggu. Kamu juga?', fallbackChoices: ['Keluarga', 'Teman', 'Tetangga', 'Rekan'] }, speakRequired: ['keluarga', 'telepon', 'minggu'],
    sceneCaption: { de: 'Deine Freundin sieht das Familienfoto neben deinem Handy und fragt: „Keluarga kamu tinggal di mana? Kamu sering telepon mereka?“', en: 'Your friend notices the family photo beside your phone and asks: “Keluarga kamu tinggal di mana? Kamu sering telepon mereka?”' },
    trophyWord: { word: 'keluarga', meaning: { de: 'Familie', en: 'family' }, example: 'Keluarga saya tinggal di Jerman.', whyThisWord: { de: 'Das Wort öffnet ein persönliches Alltagsthema, über das Freunde regelmäßig und unkompliziert sprechen.', en: 'This word opens a personal everyday topic that friends can discuss regularly and easily.' } },
    distractors: ['teman saya dekat sini', 'kami kirim pesan pagi'], placeholderCaption: { de: 'Ein Familienfoto liegt neben einem Handy mit einem wöchentlichen Anrufsymbol.', en: 'A family photo sits beside a phone showing a weekly call reminder.' }, songMood: 'a gentle long-distance motif linking home and a new friendship', visualNotes: 'Cafe table, family photo, phone with weekly call reminder and a friend listening with interest.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'suka-memasak-dan-berjalan', title: { de: 'Was du gern machst', en: 'What you enjoy doing' },
    situation: { de: 'Dein Freund fragt nach deinen Hobbys in der Stadt. Du nennst Kochen und Spaziergänge im Viertel und fragst nach seinen Interessen.', en: 'Your friend asks about your hobbies in the city. Name cooking and walks around the neighborhood, then ask about his interests.' },
    pedagogicalGoal: 'Zwei Freizeitaktivitäten mit suka im Präsens nennen und eine einfache Gegenfrage stellen.',
    targetText: 'Saya suka memasak dan berjalan kaki di kampung. Kamu suka apa?', baseText: { de: 'Ich koche gern und gehe im Viertel spazieren. Was machst du gern?', en: 'I like cooking and walking around the neighborhood. What do you like to do?' },
    chunks: [{ targetText: 'Saya suka memasak', baseText: { de: 'Ich koche gern', en: 'I like cooking' } }, { targetText: 'dan berjalan kaki di kampung.', baseText: { de: 'und gehe im Viertel spazieren.', en: 'and walking around the neighborhood.' } }, { targetText: 'Kamu suka apa?', baseText: { de: 'Was machst du gern?', en: 'What do you like?' } }],
    terms: [{ targetText: 'memasak', baseText: { de: 'kochen', en: 'to cook' } }, { targetText: 'berjalan kaki', baseText: { de: 'zu Fuß gehen, spazieren', en: 'to walk' } }, { targetText: 'kampung', baseText: { de: 'Viertel, Dorf', en: 'neighborhood, village' } }, { targetText: 'suka', baseText: { de: 'mögen, gern machen', en: 'to like' } }, { targetText: 'hobi', baseText: { de: 'Hobby', en: 'hobby' } }],
    recall: { before: 'Saya suka ', answer: 'memasak', after: ' dan berjalan kaki di kampung. Kamu suka apa?', fallbackChoices: ['memasak', 'membaca', 'berenang', 'menari'] }, speakRequired: ['memasak', 'berjalan', 'kampung'],
    sceneCaption: { de: 'Dein Freund zeigt auf den ruhigen Weg durchs Viertel und fragt: „Apa hobi kamu di sini?“', en: 'Your friend points toward the quiet neighborhood path and asks: “Apa hobi kamu di sini?”' },
    trophyWord: { word: 'memasak', meaning: { de: 'kochen', en: 'to cook' }, example: 'Saya suka memasak sayur untuk makan malam.', whyThisWord: { de: 'Das Verb bringt ein persönliches Hobby in das Gespräch und macht deinen Alltag anschaulicher.', en: 'This verb brings a personal hobby into the conversation and makes your daily life more vivid.' } },
    distractors: ['bermain musik di rumah', 'naik bus ke pusat'], placeholderCaption: { de: 'Eine kleine Küche und ein ruhiger Weg durchs Viertel stehen für deine beiden Hobbys.', en: 'A small kitchen and a quiet neighborhood path represent your two hobbies.' }, songMood: 'a light weekend acoustic pattern moving from the kitchen to a neighborhood walk', visualNotes: 'Split everyday scene, simple home kitchen on one side, leafy kampung lane on the other and two friends chatting between them.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'bekerja-pagi-belajar-malam', title: { de: 'Dein Tagesrhythmus', en: 'Your daily rhythm' },
    situation: { de: 'Deine Freundin möchte wissen, wann du arbeitest und lernst. Du beschreibst deinen einfachen Tagesrhythmus und fragst zurück.', en: 'Your friend wants to know when you work and study. Describe your simple daily rhythm and ask her in return.' },
    pedagogicalGoal: 'Zwei regelmäßige Tageszeiten mit Präsenshandlungen zu einem klaren Tagesablauf verbinden.',
    targetText: 'Saya bekerja pagi hari dan belajar bahasa Indonesia malam hari. Kamu juga?', baseText: { de: 'Ich arbeite morgens und lerne abends Indonesisch. Und du?', en: 'I work in the morning and study Indonesian at night. How about you?' },
    chunks: [{ targetText: 'Saya bekerja pagi hari', baseText: { de: 'Ich arbeite morgens', en: 'I work in the morning' } }, { targetText: 'dan belajar bahasa Indonesia malam hari.', baseText: { de: 'und lerne abends Indonesisch.', en: 'and study Indonesian at night.' } }, { targetText: 'Kamu juga?', baseText: { de: 'Und du?', en: 'How about you?' } }],
    terms: [{ targetText: 'bekerja', baseText: { de: 'arbeiten', en: 'to work' } }, { targetText: 'pagi hari', baseText: { de: 'morgens, am Morgen', en: 'in the morning' } }, { targetText: 'belajar', baseText: { de: 'lernen', en: 'to study, learn' } }, { targetText: 'malam hari', baseText: { de: 'abends, am Abend', en: 'at night, in the evening' } }, { targetText: 'bahasa Indonesia', baseText: { de: 'Indonesisch', en: 'Indonesian' } }],
    recall: { before: 'Saya ', answer: 'bekerja', after: ' pagi hari dan belajar bahasa Indonesia malam hari. Kamu juga?', fallbackChoices: ['bekerja', 'memasak', 'berjalan', 'berbelanja'] }, speakRequired: ['bekerja', 'belajar', 'malam'],
    sceneCaption: { de: 'Deine Freundin betrachtet deinen einfachen Tagesplan und fragt: „Kamu biasanya bekerja dan belajar kapan?“', en: 'Your friend looks at your simple daily schedule and asks: “Kamu biasanya bekerja dan belajar kapan?”' },
    trophyWord: { word: 'bekerja', meaning: { de: 'arbeiten', en: 'to work' }, example: 'Saya bekerja di kantor setiap pagi.', whyThisWord: { de: 'Das Verb verankert deine Lernzeit in einem realistischen Tagesablauf aus Arbeit und Abendroutine.', en: 'This verb anchors your study time in a realistic daily routine of work and evening practice.' } },
    distractors: ['siang hari di pasar', 'tidur setelah sarapan'], placeholderCaption: { de: 'Ein Tagesplan zeigt morgens das Büro und abends ein geöffnetes Indonesischheft.', en: 'A daily schedule shows the office in the morning and an open Indonesian notebook at night.' }, songMood: 'a balanced day-and-night rhythm for work and language practice', visualNotes: 'Simple illustrated schedule, sunrise over an office, evening lamp over an Indonesian notebook and two friends comparing routines.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'hampir-mengerti-bicara-pelan', title: { de: 'Fast alles verstehen', en: 'Understanding almost everything' },
    situation: { de: 'Dein Freund fragt nach deinen Fortschritten. Du sagst ehrlich, was schon gut klappt und wobei du noch langsam bist.', en: 'Your friend asks about your progress. Say honestly what is going well and where you are still slow.' },
    pedagogicalGoal: 'Fortschritt mit hampir und einen gegenwärtigen Gegensatz mit tetapi ausdrücken.',
    targetText: 'Saya mengerti hampir semuanya, tetapi saya masih bicara pelan. Kamu mengerti?', baseText: { de: 'Ich verstehe fast alles, aber ich spreche noch langsam. Verstehst du mich?', en: 'I understand almost everything, but I still speak slowly. Do you understand me?' },
    chunks: [{ targetText: 'Saya mengerti hampir semuanya,', baseText: { de: 'Ich verstehe fast alles,', en: 'I understand almost everything,' } }, { targetText: 'tetapi saya masih bicara pelan.', baseText: { de: 'aber ich spreche noch langsam.', en: 'but I still speak slowly.' } }, { targetText: 'Kamu mengerti?', baseText: { de: 'Verstehst du mich?', en: 'Do you understand me?' } }],
    terms: [{ targetText: 'mengerti', baseText: { de: 'verstehen', en: 'to understand' } }, { targetText: 'hampir semuanya', baseText: { de: 'fast alles', en: 'almost everything' } }, { targetText: 'masih', baseText: { de: 'noch', en: 'still' } }, { targetText: 'bicara', baseText: { de: 'sprechen', en: 'to speak' } }, { targetText: 'pelan', baseText: { de: 'langsam, leise', en: 'slowly, softly' } }],
    recall: { before: 'Saya mengerti ', answer: 'hampir', after: ' semuanya, tetapi saya masih bicara pelan. Kamu mengerti?', fallbackChoices: ['hampir', 'selalu', 'jarang', 'belum'] }, speakRequired: ['mengerti', 'hampir', 'pelan'],
    sceneCaption: { de: 'Dein Freund legt die Speisekarte weg und fragt: „Sekarang kamu lebih mengerti bahasa Indonesia?“', en: 'Your friend puts the menu aside and asks: “Sekarang kamu lebih mengerti bahasa Indonesia?”' },
    trophyWord: { word: 'hampir', meaning: { de: 'fast, beinahe', en: 'almost, nearly' }, example: 'Saya hampir mengerti semua kata.', whyThisWord: { de: 'Das Wort zeigt echten Fortschritt, ohne so zu tun, als wäre schon jedes Gespräch mühelos.', en: 'This word shows real progress without pretending that every conversation is effortless already.' } },
    distractors: ['saya tidak bicara', 'semua kata terlalu cepat'], placeholderCaption: { de: 'Zwei Freunde sprechen entspannt, während nur wenige Wörter in einer Sprechblase noch unscharf bleiben.', en: 'Two friends talk comfortably while only a few words in a speech bubble remain unclear.' }, songMood: 'a quietly confident progression with space for slow, careful speech', visualNotes: 'Two friends in easy conversation, mostly clear speech bubbles, a few soft unfinished words and an encouraging smile.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'tahun-depan-datang-lagi', title: { de: 'Nächstes Jahr wieder', en: 'Back next year' },
    situation: { de: 'Deine Freundin fragt nach deinen Plänen für das nächste Jahr. Du versprichst eine Rückkehr und teilst die gute Nachricht.', en: 'Your friend asks about your plans for next year. Promise to return and share the good news.' },
    pedagogicalGoal: 'Eine einzige Zukunftsaussage mit tahun depan klar zeitlich markieren.',
    targetText: 'Tahun depan saya datang lagi. Kamu senang mendengar kabar ini?', baseText: { de: 'Nächstes Jahr komme ich wieder. Freust du dich über diese Nachricht?', en: 'I am coming back next year. Are you happy to hear this news?' },
    chunks: [{ targetText: 'Tahun depan saya datang lagi.', baseText: { de: 'Nächstes Jahr komme ich wieder.', en: 'I am coming back next year.' } }, { targetText: 'Kamu senang mendengar', baseText: { de: 'Freust du dich über', en: 'Are you happy to hear' } }, { targetText: 'kabar ini?', baseText: { de: 'diese Nachricht?', en: 'this news?' } }],
    terms: [{ targetText: 'tahun depan', baseText: { de: 'nächstes Jahr', en: 'next year' } }, { targetText: 'datang lagi', baseText: { de: 'wiederkommen', en: 'to come back' } }, { targetText: 'senang', baseText: { de: 'froh, glücklich', en: 'happy, glad' } }, { targetText: 'mendengar', baseText: { de: 'hören', en: 'to hear' } }, { targetText: 'kabar', baseText: { de: 'Nachricht, Neuigkeit', en: 'news' } }],
    recall: { before: '', answer: 'Tahun', after: ' depan saya datang lagi. Kamu senang mendengar kabar ini?', fallbackChoices: ['Tahun', 'Bulan', 'Minggu', 'Hari'] }, speakRequired: ['tahun', 'datang', 'kabar'],
    sceneCaption: { de: 'Deine Freundin blickt erwartungsvoll auf den Kalender und fragt: „Kamu punya rencana tahun depan?“', en: 'Your friend looks expectantly at the calendar and asks: “Kamu punya rencana tahun depan?”' },
    trophyWord: { word: 'tahun', meaning: { de: 'Jahr', en: 'year' }, example: 'Tahun depan saya kembali ke kota ini.', whyThisWord: { de: 'Das Zeitwort setzt deine Rückkehr eindeutig in die Zukunft und gibt dem Abschied neue Vorfreude.', en: 'This time word places your return clearly in the future and gives the farewell a new sense of anticipation.' } },
    distractors: ['hari ini saya di sini', 'kamu suka kota ini'], placeholderCaption: { de: 'Zwei Freunde markieren das nächste Jahr in einem Kalender und lächeln über das Wiedersehen.', en: 'Two friends mark next year on a calendar and smile about seeing each other again.' }, songMood: 'a hopeful acoustic lift carrying the friendship into next year', visualNotes: 'Cafe table, calendar opened to next year, two friends circling a return date and smiling across their cups.',
  }),
  makeIndonesianA2CompactLesson({
    slug: 'terima-kasih-semua-cerita', title: { de: 'Danke für die Geschichten', en: 'Thank you for the stories' },
    situation: { de: 'Euer letztes Gespräch vor der Abreise endet. Du dankst deiner Freundin, blickst auf das Gelernte zurück und verabschiedest dich herzlich.', en: 'Your final conversation before leaving comes to a close. Thank your friend, look back on what you learned, and say a warm goodbye.' },
    pedagogicalGoal: 'Den gesamten A2-Weg mit einem einzigen abgeschlossenen Rückblick durch sudah und einem herzlichen Abschied abrunden.',
    targetText: 'Terima kasih untuk semua cerita. Saya sudah belajar banyak dari kamu. Sampai jumpa.', baseText: { de: 'Danke für all die Geschichten. Ich habe schon viel von dir gelernt. Bis bald.', en: 'Thank you for all the stories. I have already learned a lot from you. See you.' },
    chunks: [{ targetText: 'Terima kasih untuk semua cerita.', baseText: { de: 'Danke für all die Geschichten.', en: 'Thank you for all the stories.' } }, { targetText: 'Saya sudah belajar banyak dari kamu.', baseText: { de: 'Ich habe schon viel von dir gelernt.', en: 'I have already learned a lot from you.' } }, { targetText: 'Sampai jumpa.', baseText: { de: 'Bis bald.', en: 'See you.' } }],
    terms: [{ targetText: 'terima kasih', baseText: { de: 'danke', en: 'thank you' } }, { targetText: 'cerita', baseText: { de: 'Geschichte, Erzählung', en: 'story' } }, { targetText: 'sudah belajar', baseText: { de: 'schon gelernt haben', en: 'to have already learned' } }, { targetText: 'dari kamu', baseText: { de: 'von dir', en: 'from you' } }, { targetText: 'sampai jumpa', baseText: { de: 'bis bald, auf Wiedersehen', en: 'see you' } }],
    recall: { before: 'Terima kasih untuk semua ', answer: 'cerita', after: '. Saya sudah belajar banyak dari kamu. Sampai jumpa.', fallbackChoices: ['cerita', 'foto', 'buku', 'musik'] }, speakRequired: ['cerita', 'belajar', 'jumpa'],
    sceneCaption: { de: 'Deine Freundin hebt zum Abschied ihre Tasse und fragt: „Bagaimana pengalaman kamu selama dua minggu di sini?“', en: 'Your friend raises her cup for the farewell and asks: “Bagaimana pengalaman kamu selama dua minggu di sini?”' },
    trophyWord: { word: 'cerita', meaning: { de: 'Geschichte, Erzählung', en: 'story, tale' }, example: 'Kami berbagi cerita di kafe.', whyThisWord: { de: 'Das Wort bewahrt die vielen kleinen Gespräche, aus denen dein ganzer Indonesisch-A2-Weg entstanden ist.', en: 'This word holds the many small conversations that shaped your entire Indonesian A2 journey.' } },
    distractors: ['kita minum kopi lagi', 'hari ini sangat sibuk'], placeholderCaption: { de: 'Zwei Freunde stoßen im vertrauten Café ein letztes Mal mit ihren Tassen an.', en: 'Two friends raise their cups one last time in the familiar cafe.' }, songMood: 'a warm final acoustic reprise filled with gratitude and an open horizon', visualNotes: 'Golden-hour cafe farewell, two friends raising cups, a closed Indonesian notebook and the city glowing beyond the window.',
  }),
]

export const INDONESIAN_A2_PRACTICAL_10_LESSONS: GuidedLessonDefinition[] = makeIndonesianA2PracticalLessons(
  GUIDED_TODAY_PATH_INDONESIAN_A2_TEN_METADATA, indonesianA2Practical10Inputs,
  { de: 'Du hast den gesamten Indonesisch-A2-Kurs abgeschlossen: Dein Alltag, deine Pläne und deine Geschichten tragen dich jetzt sicher durch echte Gespräche.', en: 'You have completed the full Indonesian A2 course: your daily life, plans, and stories now carry you confidently through real conversations.' },
)
