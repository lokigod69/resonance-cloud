// Japanese Hiragana — Script Lab inventory.
//
// Content notes:
// - Romanization is Hepburn (the system learners meet first): し→shi, ち→chi,
//   つ→tsu, ふ→fu, を→wo. It is helper text only, never the learning target.
// - Kind is `syllabary`: every symbol is a whole mora (one beat), so there is no
//   composition step — the kana already *is* its sound. Because of that, `audio.text`
//   is simply the kana itself: a lone hiragana is read correctly by every ja-JP TTS
//   voice (unlike a bare Cyrillic consonant or Hangul jamo), so listen-quiz questions
//   test real sound recognition rather than a letter name.
// - `type` maps onto the shared Script Lab enum descriptively: the five あ-row morae
//   are `vowel` (pure vowel, no onset), every other mora is `consonant` (it carries a
//   consonant or semivowel onset). The enum has no `syllable` member and `type` only
//   drives quiz behaviour for `final-consonant`, which a syllabary never uses.
// - お and を are homophones in modern Japanese (both [o]); they carry a shared
//   `homophone:o` tag and identical IPA so the quiz never plays one against the other.
//   を only ever appears as the object-marker particle, never word-initial, so its
//   example illustrates it in that role (ほんをよむ).
// - Audio degrades gracefully to browser speech-synthesis (ja-JP), exactly like the
//   Russian pack: no static clips exist for Japanese yet.
// - V1 scope is the 46 base gojūon kana only. Dakuten/handakuten (が…ぱ) and yōon
//   (きゃ…) are derivational — base kana plus a diacritic or a small kana — and would
//   roughly triple the pack; they belong in a later `advanced: true` pass (see the
//   syllabary note in the add-script-lab-language skill), not V1.
// - Validated by scripts/test-script-lab-data.ts (`npm run test:script-lab`), which
//   cross-checks the full 46-kana inventory against a canonical Hepburn map, the
//   self-speaking symbol audio, the base-kana-only example words, and the section shape.

