// Russian Cyrillic — Script Lab inventory.
//
// Content notes:
// - Romanization is practical transcription in the BGN/PCGN style
//   (ж→zh, х→kh, ц→ts, ч→ch, ш→sh, щ→shch; ь→ʹ, ъ→ʺ; е→ye/e, ё→yo).
//   It is helper text only, never the learning target.
// - Audio `text` is what a TTS engine should say: the Russian letter names
//   (бэ, вэ, гэ, …, мягкий знак) for consonants and signs, the vowel letter
//   itself for vowels (а, е, ё, …). Bare consonant letters are never sent to
//   TTS — engines misread them.
// - Sections follow the Cyrillic pedagogy from the Script Lab skill:
//   looks-and-sounds-familiar → false friends (В Н Р С У Х) → new letters →
//   signs (ь ъ). No composition — Cyrillic letters sit in a row.
// - ь and ъ share `homophone:silent-sign`: both are silent in modern Russian,
//   so they must never appear as mutual sound distractors in the quiz.
// - Validated by scripts/test-script-lab-data.ts (`npm run test:script-lab`),
//   which cross-checks the full 33-letter inventory, the letter-name audio
//   map, and example-word prominence.

import type { LocalizedText, ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'

function lt(en: string, de: string, fr: string): LocalizedText {
  return { en, de, fr }
}

const symbols: ScriptSymbol[] = [
  // ── Looks and sounds familiar ──
  {
    id: 'a', character: 'А', type: 'vowel', romanization: 'a', ipa: '[a]', order: 1,
    pronunciationNote: lt(
      'Like a in "father" — exactly what it looks like.',
      'Wie das a in „Vater“ — genau das, wonach es aussieht.',
      'Comme le a de « papa » — exactement ce qu’il paraît.',
    ),
    exampleWord: { word: 'август', romanization: 'avgust', meaning: lt('August', 'August', 'août'), audio: { itemId: 'word-a', text: 'август' } },
    audio: { itemId: 'symbol-a', text: 'а' },
  },
  {
    id: 'ye', character: 'Е', type: 'vowel', romanization: 'ye/e', ipa: '[je]', order: 2,
    pronunciationNote: lt(
      'Like "ye" in "yes"; after a consonant it is a soft e.',
      'Wie „je“ in „jemand“; nach einem Konsonanten ein weiches e.',
      'Comme « yé » dans « yéti » ; après une consonne, un é doux.',
    ),
    exampleWord: { word: 'евро', romanization: 'yevro', meaning: lt('euro', 'Euro', 'euro'), audio: { itemId: 'word-ye', text: 'евро' } },
    audio: { itemId: 'symbol-ye', text: 'е' },
  },
  {
    id: 'k', character: 'К', type: 'consonant', name: 'ка', romanization: 'k', ipa: '[k]', order: 3,
    pronunciationNote: lt(
      'Like k in "kite", but without the puff of air.',
      'Wie das k in „Kino“, aber ohne Lufthauch.',
      'Comme le k de « kilo », sans souffle d’air.',
    ),
    exampleWord: { word: 'кот', romanization: 'kot', meaning: lt('cat', 'Kater', 'chat'), audio: { itemId: 'word-k', text: 'кот' } },
    audio: { itemId: 'symbol-k', text: 'ка' },
  },
  {
    id: 'm', character: 'М', type: 'consonant', name: 'эм', romanization: 'm', ipa: '[m]', order: 4,
    pronunciationNote: lt(
      'Like m in "moon".',
      'Wie das m in „Mond“.',
      'Comme le m de « mer ».',
    ),
    exampleWord: { word: 'мама', romanization: 'mama', meaning: lt('mom', 'Mama', 'maman'), audio: { itemId: 'word-m', text: 'мама' } },
    audio: { itemId: 'symbol-m', text: 'эм' },
  },
  {
    id: 'o', character: 'О', type: 'vowel', romanization: 'o', ipa: '[o]', order: 5,
    pronunciationNote: lt(
      'A pure o as in "more" when stressed; unstressed it relaxes toward a.',
      'Ein reines o wie in „Ofen“, wenn betont; unbetont klingt es fast wie a.',
      'Un o pur comme dans « or » quand il est accentué ; non accentué, il glisse vers a.',
    ),
    exampleWord: { word: 'осень', romanization: 'osenʹ', meaning: lt('autumn', 'Herbst', 'automne'), audio: { itemId: 'word-o', text: 'осень' } },
    audio: { itemId: 'symbol-o', text: 'о' },
  },
  {
    id: 't', character: 'Т', type: 'consonant', name: 'тэ', romanization: 't', ipa: '[t]', order: 6,
    pronunciationNote: lt(
      'Like t in "stop", with the tongue touching the teeth.',
      'Wie das t in „Tag“, die Zunge berührt die Zähne.',
      'Comme le t de « table », langue contre les dents.',
    ),
    exampleWord: { word: 'такси', romanization: 'taksi', meaning: lt('taxi', 'Taxi', 'taxi'), audio: { itemId: 'word-t', text: 'такси' } },
    audio: { itemId: 'symbol-t', text: 'тэ' },
  },

  // ── False friends (В Н Р С У Х) ──
  {
    id: 'v', character: 'В', type: 'consonant', name: 'вэ', romanization: 'v', ipa: '[v]', order: 1,
    pronunciationNote: lt(
      'Looks like B but sounds like v in "voice".',
      'Sieht aus wie B, klingt aber wie das w in „Wasser“.',
      'Ressemble à B mais se prononce comme le v de « voix ».',
    ),
    exampleWord: { word: 'вода', romanization: 'voda', meaning: lt('water', 'Wasser', 'eau'), audio: { itemId: 'word-v', text: 'вода' } },
    audio: { itemId: 'symbol-v', text: 'вэ' },
  },
  {
    id: 'n', character: 'Н', type: 'consonant', name: 'эн', romanization: 'n', ipa: '[n]', order: 2,
    pronunciationNote: lt(
      'Looks like H but sounds like n in "now".',
      'Sieht aus wie H, klingt aber wie das n in „nein“.',
      'Ressemble à H mais se prononce comme le n de « nuit ».',
    ),
    exampleWord: { word: 'нос', romanization: 'nos', meaning: lt('nose', 'Nase', 'nez'), audio: { itemId: 'word-n', text: 'нос' } },
    audio: { itemId: 'symbol-n', text: 'эн' },
  },
  {
    id: 'r', character: 'Р', type: 'consonant', name: 'эр', romanization: 'r', ipa: '[r]', order: 3,
    pronunciationNote: lt(
      'Looks like P but is a rolled r, as in Italian.',
      'Sieht aus wie P, ist aber ein gerolltes r wie im Italienischen.',
      'Ressemble à P mais c’est un r roulé, comme en italien.',
    ),
    exampleWord: { word: 'рука', romanization: 'ruka', meaning: lt('hand, arm', 'Hand, Arm', 'main, bras'), audio: { itemId: 'word-r', text: 'рука' } },
    audio: { itemId: 'symbol-r', text: 'эр' },
  },
  {
    id: 's', character: 'С', type: 'consonant', name: 'эс', romanization: 's', ipa: '[s]', order: 4,
    pronunciationNote: lt(
      'Looks like C but always sounds like s in "sun".',
      'Sieht aus wie C, klingt aber immer wie ein scharfes, stimmloses s.',
      'Ressemble à C mais se prononce toujours comme le s de « soleil ».',
    ),
    exampleWord: { word: 'сок', romanization: 'sok', meaning: lt('juice', 'Saft', 'jus'), audio: { itemId: 'word-s', text: 'сок' } },
    audio: { itemId: 'symbol-s', text: 'эс' },
  },
  {
    id: 'u', character: 'У', type: 'vowel', romanization: 'u', ipa: '[u]', order: 5,
    pronunciationNote: lt(
      'Looks like Y but sounds like oo in "moon".',
      'Sieht aus wie Y, klingt aber wie das u in „Mut“.',
      'Ressemble à Y mais se prononce comme le ou de « loup ».',
    ),
    exampleWord: { word: 'утро', romanization: 'utro', meaning: lt('morning', 'Morgen', 'matin'), audio: { itemId: 'word-u', text: 'утро' } },
    audio: { itemId: 'symbol-u', text: 'у' },
  },
  {
    id: 'kh', character: 'Х', type: 'consonant', name: 'ха', romanization: 'kh', ipa: '[x]', order: 6,
    pronunciationNote: lt(
      'Looks like X but is a raspy h, like Scottish "loch".',
      'Sieht aus wie X, klingt aber wie das ch in „Bach“.',
      'Ressemble à X mais c’est un h râpeux, comme la jota espagnole.',
    ),
    exampleWord: { word: 'хлеб', romanization: 'khleb', meaning: lt('bread', 'Brot', 'pain'), audio: { itemId: 'word-kh', text: 'хлеб' } },
    audio: { itemId: 'symbol-kh', text: 'ха' },
  },

  // ── New letters ──
  {
    id: 'b', character: 'Б', type: 'consonant', name: 'бэ', romanization: 'b', ipa: '[b]', order: 1,
    pronunciationNote: lt(
      'Like b in "book".',
      'Wie das b in „Buch“.',
      'Comme le b de « bon ».',
    ),
    exampleWord: { word: 'банан', romanization: 'banan', meaning: lt('banana', 'Banane', 'banane'), audio: { itemId: 'word-b', text: 'банан' } },
    audio: { itemId: 'symbol-b', text: 'бэ' },
  },
  {
    id: 'g', character: 'Г', type: 'consonant', name: 'гэ', romanization: 'g', ipa: '[ɡ]', order: 2,
    pronunciationNote: lt(
      'Like g in "go", always hard.',
      'Wie das g in „gut“, immer hart.',
      'Comme le g de « gare », toujours dur.',
    ),
    exampleWord: { word: 'город', romanization: 'gorod', meaning: lt('city', 'Stadt', 'ville'), audio: { itemId: 'word-g', text: 'город' } },
    audio: { itemId: 'symbol-g', text: 'гэ' },
  },
  {
    id: 'd', character: 'Д', type: 'consonant', name: 'дэ', romanization: 'd', ipa: '[d]', order: 3,
    pronunciationNote: lt(
      'Like d in "day", with the tongue touching the teeth.',
      'Wie das d in „Dach“, die Zunge berührt die Zähne.',
      'Comme le d de « doux », langue contre les dents.',
    ),
    exampleWord: { word: 'дом', romanization: 'dom', meaning: lt('house', 'Haus', 'maison'), audio: { itemId: 'word-d', text: 'дом' } },
    audio: { itemId: 'symbol-d', text: 'дэ' },
  },
  {
    id: 'yo', character: 'Ё', type: 'vowel', romanization: 'yo', ipa: '[jo]', order: 4,
    pronunciationNote: lt(
      'Like "yo" in "yogurt" — always the stressed syllable of its word.',
      'Wie „jo“ in „Joghurt“ — im Wort immer betont.',
      'Comme « yo » dans « yoga » — toujours la syllabe accentuée du mot.',
    ),
    exampleWord: { word: 'ёлка', romanization: 'yolka', meaning: lt('fir tree (Christmas tree)', 'Tanne (Weihnachtsbaum)', 'sapin (de Noël)'), audio: { itemId: 'word-yo', text: 'ёлка' } },
    audio: { itemId: 'symbol-yo', text: 'ё' },
  },
  {
    id: 'zh', character: 'Ж', type: 'consonant', name: 'жэ', romanization: 'zh', ipa: '[ʐ]', order: 5,
    pronunciationNote: lt(
      'Like s in "pleasure", but darker, with the tongue curled back.',
      'Wie das j in „Journal“, aber dunkler, mit zurückgebogener Zunge.',
      'Comme le j de « jour », mais plus sombre, langue recourbée.',
    ),
    exampleWord: { word: 'журнал', romanization: 'zhurnal', meaning: lt('magazine', 'Zeitschrift', 'magazine'), audio: { itemId: 'word-zh', text: 'журнал' } },
    audio: { itemId: 'symbol-zh', text: 'жэ' },
  },
  {
    id: 'z', character: 'З', type: 'consonant', name: 'зэ', romanization: 'z', ipa: '[z]', order: 6,
    pronunciationNote: lt(
      'Like z in "zoo".',
      'Wie das stimmhafte s in „Rose“.',
      'Comme le z de « zéro ».',
    ),
    exampleWord: { word: 'зима', romanization: 'zima', meaning: lt('winter', 'Winter', 'hiver'), audio: { itemId: 'word-z', text: 'зима' } },
    audio: { itemId: 'symbol-z', text: 'зэ' },
  },
  {
    id: 'i', character: 'И', type: 'vowel', romanization: 'i', ipa: '[i]', order: 7,
    pronunciationNote: lt(
      'Like ee in "see".',
      'Wie das i in „Igel“.',
      'Comme le i de « lit ».',
    ),
    exampleWord: { word: 'имя', romanization: 'imya', meaning: lt('name', 'Name', 'nom'), audio: { itemId: 'word-i', text: 'имя' } },
    audio: { itemId: 'symbol-i', text: 'и' },
  },
  {
    id: 'y-short', character: 'Й', type: 'consonant', name: 'и краткое', romanization: 'y', ipa: '[j]', order: 8,
    pronunciationNote: lt(
      'A short y-glide as in "boy" — its name means "short i".',
      'Ein kurzer j-Gleitlaut wie in „Mai“ — sein Name bedeutet „kurzes i“.',
      'Un y bref comme dans « ail » — son nom signifie « i bref ».',
    ),
    exampleWord: { word: 'йогурт', romanization: 'yogurt', meaning: lt('yogurt', 'Joghurt', 'yaourt'), audio: { itemId: 'word-y-short', text: 'йогурт' } },
    audio: { itemId: 'symbol-y-short', text: 'и краткое' },
  },
  {
    id: 'l', character: 'Л', type: 'consonant', name: 'эль', romanization: 'l', ipa: '[ɫ]', order: 9,
    pronunciationNote: lt(
      'Like l in "well", with the tongue a little further back.',
      'Wie das l in „hell“, die Zunge etwas weiter hinten.',
      'Comme le l de « bal », langue un peu plus en arrière.',
    ),
    exampleWord: { word: 'лампа', romanization: 'lampa', meaning: lt('lamp', 'Lampe', 'lampe'), audio: { itemId: 'word-l', text: 'лампа' } },
    audio: { itemId: 'symbol-l', text: 'эль' },
  },
  {
    id: 'p', character: 'П', type: 'consonant', name: 'пэ', romanization: 'p', ipa: '[p]', order: 10,
    pronunciationNote: lt(
      'Like p in "spin", without the puff of air.',
      'Wie das p in „Lampe“, ohne Lufthauch.',
      'Comme le p de « papa », sans souffle d’air.',
    ),
    exampleWord: { word: 'папа', romanization: 'papa', meaning: lt('dad', 'Papa', 'papa'), audio: { itemId: 'word-p', text: 'папа' } },
    audio: { itemId: 'symbol-p', text: 'пэ' },
  },
  {
    id: 'f', character: 'Ф', type: 'consonant', name: 'эф', romanization: 'f', ipa: '[f]', order: 11,
    pronunciationNote: lt(
      'Like f in "fun".',
      'Wie das f in „fein“.',
      'Comme le f de « fou ».',
    ),
    exampleWord: { word: 'фото', romanization: 'foto', meaning: lt('photo', 'Foto', 'photo'), audio: { itemId: 'word-f', text: 'фото' } },
    audio: { itemId: 'symbol-f', text: 'эф' },
  },
  {
    id: 'ts', character: 'Ц', type: 'consonant', name: 'це', romanization: 'ts', ipa: '[t͡s]', order: 12,
    pronunciationNote: lt(
      'Like ts in "cats" — one crisp sound.',
      'Wie das z in „Zeit“ — ein knackiges ts.',
      'Comme « ts » dans « tsé-tsé » — un seul son net.',
    ),
    exampleWord: { word: 'цирк', romanization: 'tsirk', meaning: lt('circus', 'Zirkus', 'cirque'), audio: { itemId: 'word-ts', text: 'цирк' } },
    audio: { itemId: 'symbol-ts', text: 'це' },
  },
  {
    id: 'ch', character: 'Ч', type: 'consonant', name: 'че', romanization: 'ch', ipa: '[t͡ɕ]', order: 13,
    pronunciationNote: lt(
      'Like ch in "cheese", always soft.',
      'Wie das tsch in „Tschüss“, immer weich.',
      'Comme « tch » dans « tchao », toujours doux.',
    ),
    exampleWord: { word: 'чай', romanization: 'chay', meaning: lt('tea', 'Tee', 'thé'), audio: { itemId: 'word-ch', text: 'чай' } },
    audio: { itemId: 'symbol-ch', text: 'че' },
  },
  {
    id: 'sh', character: 'Ш', type: 'consonant', name: 'ша', romanization: 'sh', ipa: '[ʂ]', order: 14,
    pronunciationNote: lt(
      'Like sh in "shoe", but harder, with the tongue curled back.',
      'Wie das sch in „Schule“, aber härter, mit zurückgebogener Zunge.',
      'Comme le ch de « chat », mais plus dur, langue recourbée.',
    ),
    exampleWord: { word: 'школа', romanization: 'shkola', meaning: lt('school', 'Schule', 'école'), audio: { itemId: 'word-sh', text: 'школа' } },
    audio: { itemId: 'symbol-sh', text: 'ша' },
  },
  {
    id: 'shch', character: 'Щ', type: 'consonant', name: 'ща', romanization: 'shch', ipa: '[ɕː]', order: 15,
    pronunciationNote: lt(
      'A long, soft "sh" — like "fresh sheets" said quickly.',
      'Ein langes, weiches sch, mit breitem Mund gesprochen.',
      'Un « ch » long et doux, prononcé en souriant.',
    ),
    exampleWord: { word: 'щенок', romanization: 'shchenok', meaning: lt('puppy', 'Welpe', 'chiot'), audio: { itemId: 'word-shch', text: 'щенок' } },
    audio: { itemId: 'symbol-shch', text: 'ща' },
  },
  {
    id: 'y', character: 'Ы', type: 'vowel', romanization: 'y', ipa: '[ɨ]', order: 16,
    pronunciationNote: lt(
      'Say "ee" but pull the tongue back — a deep i from the throat; it never starts a word.',
      'Sprich „i“ mit weit zurückgezogener Zunge — ein dumpfes i; steht nie am Wortanfang.',
      'Dites « i » avec la langue reculée — un i sombre et guttural ; ne commence jamais un mot.',
    ),
    exampleWord: { word: 'сыр', romanization: 'syr', meaning: lt('cheese', 'Käse', 'fromage'), audio: { itemId: 'word-y', text: 'сыр' } },
    audio: { itemId: 'symbol-y', text: 'ы' },
  },
  {
    id: 'e', character: 'Э', type: 'vowel', romanization: 'e', ipa: '[ɛ]', order: 17,
    pronunciationNote: lt(
      'A plain e as in "bed" — used where there is no y-glide.',
      'Ein einfaches e wie in „Bett“ — steht dort, wo kein j-Vorlaut ist.',
      'Un è ouvert comme dans « mère » — écrit quand il n’y a pas de glissement en y.',
    ),
    exampleWord: { word: 'это', romanization: 'eto', meaning: lt('this (is)', 'das (ist)', 'ceci, c’est'), audio: { itemId: 'word-e', text: 'это' } },
    audio: { itemId: 'symbol-e', text: 'э' },
  },
  {
    id: 'yu', character: 'Ю', type: 'vowel', romanization: 'yu', ipa: '[ju]', order: 18,
    pronunciationNote: lt(
      'Like "you"; after a consonant it is a u that softens the consonant.',
      'Wie „ju“ in „Juni“; nach einem Konsonanten ein u, das ihn weich macht.',
      'Comme « you » en anglais ; après une consonne, un ou qui l’adoucit.',
    ),
    exampleWord: { word: 'юбка', romanization: 'yubka', meaning: lt('skirt', 'Rock', 'jupe'), audio: { itemId: 'word-yu', text: 'юбка' } },
    audio: { itemId: 'symbol-yu', text: 'ю' },
  },
  {
    id: 'ya', character: 'Я', type: 'vowel', romanization: 'ya', ipa: '[ja]', order: 19,
    pronunciationNote: lt(
      'Like "ya" in "yard"; after a consonant it is an a that softens the consonant.',
      'Wie „ja“; nach einem Konsonanten ein a, das ihn weich macht.',
      'Comme « ya » dans « yaourt » ; après une consonne, un a qui l’adoucit.',
    ),
    exampleWord: { word: 'яблоко', romanization: 'yabloko', meaning: lt('apple', 'Apfel', 'pomme'), audio: { itemId: 'word-ya', text: 'яблоко' } },
    audio: { itemId: 'symbol-ya', text: 'я' },
  },

  // ── Signs (ь ъ) — silent letters that shape their neighbors ──
  {
    id: 'soft-sign', character: 'Ь', type: 'mark', name: 'мягкий знак', romanization: 'ʹ', order: 1, tags: ['homophone:silent-sign'],
    pronunciationNote: lt(
      'Silent — it softens the consonant before it, as in соль (salt).',
      'Stumm — macht den Konsonanten davor weich, wie in соль (Salz).',
      'Muette — elle adoucit la consonne qui précède, comme dans соль (sel).',
    ),
    exampleWord: { word: 'соль', romanization: 'solʹ', meaning: lt('salt', 'Salz', 'sel'), audio: { itemId: 'word-soft-sign', text: 'соль' } },
    audio: { itemId: 'symbol-soft-sign', text: 'мягкий знак' },
  },
  {
    id: 'hard-sign', character: 'Ъ', type: 'mark', name: 'твёрдый знак', romanization: 'ʺ', order: 2, tags: ['homophone:silent-sign'],
    pronunciationNote: lt(
      'Silent and rare — it keeps a consonant hard before е, ё, ю, я, adding a tiny break.',
      'Stumm und selten — hält einen Konsonanten vor е, ё, ю, я hart und fügt eine winzige Pause ein.',
      'Muet et rare — il garde la consonne dure devant е, ё, ю, я, avec une minuscule pause.',
    ),
    exampleWord: { word: 'подъезд', romanization: 'podʺyezd', meaning: lt('entrance (of a building)', 'Hauseingang', 'entrée d’immeuble'), audio: { itemId: 'word-hard-sign', text: 'подъезд' } },
    audio: { itemId: 'symbol-hard-sign', text: 'твёрдый знак' },
  },
]

const FAMILIAR_IDS = ['a', 'ye', 'k', 'm', 'o', 't']
const FALSE_FRIEND_IDS = ['v', 'n', 'r', 's', 'u', 'kh']
const NEW_LETTER_IDS = ['b', 'g', 'd', 'yo', 'zh', 'z', 'i', 'y-short', 'l', 'p', 'f', 'ts', 'ch', 'sh', 'shch', 'y', 'e', 'yu', 'ya']
const SIGN_IDS = ['soft-sign', 'hard-sign']

const russianCyrillic: ScriptDefinition = {
  id: 'russian-cyrillic',
  language: 'Russian',
  speechLang: 'ru-RU',
  kind: 'alphabet',
  nativeName: 'Кириллица',
  displayName: 'Cyrillic',
  tagline: lt(
    'The Russian alphabet — 33 Cyrillic letters, and you already know more of them than you think.',
    'Das russische Alphabet — 33 kyrillische Buchstaben, von denen du schon mehr kennst, als du denkst.',
    'L’alphabet russe — 33 lettres cyrilliques, et vous en connaissez déjà plus que vous ne le pensez.',
  ),
  intro: [
    lt(
      'Cyrillic was created in the 9th–10th century from Greek letters, and Russian uses 33 of them. It is a true alphabet: letters sit in a row, and most words are read almost exactly as they are written.',
      'Die Kyrillica entstand im 9.–10. Jahrhundert aus griechischen Buchstaben; das Russische nutzt 33 davon. Es ist ein echtes Alphabet: Die Buchstaben stehen in einer Reihe, und die meisten Wörter liest man fast genau so, wie sie geschrieben sind.',
      'Le cyrillique est né aux IXᵉ–Xᵉ siècles à partir des lettres grecques ; le russe en utilise 33. C’est un véritable alphabet : les lettres se suivent, et la plupart des mots se lisent presque exactement comme ils s’écrivent.',
    ),
    lt(
      'A handful of letters look and sound just like Latin ones (А, К, М, О, Т). Another six are false friends: В sounds like v, Н like n, Р like r, С like s, У like u and Х like kh. Unlearning those six is half the work.',
      'Einige Buchstaben sehen aus und klingen wie lateinische (А, К, М, О, Т). Sechs weitere sind falsche Freunde: В klingt wie w, Н wie n, Р wie r, С wie s, У wie u und Х wie ch. Diese sechs umzulernen ist die halbe Arbeit.',
      'Une poignée de lettres ressemblent aux lettres latines et se prononcent pareil (А, К, М, О, Т). Six autres sont de faux amis : В se prononce v, Н n, Р r, С s, У ou et Х kh. Désapprendre ces six-là, c’est la moitié du travail.',
    ),
    lt(
      'The rest are new shapes for sounds you mostly already make — Ж (zh), Ш (sh), Ю (yu). Two letters, ь and ъ, make no sound of their own: they fine-tune the consonant next to them.',
      'Der Rest sind neue Formen für Laute, die du größtenteils schon kennst — Ж (sch wie in „Journal“), Ш (sch), Ю (ju). Zwei Buchstaben, ь und ъ, haben keinen eigenen Laut: Sie feinjustieren den Konsonanten daneben.',
      'Le reste, ce sont de nouvelles formes pour des sons que vous produisez déjà — Ж (j), Ш (ch), Ю (you). Deux lettres, ь et ъ, n’ont aucun son propre : elles ajustent la consonne voisine.',
    ),
  ],
  sections: [
    {
      id: 'familiar',
      title: lt('Looks and sounds familiar', 'Vertraut in Form und Klang', 'Familières à l’œil et à l’oreille'),
      description: lt(
        'Six letters that look like Latin ones and sound the way you expect. Free wins.',
        'Sechs Buchstaben, die wie lateinische aussehen und so klingen, wie du erwartest. Geschenkte Punkte.',
        'Six lettres qui ressemblent aux lettres latines et se prononcent comme prévu. Des points gratuits.',
      ),
      symbolIds: FAMILIAR_IDS,
    },
    {
      id: 'false-friends',
      title: lt('False friends', 'Falsche Freunde', 'Faux amis'),
      description: lt(
        'These six look like Latin letters but sound completely different. Unlearn before you learn.',
        'Diese sechs sehen aus wie lateinische Buchstaben, klingen aber völlig anders. Erst umlernen, dann lernen.',
        'Ces six lettres ressemblent aux lettres latines mais se prononcent tout autrement. Désapprenez avant d’apprendre.',
      ),
      symbolIds: FALSE_FRIEND_IDS,
    },
    {
      id: 'new-letters',
      title: lt('New letters', 'Neue Buchstaben', 'Nouvelles lettres'),
      description: lt(
        'New shapes, mostly familiar sounds — from б (b) to я (ya). The heart of the alphabet.',
        'Neue Formen, meist vertraute Laute — von б (b) bis я (ja). Das Herz des Alphabets.',
        'Des formes nouvelles, des sons souvent connus — de б (b) à я (ya). Le cœur de l’alphabet.',
      ),
      symbolIds: NEW_LETTER_IDS,
    },
    {
      id: 'signs',
      title: lt('Signs — ь and ъ', 'Zeichen — ь und ъ', 'Signes — ь et ъ'),
      description: lt(
        'Two silent letters that never make a sound of their own — they change the consonant next to them.',
        'Zwei stumme Buchstaben ohne eigenen Laut — sie verändern den Konsonanten neben sich.',
        'Deux lettres muettes qui n’ont jamais de son propre — elles modifient la consonne voisine.',
      ),
      symbolIds: SIGN_IDS,
      advanced: true,
    },
  ],
  symbols,
}

export default russianCyrillic