import type { LocalizedText, ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'

function lt(en: string, de: string, fr: string): LocalizedText {
  return { en, de, fr }
}

const symbols: ScriptSymbol[] = [
  // ── Vowels (あ行) ──
  {
    id: 'a', character: 'あ', type: 'vowel', romanization: 'a', ipa: '[a]', order: 1,
    pronunciationNote: lt(
      'Like a in "father", short and clean.',
      'Wie das a in „Vater“, kurz und klar.',
      'Comme le a de « papa », bref et net.',
    ),
    exampleWord: { word: 'あさ', romanization: 'asa', meaning: lt('morning', 'Morgen', 'matin'), audio: { itemId: 'word-a', text: 'あさ' } },
    audio: { itemId: 'symbol-a', text: 'あ' },
  },
  {
    id: 'i', character: 'い', type: 'vowel', romanization: 'i', ipa: '[i]', order: 2,
    pronunciationNote: lt(
      'Like ee in "see", but short.',
      'Wie das i in „Liebe“, aber kurz.',
      'Comme le i de « lit », bref.',
    ),
    exampleWord: { word: 'いぬ', romanization: 'inu', meaning: lt('dog', 'Hund', 'chien'), audio: { itemId: 'word-i', text: 'いぬ' } },
    audio: { itemId: 'symbol-i', text: 'い' },
  },
  {
    id: 'u', character: 'う', type: 'vowel', romanization: 'u', ipa: '[ɯ]', order: 3,
    pronunciationNote: lt(
      'Like oo in "food", but with relaxed, unrounded lips.',
      'Wie das u in „Mut“, aber mit entspannten Lippen.',
      'Comme le ou de « loup », lèvres détendues.',
    ),
    exampleWord: { word: 'うみ', romanization: 'umi', meaning: lt('sea', 'Meer', 'mer'), audio: { itemId: 'word-u', text: 'うみ' } },
    audio: { itemId: 'symbol-u', text: 'う' },
  },
  {
    id: 'e', character: 'え', type: 'vowel', romanization: 'e', ipa: '[e]', order: 4,
    pronunciationNote: lt(
      'Like e in "bed".',
      'Wie das e in „Bett“.',
      'Comme le è de « mère ».',
    ),
    exampleWord: { word: 'えき', romanization: 'eki', meaning: lt('station', 'Bahnhof', 'gare'), audio: { itemId: 'word-e', text: 'えき' } },
    audio: { itemId: 'symbol-e', text: 'え' },
  },
  {
    id: 'o', character: 'お', type: 'vowel', romanization: 'o', ipa: '[o]', order: 5, tags: ['homophone:o'],
    pronunciationNote: lt(
      'Like o in "or", short.',
      'Wie das o in „Sonne“, kurz.',
      'Comme le o de « pomme », bref.',
    ),
    exampleWord: { word: 'おと', romanization: 'oto', meaning: lt('sound', 'Geräusch', 'son'), audio: { itemId: 'word-o', text: 'おと' } },
    audio: { itemId: 'symbol-o', text: 'お' },
  },

  // ── K and S rows (か行・さ行) ──
  {
    id: 'ka', character: 'か', type: 'consonant', romanization: 'ka', ipa: '[ka]', order: 1,
    pronunciationNote: lt(
      'Like "ca" in "car" — k plus the a sound.',
      'Wie „ka“ — k und der a-Laut.',
      'Comme « ka » — k plus le son a.',
    ),
    exampleWord: { word: 'かさ', romanization: 'kasa', meaning: lt('umbrella', 'Regenschirm', 'parapluie'), audio: { itemId: 'word-ka', text: 'かさ' } },
    audio: { itemId: 'symbol-ka', text: 'か' },
  },
  {
    id: 'ki', character: 'き', type: 'consonant', romanization: 'ki', ipa: '[ki]', order: 2,
    pronunciationNote: lt(
      'Like "key".',
      'Wie „ki“ in „Kiste“.',
      'Comme « qui ».',
    ),
    exampleWord: { word: 'きのこ', romanization: 'kinoko', meaning: lt('mushroom', 'Pilz', 'champignon'), audio: { itemId: 'word-ki', text: 'きのこ' } },
    audio: { itemId: 'symbol-ki', text: 'き' },
  },
  {
    id: 'ku', character: 'く', type: 'consonant', romanization: 'ku', ipa: '[kɯ]', order: 3,
    pronunciationNote: lt(
      'Like "coo", lips relaxed.',
      'Wie „ku“ in „Kuh“, Lippen entspannt.',
      'Comme « cou », lèvres détendues.',
    ),
    exampleWord: { word: 'くち', romanization: 'kuchi', meaning: lt('mouth', 'Mund', 'bouche'), audio: { itemId: 'word-ku', text: 'くち' } },
    audio: { itemId: 'symbol-ku', text: 'く' },
  },
  {
    id: 'ke', character: 'け', type: 'consonant', romanization: 'ke', ipa: '[ke]', order: 4,
    pronunciationNote: lt(
      'Like "ke" in "kept".',
      'Wie „ke“ in „Keller“.',
      'Comme « ké » dans « quel ».',
    ),
    exampleWord: { word: 'けさ', romanization: 'kesa', meaning: lt('this morning', 'heute Morgen', 'ce matin'), audio: { itemId: 'word-ke', text: 'けさ' } },
    audio: { itemId: 'symbol-ke', text: 'け' },
  },
  {
    id: 'ko', character: 'こ', type: 'consonant', romanization: 'ko', ipa: '[ko]', order: 5,
    pronunciationNote: lt(
      'Like "co" in "core".',
      'Wie „ko“ in „Koffer“.',
      'Comme « co » de « corps ».',
    ),
    exampleWord: { word: 'こえ', romanization: 'koe', meaning: lt('voice', 'Stimme', 'voix'), audio: { itemId: 'word-ko', text: 'こえ' } },
    audio: { itemId: 'symbol-ko', text: 'こ' },
  },
  {
    id: 'sa', character: 'さ', type: 'consonant', romanization: 'sa', ipa: '[sa]', order: 6,
    pronunciationNote: lt(
      'Like "sa" in "salsa", with a sharp s.',
      'Wie „sa“ mit scharfem s wie in „Tasse“.',
      'Comme « sa » avec un s dur comme dans « sac ».',
    ),
    exampleWord: { word: 'さかな', romanization: 'sakana', meaning: lt('fish', 'Fisch', 'poisson'), audio: { itemId: 'word-sa', text: 'さかな' } },
    audio: { itemId: 'symbol-sa', text: 'さ' },
  },
  {
    id: 'shi', character: 'し', type: 'consonant', romanization: 'shi', ipa: '[ɕi]', order: 7,
    pronunciationNote: lt(
      'Like "she" — never "si".',
      'Wie „schi“ in „Schiff“ — nie „si“.',
      'Comme « chi » de « chic » — jamais « si ».',
    ),
    exampleWord: { word: 'しお', romanization: 'shio', meaning: lt('salt', 'Salz', 'sel'), audio: { itemId: 'word-shi', text: 'しお' } },
    audio: { itemId: 'symbol-shi', text: 'し' },
  },
  {
    id: 'su', character: 'す', type: 'consonant', romanization: 'su', ipa: '[sɯ]', order: 8,
    pronunciationNote: lt(
      'Like "soo", lips relaxed; often barely voiced.',
      'Wie „su“ mit scharfem s, Lippen entspannt; oft kaum hörbar.',
      'Comme « sou », s dur, lèvres détendues.',
    ),
    exampleWord: { word: 'すし', romanization: 'sushi', meaning: lt('sushi', 'Sushi', 'sushi'), audio: { itemId: 'word-su', text: 'すし' } },
    audio: { itemId: 'symbol-su', text: 'す' },
  },
  {
    id: 'se', character: 'せ', type: 'consonant', romanization: 'se', ipa: '[se]', order: 9,
    pronunciationNote: lt(
      'Like "se" in "set", with a sharp s.',
      'Wie „se“ mit scharfem s wie in „Sessel“.',
      'Comme « se » avec un s dur, comme « sept ».',
    ),
    exampleWord: { word: 'せかい', romanization: 'sekai', meaning: lt('world', 'Welt', 'monde'), audio: { itemId: 'word-se', text: 'せかい' } },
    audio: { itemId: 'symbol-se', text: 'せ' },
  },
  {
    id: 'so', character: 'そ', type: 'consonant', romanization: 'so', ipa: '[so]', order: 10,
    pronunciationNote: lt(
      'Like "so", with a sharp s.',
      'Wie „so“ mit scharfem s.',
      'Comme « so » avec un s dur, comme « sotte ».',
    ),
    exampleWord: { word: 'そら', romanization: 'sora', meaning: lt('sky', 'Himmel', 'ciel'), audio: { itemId: 'word-so', text: 'そら' } },
    audio: { itemId: 'symbol-so', text: 'そ' },
  },

  // ── T and N rows (た行・な行) ──
  {
    id: 'ta', character: 'た', type: 'consonant', romanization: 'ta', ipa: '[ta]', order: 1,
    pronunciationNote: lt(
      'Like "ta" in "taco".',
      'Wie „ta“ in „Tasse“.',
      'Comme « ta » de « tasse ».',
    ),
    exampleWord: { word: 'たこ', romanization: 'tako', meaning: lt('octopus', 'Tintenfisch', 'poulpe'), audio: { itemId: 'word-ta', text: 'たこ' } },
    audio: { itemId: 'symbol-ta', text: 'た' },
  },
  {
    id: 'chi', character: 'ち', type: 'consonant', romanization: 'chi', ipa: '[tɕi]', order: 2,
    pronunciationNote: lt(
      'Like "chee" in "cheese" — never "ti".',
      'Wie „tschi“ (wie „tschüss“, aber mit i) — nie „ti“.',
      'Comme « tchi » — jamais « ti ».',
    ),
    exampleWord: { word: 'ちち', romanization: 'chichi', meaning: lt('father', 'Vater', 'père'), audio: { itemId: 'word-chi', text: 'ちち' } },
    audio: { itemId: 'symbol-chi', text: 'ち' },
  },
  {
    id: 'tsu', character: 'つ', type: 'consonant', romanization: 'tsu', ipa: '[tsɯ]', order: 3,
    pronunciationNote: lt(
      'Like the "ts" in "cats" plus u — one crisp sound.',
      'Wie das „z“ in „Zeit“ plus u — ein knapper Laut.',
      'Comme « ts » de « tsar » plus ou — un son bref.',
    ),
    exampleWord: { word: 'つき', romanization: 'tsuki', meaning: lt('moon', 'Mond', 'lune'), audio: { itemId: 'word-tsu', text: 'つき' } },
    audio: { itemId: 'symbol-tsu', text: 'つ' },
  },
  {
    id: 'te', character: 'て', type: 'consonant', romanization: 'te', ipa: '[te]', order: 4,
    pronunciationNote: lt(
      'Like "te" in "ten".',
      'Wie „te“ in „Tempo“.',
      'Comme « té » de « thé ».',
    ),
    exampleWord: { word: 'てんき', romanization: 'tenki', meaning: lt('weather', 'Wetter', 'temps (météo)'), audio: { itemId: 'word-te', text: 'てんき' } },
    audio: { itemId: 'symbol-te', text: 'て' },
  },
  {
    id: 'to', character: 'と', type: 'consonant', romanization: 'to', ipa: '[to]', order: 5,
    pronunciationNote: lt(
      'Like "to" in "tore".',
      'Wie „to“ in „Tor“.',
      'Comme « to » de « tôt ».',
    ),
    exampleWord: { word: 'とり', romanization: 'tori', meaning: lt('bird', 'Vogel', 'oiseau'), audio: { itemId: 'word-to', text: 'とり' } },
    audio: { itemId: 'symbol-to', text: 'と' },
  },
  {
    id: 'na', character: 'な', type: 'consonant', romanization: 'na', ipa: '[na]', order: 6,
    pronunciationNote: lt(
      'Like "na" in "nah".',
      'Wie „na“ in „nass“.',
      'Comme « na » de « nappe ».',
    ),
    exampleWord: { word: 'なつ', romanization: 'natsu', meaning: lt('summer', 'Sommer', 'été'), audio: { itemId: 'word-na', text: 'なつ' } },
    audio: { itemId: 'symbol-na', text: 'な' },
  },
  {
    id: 'ni', character: 'に', type: 'consonant', romanization: 'ni', ipa: '[ɲi]', order: 7,
    pronunciationNote: lt(
      'Like "knee".',
      'Wie „ni“ in „nie“.',
      'Comme « ni » de « nid ».',
    ),
    exampleWord: { word: 'にく', romanization: 'niku', meaning: lt('meat', 'Fleisch', 'viande'), audio: { itemId: 'word-ni', text: 'にく' } },
    audio: { itemId: 'symbol-ni', text: 'に' },
  },
  {
    id: 'nu', character: 'ぬ', type: 'consonant', romanization: 'nu', ipa: '[nɯ]', order: 8,
    pronunciationNote: lt(
      'Like "noo" in "noodle".',
      'Wie „nu“ in „Nudel“.',
      'Comme « nou » de « nouille ».',
    ),
    exampleWord: { word: 'ぬの', romanization: 'nuno', meaning: lt('cloth', 'Stoff', 'tissu'), audio: { itemId: 'word-nu', text: 'ぬの' } },
    audio: { itemId: 'symbol-nu', text: 'ぬ' },
  },
  {
    id: 'ne', character: 'ね', type: 'consonant', romanization: 'ne', ipa: '[ne]', order: 9,
    pronunciationNote: lt(
      'Like "ne" in "net".',
      'Wie „ne“ in „nett“.',
      'Comme « nè » de « nette ».',
    ),
    exampleWord: { word: 'ねこ', romanization: 'neko', meaning: lt('cat', 'Katze', 'chat'), audio: { itemId: 'word-ne', text: 'ねこ' } },
    audio: { itemId: 'symbol-ne', text: 'ね' },
  },
  {
    id: 'no', character: 'の', type: 'consonant', romanization: 'no', ipa: '[no]', order: 10,
    pronunciationNote: lt(
      'Like "no".',
      'Wie „no“ in „Note“.',
      'Comme « no » de « note ».',
    ),
    exampleWord: { word: 'のり', romanization: 'nori', meaning: lt('seaweed (nori)', 'Nori-Alge', 'algue (nori)'), audio: { itemId: 'word-no', text: 'のり' } },
    audio: { itemId: 'symbol-no', text: 'の' },
  },

  // ── H and M rows (は行・ま行) ──
  {
    id: 'ha', character: 'は', type: 'consonant', romanization: 'ha', ipa: '[ha]', order: 1,
    pronunciationNote: lt(
      'Like "ha" in "hard".',
      'Wie „ha“ in „hart“.',
      'Comme « ha », avec un h aspiré léger.',
    ),
    exampleWord: { word: 'はな', romanization: 'hana', meaning: lt('flower', 'Blume', 'fleur'), audio: { itemId: 'word-ha', text: 'はな' } },
    audio: { itemId: 'symbol-ha', text: 'は' },
  },
  {
    id: 'hi', character: 'ひ', type: 'consonant', romanization: 'hi', ipa: '[çi]', order: 2,
    pronunciationNote: lt(
      'Like "he", with a light, breathy h.',
      'Wie „hi“ mit leichtem, behauchtem h.',
      'Comme « hi », h léger et soufflé.',
    ),
    exampleWord: { word: 'ひと', romanization: 'hito', meaning: lt('person', 'Mensch', 'personne'), audio: { itemId: 'word-hi', text: 'ひと' } },
    audio: { itemId: 'symbol-hi', text: 'ひ' },
  },
  {
    id: 'fu', character: 'ふ', type: 'consonant', romanization: 'fu', ipa: '[ɸɯ]', order: 3,
    pronunciationNote: lt(
      'A soft f blown between the lips — never "hu".',
      'Ein weiches f, zwischen die Lippen gehaucht — nie „hu“.',
      'Un f doux soufflé entre les lèvres — jamais « hou ».',
    ),
    exampleWord: { word: 'ふね', romanization: 'fune', meaning: lt('ship, boat', 'Schiff', 'bateau'), audio: { itemId: 'word-fu', text: 'ふね' } },
    audio: { itemId: 'symbol-fu', text: 'ふ' },
  },
  {
    id: 'he', character: 'へ', type: 'consonant', romanization: 'he', ipa: '[he]', order: 4,
    pronunciationNote: lt(
      'Like "he" in "hen".',
      'Wie „he“ in „Hemd“.',
      'Comme « hè », h léger.',
    ),
    exampleWord: { word: 'へや', romanization: 'heya', meaning: lt('room', 'Zimmer', 'pièce'), audio: { itemId: 'word-he', text: 'へや' } },
    audio: { itemId: 'symbol-he', text: 'へ' },
  },
  {
    id: 'ho', character: 'ほ', type: 'consonant', romanization: 'ho', ipa: '[ho]', order: 5,
    pronunciationNote: lt(
      'Like "ho" in "home".',
      'Wie „ho“ in „Hose“.',
      'Comme « ho », h léger.',
    ),
    exampleWord: { word: 'ほし', romanization: 'hoshi', meaning: lt('star', 'Stern', 'étoile'), audio: { itemId: 'word-ho', text: 'ほし' } },
    audio: { itemId: 'symbol-ho', text: 'ほ' },
  },
  {
    id: 'ma', character: 'ま', type: 'consonant', romanization: 'ma', ipa: '[ma]', order: 6,
    pronunciationNote: lt(
      'Like "ma" in "mama".',
      'Wie „ma“ in „Mama“.',
      'Comme « ma » de « maman ».',
    ),
    exampleWord: { word: 'まち', romanization: 'machi', meaning: lt('town', 'Stadt', 'ville'), audio: { itemId: 'word-ma', text: 'まち' } },
    audio: { itemId: 'symbol-ma', text: 'ま' },
  },
  {
    id: 'mi', character: 'み', type: 'consonant', romanization: 'mi', ipa: '[mi]', order: 7,
    pronunciationNote: lt(
      'Like "me".',
      'Wie „mi“ in „Miete“.',
      'Comme « mi » de « mie ».',
    ),
    exampleWord: { word: 'みみ', romanization: 'mimi', meaning: lt('ear', 'Ohr', 'oreille'), audio: { itemId: 'word-mi', text: 'みみ' } },
    audio: { itemId: 'symbol-mi', text: 'み' },
  },
  {
    id: 'mu', character: 'む', type: 'consonant', romanization: 'mu', ipa: '[mɯ]', order: 8,
    pronunciationNote: lt(
      'Like "moo".',
      'Wie „mu“ in „Mut“.',
      'Comme « mou ».',
    ),
    exampleWord: { word: 'むし', romanization: 'mushi', meaning: lt('insect, bug', 'Insekt', 'insecte'), audio: { itemId: 'word-mu', text: 'むし' } },
    audio: { itemId: 'symbol-mu', text: 'む' },
  },
  {
    id: 'me', character: 'め', type: 'consonant', romanization: 'me', ipa: '[me]', order: 9,
    pronunciationNote: lt(
      'Like "me" in "met".',
      'Wie „me“ in „Messer“.',
      'Comme « mè » de « mère ».',
    ),
    exampleWord: { word: 'め', romanization: 'me', meaning: lt('eye', 'Auge', 'œil'), audio: { itemId: 'word-me', text: 'め' } },
    audio: { itemId: 'symbol-me', text: 'め' },
  },
  {
    id: 'mo', character: 'も', type: 'consonant', romanization: 'mo', ipa: '[mo]', order: 10,
    pronunciationNote: lt(
      'Like "mo" in "more".',
      'Wie „mo“ in „Monat“.',
      'Comme « mo » de « moto ».',
    ),
    exampleWord: { word: 'もり', romanization: 'mori', meaning: lt('forest', 'Wald', 'forêt'), audio: { itemId: 'word-mo', text: 'もり' } },
    audio: { itemId: 'symbol-mo', text: 'も' },
  },

  // ── Y, R, W rows and ん (や行・ら行・わ行・ん) ──
  {
    id: 'ya', character: 'や', type: 'consonant', romanization: 'ya', ipa: '[ja]', order: 1,
    pronunciationNote: lt(
      'Like "ya" in "yard".',
      'Wie „ja“.',
      'Comme « ya » de « yaourt ».',
    ),
    exampleWord: { word: 'やま', romanization: 'yama', meaning: lt('mountain', 'Berg', 'montagne'), audio: { itemId: 'word-ya', text: 'やま' } },
    audio: { itemId: 'symbol-ya', text: 'や' },
  },
  {
    id: 'yu', character: 'ゆ', type: 'consonant', romanization: 'yu', ipa: '[jɯ]', order: 2,
    pronunciationNote: lt(
      'Like "you".',
      'Wie „ju“ in „Juni“.',
      'Comme « you » en anglais.',
    ),
    exampleWord: { word: 'ゆき', romanization: 'yuki', meaning: lt('snow', 'Schnee', 'neige'), audio: { itemId: 'word-yu', text: 'ゆき' } },
    audio: { itemId: 'symbol-yu', text: 'ゆ' },
  },
  {
    id: 'yo', character: 'よ', type: 'consonant', romanization: 'yo', ipa: '[jo]', order: 3,
    pronunciationNote: lt(
      'Like "yo" in "yoga".',
      'Wie „jo“ in „Joga“.',
      'Comme « yo » de « yoga ».',
    ),
    exampleWord: { word: 'よる', romanization: 'yoru', meaning: lt('night', 'Nacht', 'nuit'), audio: { itemId: 'word-yo', text: 'よる' } },
    audio: { itemId: 'symbol-yo', text: 'よ' },
  },
  {
    id: 'ra', character: 'ら', type: 'consonant', romanization: 'ra', ipa: '[ɾa]', order: 4,
    pronunciationNote: lt(
      'A light r between r and l, the tongue tapping once — like the tt in American "butter".',
      'Ein leichtes r zwischen r und l, die Zunge tippt einmal an — wie das tt im amerikanischen „butter“.',
      'Un r léger entre r et l, la langue frappe une fois — comme le tt de l’anglais « butter ».',
    ),
    exampleWord: { word: 'さくら', romanization: 'sakura', meaning: lt('cherry blossom', 'Kirschblüte', 'fleur de cerisier'), audio: { itemId: 'word-ra', text: 'さくら' } },
    audio: { itemId: 'symbol-ra', text: 'ら' },
  },
  {
    id: 'ri', character: 'り', type: 'consonant', romanization: 'ri', ipa: '[ɾi]', order: 5,
    pronunciationNote: lt(
      'The tapped r plus "ee".',
      'Das getippte r plus „i“.',
      'Le r frappé plus « i ».',
    ),
    exampleWord: { word: 'りす', romanization: 'risu', meaning: lt('squirrel', 'Eichhörnchen', 'écureuil'), audio: { itemId: 'word-ri', text: 'りす' } },
    audio: { itemId: 'symbol-ri', text: 'り' },
  },
  {
    id: 'ru', character: 'る', type: 'consonant', romanization: 'ru', ipa: '[ɾɯ]', order: 6,
    pronunciationNote: lt(
      'The tapped r plus "oo".',
      'Das getippte r plus „u“.',
      'Le r frappé plus « ou ».',
    ),
    exampleWord: { word: 'るす', romanization: 'rusu', meaning: lt('being away from home', 'Abwesenheit', 'absence'), audio: { itemId: 'word-ru', text: 'るす' } },
    audio: { itemId: 'symbol-ru', text: 'る' },
  },
  {
    id: 're', character: 'れ', type: 'consonant', romanization: 're', ipa: '[ɾe]', order: 7,
    pronunciationNote: lt(
      'The tapped r plus "e" as in "red".',
      'Das getippte r plus „e“ wie in „Bett“.',
      'Le r frappé plus « è ».',
    ),
    exampleWord: { word: 'れきし', romanization: 'rekishi', meaning: lt('history', 'Geschichte', 'histoire'), audio: { itemId: 'word-re', text: 'れきし' } },
    audio: { itemId: 'symbol-re', text: 'れ' },
  },
  {
    id: 'ro', character: 'ろ', type: 'consonant', romanization: 'ro', ipa: '[ɾo]', order: 8,
    pronunciationNote: lt(
      'The tapped r plus "o".',
      'Das getippte r plus „o“.',
      'Le r frappé plus « o ».',
    ),
    exampleWord: { word: 'ろく', romanization: 'roku', meaning: lt('six', 'sechs', 'six'), audio: { itemId: 'word-ro', text: 'ろく' } },
    audio: { itemId: 'symbol-ro', text: 'ろ' },
  },
  {
    id: 'wa', character: 'わ', type: 'consonant', romanization: 'wa', ipa: '[wa]', order: 9,
    pronunciationNote: lt(
      'Like "wa" in "want".',
      'Wie das englische w in „water“ plus a.',
      'Comme « oua » de « ouate ».',
    ),
    exampleWord: { word: 'わたし', romanization: 'watashi', meaning: lt('I, me', 'ich', 'je, moi'), audio: { itemId: 'word-wa', text: 'わたし' } },
    audio: { itemId: 'symbol-wa', text: 'わ' },
  },
  {
    id: 'wo', character: 'を', type: 'consonant', romanization: 'wo', ipa: '[o]', order: 10, tags: ['homophone:o'],
    pronunciationNote: lt(
      'Sounds just like お (o); today it is only the object-marker particle.',
      'Klingt genau wie お (o); heute nur noch die Objekt-Partikel.',
      'Se prononce exactement comme お (o) ; aujourd’hui seulement la particule d’objet.',
    ),
    exampleWord: { word: 'ほんをよむ', romanization: 'hon o yomu', meaning: lt('to read a book', 'ein Buch lesen', 'lire un livre'), audio: { itemId: 'word-wo', text: 'ほんをよむ' } },
    audio: { itemId: 'symbol-wo', text: 'を' },
  },
  {
    id: 'n', character: 'ん', type: 'consonant', romanization: 'n', ipa: '[ɴ]', order: 11,
    pronunciationNote: lt(
      'A nasal n that forms its own beat, only ever at the end of a syllable.',
      'Ein nasales n, das einen eigenen Takt bildet und nur am Silbenende steht.',
      'Un n nasal qui forme son propre temps, uniquement en fin de syllabe.',
    ),
    exampleWord: { word: 'ほん', romanization: 'hon', meaning: lt('book', 'Buch', 'livre'), audio: { itemId: 'word-n', text: 'ほん' } },
    audio: { itemId: 'symbol-n', text: 'ん' },
  },
]

const VOWEL_IDS = ['a', 'i', 'u', 'e', 'o']
const K_S_IDS = ['ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so']
const T_N_IDS = ['ta', 'chi', 'tsu', 'te', 'to', 'na', 'ni', 'nu', 'ne', 'no']
const H_M_IDS = ['ha', 'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu', 'me', 'mo']
const Y_R_W_IDS = ['ya', 'yu', 'yo', 'ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n']

const japaneseHiragana: ScriptDefinition = {
  id: 'japanese-hiragana',
  language: 'Japanese',
  speechLang: 'ja-JP',
  kind: 'syllabary',
  nativeName: 'ひらがな',
  displayName: 'Hiragana',
  tagline: lt(
    'The core Japanese syllabary — 46 kana, one clean sound each, and the door into reading Japanese.',
    'Die grundlegende japanische Silbenschrift — 46 Kana, je ein klarer Laut, und der Einstieg ins Lesen des Japanischen.',
    'Le syllabaire japonais de base — 46 kana, un son net chacun, et la porte d’entrée vers la lecture du japonais.',
  ),
  intro: [
    lt(
      'Hiragana is a syllabary: each kana is one whole sound — a beat, or "mora". か is simply "ka", not "k" + "a". Learn the sound and the shape together and you can read any hiragana word out loud.',
      'Hiragana ist eine Silbenschrift: Jedes Kana ist ein ganzer Laut — ein Takt, eine „More“. か ist einfach „ka“, nicht „k“ + „a“. Lerne Laut und Form zusammen, und du kannst jedes Hiragana-Wort laut vorlesen.',
      'Le hiragana est un syllabaire : chaque kana est un son entier — un temps, une « more ». か se lit simplement « ka », pas « k » + « a ». Apprenez le son et la forme ensemble, et vous pourrez lire à voix haute n’importe quel mot en hiragana.',
    ),
    lt(
      'The 46 kana are laid out in the gojūon ("fifty sounds") grid: five pure vowels — a, i, u, e, o — then rows that add a consonant in front of those same vowels (k, s, t, n, h, m, y, r, w). Once you know the five vowels, every row is a variation on them.',
      'Die 46 Kana stehen im Gojūon-Raster („fünfzig Laute“): fünf reine Vokale — a, i, u, e, o — und dann Reihen, die denselben Vokalen einen Konsonanten voranstellen (k, s, t, n, h, m, y, r, w). Wenn du die fünf Vokale kennst, ist jede Reihe nur eine Abwandlung davon.',
      'Les 46 kana sont disposés dans la grille gojūon (« cinquante sons ») : cinq voyelles pures — a, i, u, e, o — puis des lignes qui ajoutent une consonne devant ces mêmes voyelles (k, s, t, n, h, m, y, r, w). Une fois les cinq voyelles connues, chaque ligne n’en est qu’une variation.',
    ),
    lt(
      'A few kana break the tidy pattern: し is "shi" (not "si"), ち is "chi", つ is "tsu", ふ is "fu". One kana, ん, is a nasal "n" that stands alone at the end of a syllable, and を survives only as the little word that marks the object of a verb.',
      'Ein paar Kana durchbrechen das saubere Muster: し ist „shi“ (nicht „si“), ち ist „chi“, つ ist „tsu“, ふ ist „fu“. Ein Kana, ん, ist ein nasales „n“, das am Silbenende allein steht, und を lebt nur noch als das kleine Wort weiter, das das Objekt eines Verbs markiert.',
      'Quelques kana brisent le schéma bien réglé : し se lit « shi » (pas « si »), ち « chi », つ « tsu », ふ « fu ». Un kana, ん, est un « n » nasal qui se tient seul en fin de syllabe, et を ne survit que comme le petit mot qui marque l’objet d’un verbe.',
    ),
  ],
  sections: [
    {
      id: 'vowels',
      title: lt('The five vowels', 'Die fünf Vokale', 'Les cinq voyelles'),
      description: lt(
        'Every kana is built on these five sounds — a, i, u, e, o. Master them first and the rest of the grid falls into place.',
        'Jedes Kana baut auf diesen fünf Lauten auf — a, i, u, e, o. Beherrsche sie zuerst, dann fügt sich der Rest des Rasters von selbst.',
        'Chaque kana repose sur ces cinq sons — a, i, u, e, o. Maîtrisez-les d’abord et le reste de la grille se met en place.',
      ),
      symbolIds: VOWEL_IDS,
    },
    {
      id: 'k-s-rows',
      title: lt('K and S rows', 'K- und S-Reihe', 'Lignes K et S'),
      description: lt(
        'The same five vowels with a k or s in front — plus し, which is "shi", not "si".',
        'Dieselben fünf Vokale mit einem k oder s davor — dazu し, das „shi“ heißt, nicht „si“.',
        'Les mêmes cinq voyelles précédées d’un k ou d’un s — plus し, qui se lit « shi », pas « si ».',
      ),
      symbolIds: K_S_IDS,
    },
    {
      id: 't-n-rows',
      title: lt('T and N rows', 'T- und N-Reihe', 'Lignes T et N'),
      description: lt(
        'Watch the three odd ones out: ち is "chi", つ is "tsu", and the rest of the t-row is regular.',
        'Achte auf die drei Ausreißer: ち ist „chi“, つ ist „tsu“; der Rest der T-Reihe ist regelmäßig.',
        'Attention aux trois exceptions : ち se lit « chi », つ « tsu » ; le reste de la ligne T est régulier.',
      ),
      symbolIds: T_N_IDS,
    },
    {
      id: 'h-m-rows',
      title: lt('H and M rows', 'H- und M-Reihe', 'Lignes H et M'),
      description: lt(
        'Regular except ふ, which is a soft "fu" blown between the lips, not "hu".',
        'Regelmäßig bis auf ふ, ein weiches „fu“, zwischen die Lippen gehaucht, nicht „hu“.',
        'Régulières sauf ふ, un « fu » doux soufflé entre les lèvres, pas « hu ».',
      ),
      symbolIds: H_M_IDS,
    },
    {
      id: 'y-r-w-rows',
      title: lt('Y, R, W rows and ん', 'Y-, R-, W-Reihe und ん', 'Lignes Y, R, W et ん'),
      description: lt(
        'The last stretch: the y-glides, the tapped r-row, わ, the object particle を, and the lone nasal ん.',
        'Der letzte Abschnitt: die j-Gleitlaute, die getippte R-Reihe, わ, die Objekt-Partikel を und das einzelne nasale ん.',
        'La dernière étape : les semi-voyelles en y, la ligne R frappée, わ, la particule d’objet を et le n nasal isolé ん.',
      ),
      symbolIds: Y_R_W_IDS,
    },
  ],
  symbols,
}

export default japaneseHiragana
