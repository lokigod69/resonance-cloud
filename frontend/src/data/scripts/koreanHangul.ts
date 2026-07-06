// Korean Hangul — Script Lab inventory.
//
// Content notes:
// - Romanization is Revised Romanization of Korean (the official system).
// - Pronunciation notes are learner hints, not phonology lessons.
// - Audio `text` is what a TTS engine should say: letter names (기역) for
//   consonants, the vowel syllable (아) for vowels, the example syllable for
//   batchim. Bare jamo characters are never sent to TTS — engines misread them.
// - Validated by scripts/test-script-lab-data.ts (`npm run test:script-lab`),
//   which also cross-checks every exampleSyllable against the Unicode
//   composition math in lib/scriptlab/hangul.ts.

import type { LocalizedText, ScriptDefinition, ScriptSymbol } from '@/lib/scriptlab/types'
import { composeHangul } from '@/lib/scriptlab/hangul'

function lt(en: string, de: string, fr: string): LocalizedText {
  return { en, de, fr }
}

const FINAL_JAMO: Record<string, string> = {
  'final-k': 'ㄱ',
  'final-n': 'ㄴ',
  'final-t': 'ㄷ',
  'final-l': 'ㄹ',
  'final-m': 'ㅁ',
  'final-p': 'ㅂ',
  'final-ng': 'ㅇ',
}

const symbols: ScriptSymbol[] = [
  // ── Basic consonants (자음) ──
  {
    id: 'g', character: 'ㄱ', type: 'consonant', name: '기역', romanization: 'g/k', ipa: '[k]~[g]', order: 1,
    pronunciationNote: lt(
      'Between g and k — soft like g at the start of a word.',
      'Zwischen g und k — am Wortanfang weich wie g.',
      'Entre g et k — doux comme g en début de mot.',
    ),
    exampleSyllable: '가', exampleSyllableRomanization: 'ga',
    exampleSyllableAudio: { itemId: 'syllable-g', text: '가' },
    exampleWord: { word: '가방', romanization: 'gabang', meaning: lt('bag', 'Tasche', 'sac'), audio: { itemId: 'word-g', text: '가방' } },
    audio: { itemId: 'symbol-g', text: '기역' },
  },
  {
    id: 'n', character: 'ㄴ', type: 'consonant', name: '니은', romanization: 'n', ipa: '[n]', order: 2,
    pronunciationNote: lt(
      'Like n in "now".',
      'Wie das n in „nein“.',
      'Comme le n de « nuit ».',
    ),
    exampleSyllable: '나', exampleSyllableRomanization: 'na',
    exampleSyllableAudio: { itemId: 'syllable-n', text: '나' },
    exampleWord: { word: '나무', romanization: 'namu', meaning: lt('tree', 'Baum', 'arbre'), audio: { itemId: 'word-n', text: '나무' } },
    audio: { itemId: 'symbol-n', text: '니은' },
  },
  {
    id: 'd', character: 'ㄷ', type: 'consonant', name: '디귿', romanization: 'd/t', ipa: '[t]~[d]', order: 3,
    pronunciationNote: lt(
      'Between d and t — soft like d at the start of a word.',
      'Zwischen d und t — am Wortanfang weich wie d.',
      'Entre d et t — doux comme d en début de mot.',
    ),
    exampleSyllable: '다', exampleSyllableRomanization: 'da',
    exampleSyllableAudio: { itemId: 'syllable-d', text: '다' },
    exampleWord: { word: '다리', romanization: 'dari', meaning: lt('leg', 'Bein', 'jambe'), audio: { itemId: 'word-d', text: '다리' } },
    audio: { itemId: 'symbol-d', text: '디귿' },
  },
  {
    id: 'r', character: 'ㄹ', type: 'consonant', name: '리을', romanization: 'r/l', ipa: '[ɾ]~[l]', order: 4,
    pronunciationNote: lt(
      'Between r and l — the tongue taps once just behind the teeth.',
      'Zwischen r und l — die Zunge tippt kurz hinter die Zähne.',
      'Entre r et l — la langue tape une fois derrière les dents.',
    ),
    exampleSyllable: '라', exampleSyllableRomanization: 'ra',
    exampleSyllableAudio: { itemId: 'syllable-r', text: '라' },
    exampleWord: { word: '라면', romanization: 'ramyeon', meaning: lt('ramen noodles', 'Ramen-Nudeln', 'nouilles ramen'), audio: { itemId: 'word-r', text: '라면' } },
    audio: { itemId: 'symbol-r', text: '리을' },
  },
  {
    id: 'm', character: 'ㅁ', type: 'consonant', name: '미음', romanization: 'm', ipa: '[m]', order: 5,
    pronunciationNote: lt(
      'Like m in "moon".',
      'Wie das m in „Mond“.',
      'Comme le m de « mer ».',
    ),
    exampleSyllable: '마', exampleSyllableRomanization: 'ma',
    exampleSyllableAudio: { itemId: 'syllable-m', text: '마' },
    exampleWord: { word: '마음', romanization: 'maeum', meaning: lt('heart, mind', 'Herz, Gemüt', 'cœur, esprit'), audio: { itemId: 'word-m', text: '마음' } },
    audio: { itemId: 'symbol-m', text: '미음' },
  },
  {
    id: 'b', character: 'ㅂ', type: 'consonant', name: '비읍', romanization: 'b/p', ipa: '[p]~[b]', order: 6,
    pronunciationNote: lt(
      'Between b and p — soft like b at the start of a word.',
      'Zwischen b und p — am Wortanfang weich wie b.',
      'Entre b et p — doux comme b en début de mot.',
    ),
    exampleSyllable: '바', exampleSyllableRomanization: 'ba',
    exampleSyllableAudio: { itemId: 'syllable-b', text: '바' },
    exampleWord: { word: '바다', romanization: 'bada', meaning: lt('sea', 'Meer', 'mer'), audio: { itemId: 'word-b', text: '바다' } },
    audio: { itemId: 'symbol-b', text: '비읍' },
  },
  {
    id: 's', character: 'ㅅ', type: 'consonant', name: '시옷', romanization: 's', ipa: '[s]', order: 7,
    pronunciationNote: lt(
      'Like s in "sun"; before i it slides toward "sh".',
      'Wie das s in „Sonne“ (stimmlos); vor i klingt es fast wie „sch“.',
      'Comme le s de « soleil » ; devant i, il glisse vers « ch ».',
    ),
    exampleSyllable: '사', exampleSyllableRomanization: 'sa',
    exampleSyllableAudio: { itemId: 'syllable-s', text: '사' },
    exampleWord: { word: '사과', romanization: 'sagwa', meaning: lt('apple', 'Apfel', 'pomme'), audio: { itemId: 'word-s', text: '사과' } },
    audio: { itemId: 'symbol-s', text: '시옷' },
  },
  {
    id: 'ng', character: 'ㅇ', type: 'consonant', name: '이응', romanization: '– / ng', ipa: '[ŋ]', order: 8,
    pronunciationNote: lt(
      'Silent before a vowel — just a placeholder; "ng" as in "song" at the end of a syllable.',
      'Vor einem Vokal stumm — nur Platzhalter; am Silbenende „ng“ wie in „singen“.',
      'Muet devant une voyelle — simple support ; « ng » comme dans « parking » en fin de syllabe.',
    ),
    exampleSyllable: '아', exampleSyllableRomanization: 'a',
    exampleSyllableAudio: { itemId: 'syllable-ng', text: '아' },
    exampleWord: { word: '아이', romanization: 'ai', meaning: lt('child', 'Kind', 'enfant'), audio: { itemId: 'word-ng', text: '아이' } },
    audio: { itemId: 'symbol-ng', text: '이응' },
  },
  {
    id: 'j', character: 'ㅈ', type: 'consonant', name: '지읒', romanization: 'j', ipa: '[tɕ]', order: 9,
    pronunciationNote: lt(
      'Like j in "juice", but lighter.',
      'Wie das dsch in „Dschungel“, aber leichter.',
      'Comme le dj de « Djibouti », en plus léger.',
    ),
    exampleSyllable: '자', exampleSyllableRomanization: 'ja',
    exampleSyllableAudio: { itemId: 'syllable-j', text: '자' },
    exampleWord: { word: '자다', romanization: 'jada', meaning: lt('to sleep', 'schlafen', 'dormir'), audio: { itemId: 'word-j', text: '자다' } },
    audio: { itemId: 'symbol-j', text: '지읒' },
  },
  {
    id: 'ch', character: 'ㅊ', type: 'consonant', name: '치읓', romanization: 'ch', ipa: '[tɕʰ]', order: 10,
    pronunciationNote: lt(
      'Like ch in "cheese", with an extra puff of air.',
      'Wie das tsch in „Tschüss“, mit einem extra Lufthauch.',
      'Comme le tch de « tchin », avec un souffle d’air en plus.',
    ),
    exampleSyllable: '차', exampleSyllableRomanization: 'cha',
    exampleSyllableAudio: { itemId: 'syllable-ch', text: '차' },
    exampleWord: { word: '차', romanization: 'cha', meaning: lt('tea', 'Tee', 'thé'), audio: { itemId: 'word-ch', text: '차' } },
    audio: { itemId: 'symbol-ch', text: '치읓' },
  },
  {
    id: 'k', character: 'ㅋ', type: 'consonant', name: '키읔', romanization: 'k', ipa: '[kʰ]', order: 11,
    pronunciationNote: lt(
      'A strong k with a clear puff of air.',
      'Ein kräftiges k mit deutlichem Lufthauch.',
      'Un k fort, avec un net souffle d’air.',
    ),
    exampleSyllable: '카', exampleSyllableRomanization: 'ka',
    exampleSyllableAudio: { itemId: 'syllable-k', text: '카' },
    exampleWord: { word: '커피', romanization: 'keopi', meaning: lt('coffee', 'Kaffee', 'café'), audio: { itemId: 'word-k', text: '커피' } },
    audio: { itemId: 'symbol-k', text: '키읔' },
  },
  {
    id: 't', character: 'ㅌ', type: 'consonant', name: '티읕', romanization: 't', ipa: '[tʰ]', order: 12,
    pronunciationNote: lt(
      'A strong t with a clear puff of air.',
      'Ein kräftiges t mit deutlichem Lufthauch.',
      'Un t fort, avec un net souffle d’air.',
    ),
    exampleSyllable: '타', exampleSyllableRomanization: 'ta',
    exampleSyllableAudio: { itemId: 'syllable-t', text: '타' },
    exampleWord: { word: '토끼', romanization: 'tokki', meaning: lt('rabbit', 'Hase', 'lapin'), audio: { itemId: 'word-t', text: '토끼' } },
    audio: { itemId: 'symbol-t', text: '티읕' },
  },
  {
    id: 'p', character: 'ㅍ', type: 'consonant', name: '피읖', romanization: 'p', ipa: '[pʰ]', order: 13,
    pronunciationNote: lt(
      'A strong p with a clear puff of air.',
      'Ein kräftiges p mit deutlichem Lufthauch.',
      'Un p fort, avec un net souffle d’air.',
    ),
    exampleSyllable: '파', exampleSyllableRomanization: 'pa',
    exampleSyllableAudio: { itemId: 'syllable-p', text: '파' },
    exampleWord: { word: '파도', romanization: 'pado', meaning: lt('wave', 'Welle', 'vague'), audio: { itemId: 'word-p', text: '파도' } },
    audio: { itemId: 'symbol-p', text: '피읖' },
  },
  {
    id: 'h', character: 'ㅎ', type: 'consonant', name: '히읗', romanization: 'h', ipa: '[h]', order: 14,
    pronunciationNote: lt(
      'Like h in "hat".',
      'Wie das h in „Haus“.',
      'Un h aspiré, comme dans « hop ».',
    ),
    exampleSyllable: '하', exampleSyllableRomanization: 'ha',
    exampleSyllableAudio: { itemId: 'syllable-h', text: '하' },
    exampleWord: { word: '하늘', romanization: 'haneul', meaning: lt('sky', 'Himmel', 'ciel'), audio: { itemId: 'word-h', text: '하늘' } },
    audio: { itemId: 'symbol-h', text: '히읗' },
  },

  // ── Basic vowels (모음) — spoken with the silent placeholder ㅇ ──
  {
    id: 'a', character: 'ㅏ', type: 'vowel', romanization: 'a', ipa: '[a]', order: 1,
    pronunciationNote: lt(
      'Like a in "father".',
      'Wie das a in „Vater“.',
      'Comme le a de « papa ».',
    ),
    exampleSyllable: '아', exampleSyllableRomanization: 'a',
    exampleSyllableAudio: { itemId: 'syllable-a', text: '아' },
    exampleWord: { word: '아침', romanization: 'achim', meaning: lt('morning', 'Morgen', 'matin'), audio: { itemId: 'word-a', text: '아침' } },
    audio: { itemId: 'symbol-a', text: '아' },
  },
  {
    id: 'ya', character: 'ㅑ', type: 'vowel', romanization: 'ya', ipa: '[ja]', order: 2,
    pronunciationNote: lt(
      'Like ya in "yard".',
      'Wie „ja“.',
      'Comme « ya » dans « yaourt ».',
    ),
    exampleSyllable: '야', exampleSyllableRomanization: 'ya',
    exampleSyllableAudio: { itemId: 'syllable-ya', text: '야' },
    exampleWord: { word: '야구', romanization: 'yagu', meaning: lt('baseball', 'Baseball', 'base-ball'), audio: { itemId: 'word-ya', text: '야구' } },
    audio: { itemId: 'symbol-ya', text: '야' },
  },
  {
    id: 'eo', character: 'ㅓ', type: 'vowel', romanization: 'eo', ipa: '[ʌ]', order: 3,
    pronunciationNote: lt(
      'An open "uh", like the u in "up" — lips relaxed, not rounded.',
      'Ein offenes „o/a“ wie das u in „up“ — Lippen entspannt, nicht gerundet.',
      'Un « o » très ouvert, proche du « eu » de « peur » — lèvres non arrondies.',
    ),
    exampleSyllable: '어', exampleSyllableRomanization: 'eo',
    exampleSyllableAudio: { itemId: 'syllable-eo', text: '어' },
    exampleWord: { word: '어머니', romanization: 'eomeoni', meaning: lt('mother', 'Mutter', 'mère'), audio: { itemId: 'word-eo', text: '어머니' } },
    audio: { itemId: 'symbol-eo', text: '어' },
  },
  {
    id: 'yeo', character: 'ㅕ', type: 'vowel', romanization: 'yeo', ipa: '[jʌ]', order: 4,
    pronunciationNote: lt(
      'y + eo: "yuh".',
      'j + ㅓ: „jo/ja“-artig, ungerundet.',
      'y + ㅓ : « yeu ».',
    ),
    exampleSyllable: '여', exampleSyllableRomanization: 'yeo',
    exampleSyllableAudio: { itemId: 'syllable-yeo', text: '여' },
    exampleWord: { word: '여름', romanization: 'yeoreum', meaning: lt('summer', 'Sommer', 'été'), audio: { itemId: 'word-yeo', text: '여름' } },
    audio: { itemId: 'symbol-yeo', text: '여' },
  },
  {
    id: 'o', character: 'ㅗ', type: 'vowel', romanization: 'o', ipa: '[o]', order: 5,
    pronunciationNote: lt(
      'A pure o as in "go", without the glide at the end.',
      'Ein reines o wie in „Ofen“.',
      'Un o pur, comme dans « eau ».',
    ),
    exampleSyllable: '오', exampleSyllableRomanization: 'o',
    exampleSyllableAudio: { itemId: 'syllable-o', text: '오' },
    exampleWord: { word: '오늘', romanization: 'oneul', meaning: lt('today', 'heute', 'aujourd’hui'), audio: { itemId: 'word-o', text: '오늘' } },
    audio: { itemId: 'symbol-o', text: '오' },
  },
  {
    id: 'yo', character: 'ㅛ', type: 'vowel', romanization: 'yo', ipa: '[jo]', order: 6,
    pronunciationNote: lt(
      'y + o: "yo".',
      'j + o: „jo“.',
      'y + o : « yo ».',
    ),
    exampleSyllable: '요', exampleSyllableRomanization: 'yo',
    exampleSyllableAudio: { itemId: 'syllable-yo', text: '요' },
    exampleWord: { word: '요리', romanization: 'yori', meaning: lt('cooking', 'Kochen', 'cuisine'), audio: { itemId: 'word-yo', text: '요리' } },
    audio: { itemId: 'symbol-yo', text: '요' },
  },
  {
    id: 'u', character: 'ㅜ', type: 'vowel', romanization: 'u', ipa: '[u]', order: 7,
    pronunciationNote: lt(
      'Like oo in "moon".',
      'Wie das u in „Mut“.',
      'Comme le ou de « loup ».',
    ),
    exampleSyllable: '우', exampleSyllableRomanization: 'u',
    exampleSyllableAudio: { itemId: 'syllable-u', text: '우' },
    exampleWord: { word: '우유', romanization: 'uyu', meaning: lt('milk', 'Milch', 'lait'), audio: { itemId: 'word-u', text: '우유' } },
    audio: { itemId: 'symbol-u', text: '우' },
  },
  {
    id: 'yu', character: 'ㅠ', type: 'vowel', romanization: 'yu', ipa: '[ju]', order: 8,
    pronunciationNote: lt(
      'y + u: "yoo".',
      'j + u: „ju“.',
      'y + ou : « you ».',
    ),
    exampleSyllable: '유', exampleSyllableRomanization: 'yu',
    exampleSyllableAudio: { itemId: 'syllable-yu', text: '유' },
    exampleWord: { word: '유리', romanization: 'yuri', meaning: lt('glass', 'Glas', 'verre'), audio: { itemId: 'word-yu', text: '유리' } },
    audio: { itemId: 'symbol-yu', text: '유' },
  },
  {
    id: 'eu', character: 'ㅡ', type: 'vowel', romanization: 'eu', ipa: '[ɯ]', order: 9,
    pronunciationNote: lt(
      'Say "oo" while smiling — lips flat, sound from the throat.',
      '„u“ mit breitem Mund sprechen — Lippen flach, kein Runden.',
      'Dites « ou » en souriant — lèvres étirées, non arrondies.',
    ),
    exampleSyllable: '으', exampleSyllableRomanization: 'eu',
    exampleSyllableAudio: { itemId: 'syllable-eu', text: '으' },
    exampleWord: { word: '음악', romanization: 'eumak', meaning: lt('music', 'Musik', 'musique'), audio: { itemId: 'word-eu', text: '음악' } },
    audio: { itemId: 'symbol-eu', text: '으' },
  },
  {
    id: 'i', character: 'ㅣ', type: 'vowel', romanization: 'i', ipa: '[i]', order: 10,
    pronunciationNote: lt(
      'Like ee in "see".',
      'Wie das i in „Igel“.',
      'Comme le i de « lit ».',
    ),
    exampleSyllable: '이', exampleSyllableRomanization: 'i',
    exampleSyllableAudio: { itemId: 'syllable-i', text: '이' },
    exampleWord: { word: '이름', romanization: 'ireum', meaning: lt('name', 'Name', 'nom'), audio: { itemId: 'word-i', text: '이름' } },
    audio: { itemId: 'symbol-i', text: '이' },
  },

  // ── Batchim — final consonants (받침) ──
  {
    id: 'final-k', character: 'ㄱ', type: 'final-consonant', name: '기역 받침', romanization: 'k', ipa: '[k̚]', order: 1,
    pronunciationNote: lt(
      'A k that stops without release — like catching "book" in your throat.',
      'Ein k ohne Lösung — wie ein abgebrochenes „k“ am Ende von „Blick“.',
      'Un k retenu, sans relâchement — comme un « k » final coupé net.',
    ),
    exampleSyllable: '악', exampleSyllableRomanization: 'ak',
    exampleSyllableAudio: { itemId: 'syllable-final-k', text: '악' },
    exampleWord: { word: '책', romanization: 'chaek', meaning: lt('book', 'Buch', 'livre'), audio: { itemId: 'word-final-k', text: '책' } },
    audio: { itemId: 'symbol-final-k', text: '악' },
  },
  {
    id: 'final-n', character: 'ㄴ', type: 'final-consonant', name: '니은 받침', romanization: 'n', ipa: '[n]', order: 2,
    pronunciationNote: lt(
      'A clean n at the end of the syllable, like "sun".',
      'Ein klares n am Silbenende, wie in „Bahn“.',
      'Un n net en fin de syllabe, comme dans « bonne ».',
    ),
    exampleSyllable: '안', exampleSyllableRomanization: 'an',
    exampleSyllableAudio: { itemId: 'syllable-final-n', text: '안' },
    exampleWord: { word: '눈', romanization: 'nun', meaning: lt('snow (also: eye)', 'Schnee (auch: Auge)', 'neige (aussi : œil)'), audio: { itemId: 'word-final-n', text: '눈' } },
    audio: { itemId: 'symbol-final-n', text: '안' },
  },
  {
    id: 'final-t', character: 'ㄷ', type: 'final-consonant', name: '디귿 받침', romanization: 't', ipa: '[t̚]', order: 3,
    pronunciationNote: lt(
      'A t that stops without release; ㅅ, ㅈ, ㅊ, ㅌ and ㅎ all sound like this as finals.',
      'Ein t ohne Lösung; auch ㅅ, ㅈ, ㅊ, ㅌ und ㅎ klingen am Silbenende so.',
      'Un t retenu, sans relâchement ; ㅅ, ㅈ, ㅊ, ㅌ et ㅎ se prononcent ainsi en finale.',
    ),
    // 앋 is not a standalone word, but like 악/안/알 it keeps the silent-ㅇ initial:
    // a consonant-initial syllable (곧) leaks another symbol's sound into quiz
    // prompts and makes listen questions ambiguous (ㄱ and ㄷ both audible).
    exampleSyllable: '앋', exampleSyllableRomanization: 'at',
    exampleSyllableAudio: { itemId: 'syllable-final-t', text: '앋' },
    exampleWord: { word: '곧', romanization: 'got', meaning: lt('soon', 'bald', 'bientôt'), audio: { itemId: 'word-final-t', text: '곧' } },
    audio: { itemId: 'symbol-final-t', text: '앋' },
  },
  {
    id: 'final-l', character: 'ㄹ', type: 'final-consonant', name: '리을 받침', romanization: 'l', ipa: '[ɭ]', order: 4,
    pronunciationNote: lt(
      'A soft l with the tongue curled back slightly, like "call".',
      'Ein weiches l, Zungenspitze leicht zurückgebogen, wie in „hell“.',
      'Un l doux, langue légèrement recourbée, comme dans « bal ».',
    ),
    exampleSyllable: '알', exampleSyllableRomanization: 'al',
    exampleSyllableAudio: { itemId: 'syllable-final-l', text: '알' },
    exampleWord: { word: '물', romanization: 'mul', meaning: lt('water', 'Wasser', 'eau'), audio: { itemId: 'word-final-l', text: '물' } },
    audio: { itemId: 'symbol-final-l', text: '알' },
  },
  {
    id: 'final-m', character: 'ㅁ', type: 'final-consonant', name: '미음 받침', romanization: 'm', ipa: '[m]', order: 5,
    pronunciationNote: lt(
      'A closed m at the end, like "him".',
      'Ein geschlossenes m am Ende, wie in „Lärm“.',
      'Un m fermé en finale, comme dans « pomme ».',
    ),
    exampleSyllable: '암', exampleSyllableRomanization: 'am',
    exampleSyllableAudio: { itemId: 'syllable-final-m', text: '암' },
    exampleWord: { word: '밤', romanization: 'bam', meaning: lt('night', 'Nacht', 'nuit'), audio: { itemId: 'word-final-m', text: '밤' } },
    audio: { itemId: 'symbol-final-m', text: '암' },
  },
  {
    id: 'final-p', character: 'ㅂ', type: 'final-consonant', name: '비읍 받침', romanization: 'p', ipa: '[p̚]', order: 6,
    pronunciationNote: lt(
      'A p that closes the lips without release, like stopping "cup" early.',
      'Ein p, das die Lippen schließt, ohne zu öffnen — wie ein abgebrochenes „p“.',
      'Un p qui ferme les lèvres sans les rouvrir — un « p » coupé net.',
    ),
    exampleSyllable: '압', exampleSyllableRomanization: 'ap',
    exampleSyllableAudio: { itemId: 'syllable-final-p', text: '압' },
    exampleWord: { word: '밥', romanization: 'bap', meaning: lt('cooked rice, meal', 'gekochter Reis, Mahlzeit', 'riz cuit, repas'), audio: { itemId: 'word-final-p', text: '밥' } },
    audio: { itemId: 'symbol-final-p', text: '압' },
  },
  {
    id: 'final-ng', character: 'ㅇ', type: 'final-consonant', name: '이응 받침', romanization: 'ng', ipa: '[ŋ]', order: 7,
    pronunciationNote: lt(
      'ng as in "song" — the same ㅇ that is silent at the start.',
      '„ng“ wie in „singen“ — dasselbe ㅇ, das am Anfang stumm ist.',
      '« ng » comme dans « parking » — le même ㅇ, muet en début de syllabe.',
    ),
    exampleSyllable: '앙', exampleSyllableRomanization: 'ang',
    exampleSyllableAudio: { itemId: 'syllable-final-ng', text: '앙' },
    exampleWord: { word: '강', romanization: 'gang', meaning: lt('river', 'Fluss', 'fleuve'), audio: { itemId: 'word-final-ng', text: '강' } },
    audio: { itemId: 'symbol-final-ng', text: '앙' },
  },

  // ── Double (tense) consonants — 쌍자음 ──
  {
    id: 'kk', character: 'ㄲ', type: 'double-consonant', name: '쌍기역', romanization: 'kk', ipa: '[k͈]', order: 1,
    pronunciationNote: lt(
      'A tense k — no puff of air, throat tightened.',
      'Ein gespanntes k — kein Lufthauch, Kehle angespannt.',
      'Un k tendu — aucun souffle d’air, gorge serrée.',
    ),
    exampleSyllable: '까', exampleSyllableRomanization: 'kka',
    exampleSyllableAudio: { itemId: 'syllable-kk', text: '까' },
    exampleWord: { word: '꼬리', romanization: 'kkori', meaning: lt('tail', 'Schwanz', 'queue'), audio: { itemId: 'word-kk', text: '꼬리' } },
    audio: { itemId: 'symbol-kk', text: '쌍기역' },
  },
  {
    id: 'tt', character: 'ㄸ', type: 'double-consonant', name: '쌍디귿', romanization: 'tt', ipa: '[t͈]', order: 2,
    pronunciationNote: lt(
      'A tense t — no puff of air, throat tightened.',
      'Ein gespanntes t — kein Lufthauch, Kehle angespannt.',
      'Un t tendu — aucun souffle d’air, gorge serrée.',
    ),
    exampleSyllable: '따', exampleSyllableRomanization: 'tta',
    exampleSyllableAudio: { itemId: 'syllable-tt', text: '따' },
    exampleWord: { word: '딸기', romanization: 'ttalgi', meaning: lt('strawberry', 'Erdbeere', 'fraise'), audio: { itemId: 'word-tt', text: '딸기' } },
    audio: { itemId: 'symbol-tt', text: '쌍디귿' },
  },
  {
    id: 'pp', character: 'ㅃ', type: 'double-consonant', name: '쌍비읍', romanization: 'pp', ipa: '[p͈]', order: 3,
    pronunciationNote: lt(
      'A tense p — no puff of air, throat tightened.',
      'Ein gespanntes p — kein Lufthauch, Kehle angespannt.',
      'Un p tendu — aucun souffle d’air, gorge serrée.',
    ),
    exampleSyllable: '빠', exampleSyllableRomanization: 'ppa',
    exampleSyllableAudio: { itemId: 'syllable-pp', text: '빠' },
    exampleWord: { word: '빵', romanization: 'ppang', meaning: lt('bread', 'Brot', 'pain'), audio: { itemId: 'word-pp', text: '빵' } },
    audio: { itemId: 'symbol-pp', text: '쌍비읍' },
  },
  {
    id: 'ss', character: 'ㅆ', type: 'double-consonant', name: '쌍시옷', romanization: 'ss', ipa: '[s͈]', order: 4,
    pronunciationNote: lt(
      'A tense, hissing s — sharper than ㅅ.',
      'Ein gespanntes, scharfes s — schärfer als ㅅ.',
      'Un s tendu et sifflant — plus net que ㅅ.',
    ),
    exampleSyllable: '싸', exampleSyllableRomanization: 'ssa',
    exampleSyllableAudio: { itemId: 'syllable-ss', text: '싸' },
    exampleWord: { word: '쌀', romanization: 'ssal', meaning: lt('rice (uncooked)', 'Reis (ungekocht)', 'riz (non cuit)'), audio: { itemId: 'word-ss', text: '쌀' } },
    audio: { itemId: 'symbol-ss', text: '쌍시옷' },
  },
  {
    id: 'jj', character: 'ㅉ', type: 'double-consonant', name: '쌍지읒', romanization: 'jj', ipa: '[tɕ͈]', order: 5,
    pronunciationNote: lt(
      'A tense j — no puff of air, throat tightened.',
      'Ein gespanntes dsch — kein Lufthauch, Kehle angespannt.',
      'Un dj tendu — aucun souffle d’air, gorge serrée.',
    ),
    exampleSyllable: '짜', exampleSyllableRomanization: 'jja',
    exampleSyllableAudio: { itemId: 'syllable-jj', text: '짜' },
    exampleWord: { word: '짜다', romanization: 'jjada', meaning: lt('to be salty', 'salzig sein', 'être salé'), audio: { itemId: 'word-jj', text: '짜다' } },
    audio: { itemId: 'symbol-jj', text: '쌍지읒' },
  },

  // ── Compound vowels — 복합 모음 ──
  {
    id: 'ae', character: 'ㅐ', type: 'compound-vowel', romanization: 'ae', ipa: '[e̞]', order: 1, tags: ['homophone:e'],
    pronunciationNote: lt(
      'Like e in "bed". In modern Korean it sounds the same as ㅔ.',
      'Wie das ä in „Bär“. Klingt im modernen Koreanisch genau wie ㅔ.',
      'Comme le è de « père ». En coréen moderne, identique à ㅔ.',
    ),
    exampleSyllable: '애', exampleSyllableRomanization: 'ae',
    exampleSyllableAudio: { itemId: 'syllable-ae', text: '애' },
    exampleWord: { word: '개', romanization: 'gae', meaning: lt('dog', 'Hund', 'chien'), audio: { itemId: 'word-ae', text: '개' } },
    audio: { itemId: 'symbol-ae', text: '애' },
  },
  {
    id: 'yae', character: 'ㅒ', type: 'compound-vowel', romanization: 'yae', ipa: '[je̞]', order: 2, tags: ['homophone:ye'],
    pronunciationNote: lt(
      'y + ae: "ye". Rare — mostly in 얘 (this kid).',
      'j + ä: „jä“. Selten — vor allem in 얘.',
      'y + è : « yè ». Rare — surtout dans 얘.',
    ),
    exampleSyllable: '얘', exampleSyllableRomanization: 'yae',
    exampleSyllableAudio: { itemId: 'syllable-yae', text: '얘' },
    exampleWord: { word: '얘기', romanization: 'yaegi', meaning: lt('story, chat', 'Geschichte, Gespräch', 'histoire, discussion'), audio: { itemId: 'word-yae', text: '얘기' } },
    audio: { itemId: 'symbol-yae', text: '얘' },
  },
  {
    id: 'e', character: 'ㅔ', type: 'compound-vowel', romanization: 'e', ipa: '[e̞]', order: 3, tags: ['homophone:e'],
    pronunciationNote: lt(
      'Like e in "bed" — same sound as ㅐ in modern Korean.',
      'Wie das e in „Bett“ — klingt heute genau wie ㅐ.',
      'Comme le é/è de « été » — identique à ㅐ aujourd’hui.',
    ),
    exampleSyllable: '에', exampleSyllableRomanization: 'e',
    exampleSyllableAudio: { itemId: 'syllable-e', text: '에' },
    exampleWord: { word: '게', romanization: 'ge', meaning: lt('crab', 'Krabbe', 'crabe'), audio: { itemId: 'word-e', text: '게' } },
    audio: { itemId: 'symbol-e', text: '에' },
  },
  {
    id: 'ye', character: 'ㅖ', type: 'compound-vowel', romanization: 'ye', ipa: '[je̞]', order: 4, tags: ['homophone:ye'],
    pronunciationNote: lt(
      'y + e: "ye" as in "yes".',
      'j + e: „je“.',
      'y + é : « yé ».',
    ),
    exampleSyllable: '예', exampleSyllableRomanization: 'ye',
    exampleSyllableAudio: { itemId: 'syllable-ye', text: '예' },
    exampleWord: { word: '예', romanization: 'ye', meaning: lt('yes (polite)', 'ja (höflich)', 'oui (poli)'), audio: { itemId: 'word-ye', text: '예' } },
    audio: { itemId: 'symbol-ye', text: '예' },
  },
  {
    id: 'wa', character: 'ㅘ', type: 'compound-vowel', romanization: 'wa', ipa: '[wa]', order: 5,
    pronunciationNote: lt(
      'ㅗ + ㅏ: "wa" as in "water".',
      'ㅗ + ㅏ: „wa“ wie in „Wasser“ (mit w-Gleitlaut).',
      'ㅗ + ㅏ : « oua », comme dans « ouate ».',
    ),
    exampleSyllable: '와', exampleSyllableRomanization: 'wa',
    exampleSyllableAudio: { itemId: 'syllable-wa', text: '와' },
    exampleWord: { word: '과일', romanization: 'gwail', meaning: lt('fruit', 'Obst', 'fruit'), audio: { itemId: 'word-wa', text: '과일' } },
    audio: { itemId: 'symbol-wa', text: '와' },
  },
  {
    id: 'wae', character: 'ㅙ', type: 'compound-vowel', romanization: 'wae', ipa: '[we̞]', order: 6, tags: ['homophone:we'],
    pronunciationNote: lt(
      'ㅗ + ㅐ: "we" as in "wet". ㅙ, ㅚ and ㅞ all sound alike today.',
      'ㅗ + ㅐ: „wä“. ㅙ, ㅚ und ㅞ klingen heute gleich.',
      'ㅗ + ㅐ : « ouè ». ㅙ, ㅚ et ㅞ se prononcent pareil aujourd’hui.',
    ),
    exampleSyllable: '왜', exampleSyllableRomanization: 'wae',
    exampleSyllableAudio: { itemId: 'syllable-wae', text: '왜' },
    exampleWord: { word: '왜', romanization: 'wae', meaning: lt('why', 'warum', 'pourquoi'), audio: { itemId: 'word-wae', text: '왜' } },
    audio: { itemId: 'symbol-wae', text: '왜' },
  },
  {
    id: 'oe', character: 'ㅚ', type: 'compound-vowel', romanization: 'oe', ipa: '[we̞]', order: 7, tags: ['homophone:we'],
    pronunciationNote: lt(
      'Pronounced "we" in modern Korean — same as ㅙ and ㅞ.',
      'Wird heute „we“ gesprochen — wie ㅙ und ㅞ.',
      'Se prononce « ouè » aujourd’hui — comme ㅙ et ㅞ.',
    ),
    exampleSyllable: '외', exampleSyllableRomanization: 'oe',
    exampleSyllableAudio: { itemId: 'syllable-oe', text: '외' },
    exampleWord: { word: '외국', romanization: 'oeguk', meaning: lt('foreign country', 'Ausland', 'pays étranger'), audio: { itemId: 'word-oe', text: '외국' } },
    audio: { itemId: 'symbol-oe', text: '외' },
  },
  {
    id: 'wo', character: 'ㅝ', type: 'compound-vowel', romanization: 'wo', ipa: '[wʌ]', order: 8,
    pronunciationNote: lt(
      'ㅜ + ㅓ: "wo" as in "wonder".',
      'ㅜ + ㅓ: „wo“ mit offenem, ungerundetem Vokal.',
      'ㅜ + ㅓ : « ouo » ouvert, non arrondi.',
    ),
    exampleSyllable: '워', exampleSyllableRomanization: 'wo',
    exampleSyllableAudio: { itemId: 'syllable-wo', text: '워' },
    exampleWord: { word: '원', romanization: 'won', meaning: lt('won (Korean currency)', 'Won (koreanische Währung)', 'won (monnaie coréenne)'), audio: { itemId: 'word-wo', text: '원' } },
    audio: { itemId: 'symbol-wo', text: '워' },
  },
  {
    id: 'we', character: 'ㅞ', type: 'compound-vowel', romanization: 'we', ipa: '[we̞]', order: 9, tags: ['homophone:we'],
    pronunciationNote: lt(
      'ㅜ + ㅔ: "we" as in "wet" — mostly in loanwords.',
      'ㅜ + ㅔ: „we“ — vor allem in Lehnwörtern.',
      'ㅜ + ㅔ : « ouè » — surtout dans les emprunts.',
    ),
    exampleSyllable: '웨', exampleSyllableRomanization: 'we',
    exampleSyllableAudio: { itemId: 'syllable-we', text: '웨' },
    exampleWord: { word: '웨딩', romanization: 'weding', meaning: lt('wedding (loanword)', 'Hochzeit (Lehnwort)', 'mariage (emprunt)'), audio: { itemId: 'word-we', text: '웨딩' } },
    audio: { itemId: 'symbol-we', text: '웨' },
  },
  {
    id: 'wi', character: 'ㅟ', type: 'compound-vowel', romanization: 'wi', ipa: '[wi]', order: 10,
    pronunciationNote: lt(
      'ㅜ + ㅣ: "wee" as in "week".',
      'ㅜ + ㅣ: „wi“ wie in „Wiese“ (mit w-Gleitlaut).',
      'ㅜ + ㅣ : « oui ».',
    ),
    exampleSyllable: '위', exampleSyllableRomanization: 'wi',
    exampleSyllableAudio: { itemId: 'syllable-wi', text: '위' },
    exampleWord: { word: '가위', romanization: 'gawi', meaning: lt('scissors', 'Schere', 'ciseaux'), audio: { itemId: 'word-wi', text: '가위' } },
    audio: { itemId: 'symbol-wi', text: '위' },
  },
  {
    id: 'ui', character: 'ㅢ', type: 'compound-vowel', romanization: 'ui', ipa: '[ɰi]', order: 11,
    pronunciationNote: lt(
      'ㅡ + ㅣ glided together quickly; often just "ee" inside a word.',
      'ㅡ + ㅣ schnell verbunden; im Wortinneren oft nur „i“.',
      'ㅡ + ㅣ enchaînés rapidement ; souvent réduit à « i » dans un mot.',
    ),
    exampleSyllable: '의', exampleSyllableRomanization: 'ui',
    exampleSyllableAudio: { itemId: 'syllable-ui', text: '의' },
    exampleWord: { word: '의사', romanization: 'uisa', meaning: lt('doctor', 'Arzt', 'médecin'), audio: { itemId: 'word-ui', text: '의사' } },
    audio: { itemId: 'symbol-ui', text: '의' },
  },
]

const BASIC_CONSONANT_IDS = ['g', 'n', 'd', 'r', 'm', 'b', 's', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']
const BASIC_VOWEL_IDS = ['a', 'ya', 'eo', 'yeo', 'o', 'yo', 'u', 'yu', 'eu', 'i']
const FINAL_IDS = ['final-k', 'final-n', 'final-t', 'final-l', 'final-m', 'final-p', 'final-ng']
const DOUBLE_CONSONANT_IDS = ['kk', 'tt', 'pp', 'ss', 'jj']
const COMPOUND_VOWEL_IDS = ['ae', 'yae', 'e', 'ye', 'wa', 'wae', 'oe', 'wo', 'we', 'wi', 'ui']

const koreanHangul: ScriptDefinition = {
  id: 'korean-hangul',
  language: 'Korean',
  speechLang: 'ko-KR',
  kind: 'alphabet',
  nativeName: '한글',
  displayName: 'Hangul',
  tagline: lt(
    'The Korean alphabet — simple letters that snap together into syllable blocks.',
    'Das koreanische Alphabet — einfache Buchstaben, die sich zu Silbenblöcken zusammenfügen.',
    'L’alphabet coréen — des lettres simples qui s’assemblent en blocs syllabiques.',
  ),
  intro: [
    lt(
      'Hangul looks mysterious, but it is one of the easiest writing systems in the world — a true alphabet, designed in 1443 by King Sejong so that anyone could learn to read.',
      'Hangul wirkt geheimnisvoll, ist aber eines der einfachsten Schriftsysteme der Welt — ein echtes Alphabet, 1443 unter König Sejong entworfen, damit jeder lesen lernen kann.',
      'Le hangul semble mystérieux, mais c’est l’un des systèmes d’écriture les plus simples au monde — un véritable alphabet, créé en 1443 par le roi Sejong pour que chacun puisse apprendre à lire.',
    ),
    lt(
      'Letters don’t sit in a row like in English. They stack into square syllable blocks: ㅎ + ㅏ + ㄴ becomes 한 (han). Every block is one syllable — consonant first, then vowel, sometimes a final consonant underneath.',
      'Die Buchstaben stehen nicht in einer Reihe wie im Deutschen. Sie stapeln sich zu quadratischen Silbenblöcken: ㅎ + ㅏ + ㄴ wird zu 한 (han). Jeder Block ist eine Silbe — erst Konsonant, dann Vokal, manchmal ein Endkonsonant darunter.',
      'Les lettres ne se suivent pas comme en français. Elles s’empilent en blocs syllabiques carrés : ㅎ + ㅏ + ㄴ devient 한 (han). Chaque bloc est une syllabe — consonne d’abord, puis voyelle, parfois une consonne finale en dessous.',
    ),
    lt(
      'Learn the 14 basic consonants and 10 basic vowels, and you can already sound out most Korean words. Everything else is combinations of what you know.',
      'Lerne die 14 Grundkonsonanten und 10 Grundvokale, und du kannst schon die meisten koreanischen Wörter entziffern. Alles Weitere sind Kombinationen davon.',
      'Apprenez les 14 consonnes et 10 voyelles de base, et vous pourrez déjà déchiffrer la plupart des mots coréens. Tout le reste n’est que combinaison de ce que vous connaissez.',
    ),
  ],
  sections: [
    {
      id: 'basic-consonants',
      title: lt('Basic consonants', 'Grundkonsonanten', 'Consonnes de base'),
      description: lt(
        'The 14 core consonants. Tap one to hear its name and see it in action.',
        'Die 14 Kernkonsonanten. Tippe einen an, um seinen Namen zu hören und ihn in Aktion zu sehen.',
        'Les 14 consonnes principales. Touchez-en une pour entendre son nom et la voir en action.',
      ),
      symbolIds: BASIC_CONSONANT_IDS,
    },
    {
      id: 'basic-vowels',
      title: lt('Basic vowels', 'Grundvokale', 'Voyelles de base'),
      description: lt(
        'The 10 core vowels. On their own they are written with a silent ㅇ in front: ㅏ becomes 아.',
        'Die 10 Grundvokale. Allein geschrieben bekommen sie ein stummes ㅇ davor: aus ㅏ wird 아.',
        'Les 10 voyelles de base. Seules, elles s’écrivent avec un ㅇ muet devant : ㅏ devient 아.',
      ),
      symbolIds: BASIC_VOWEL_IDS,
    },
    {
      id: 'batchim',
      title: lt('Batchim — final consonants', 'Batchim — Endkonsonanten', 'Batchim — consonnes finales'),
      description: lt(
        'A consonant under the block closes the syllable: 하 + ㄴ = 한. Finals are softer — stops are held, not released. These seven sounds cover every batchim.',
        'Ein Konsonant unter dem Block schließt die Silbe: 하 + ㄴ = 한. Endlaute sind weicher — Verschlusslaute werden gehalten, nicht gelöst. Diese sieben Laute decken jedes Batchim ab.',
        'Une consonne sous le bloc ferme la syllabe : 하 + ㄴ = 한. Les finales sont plus douces — les occlusives sont retenues, pas relâchées. Ces sept sons couvrent tous les batchim.',
      ),
      symbolIds: FINAL_IDS,
    },
    {
      id: 'double-consonants',
      title: lt('Double consonants', 'Doppelkonsonanten', 'Consonnes doubles'),
      description: lt(
        'Five tense twins: the same shapes doubled, spoken with a tight throat and no puff of air.',
        'Fünf gespannte Zwillinge: dieselben Formen verdoppelt, mit angespannter Kehle und ohne Lufthauch gesprochen.',
        'Cinq jumelles tendues : les mêmes formes doublées, prononcées gorge serrée, sans souffle d’air.',
      ),
      symbolIds: DOUBLE_CONSONANT_IDS,
      advanced: true,
    },
    {
      id: 'compound-vowels',
      title: lt('Compound vowels', 'Zusammengesetzte Vokale', 'Voyelles composées'),
      description: lt(
        'Vowels built from ones you already know — mostly w-glides and e-sounds.',
        'Vokale aus bereits bekannten Bausteinen — meist w-Gleitlaute und e-Laute.',
        'Des voyelles construites à partir de celles que vous connaissez — surtout des glissements en w et des sons en è.',
      ),
      symbolIds: COMPOUND_VOWEL_IDS,
      advanced: true,
    },
  ],
  symbols,
  composition: {
    initialIds: [...BASIC_CONSONANT_IDS, ...DOUBLE_CONSONANT_IDS],
    medialIds: [...BASIC_VOWEL_IDS, ...COMPOUND_VOWEL_IDS],
    finalIds: FINAL_IDS,
    compose: (initialId, medialId, finalId) => {
      const initial = symbols.find((s) => s.id === initialId)
      const medial = symbols.find((s) => s.id === medialId)
      const final = finalId ? FINAL_JAMO[finalId] : undefined
      if (!initial || !medial || (finalId && !final)) return null

      const composed = composeHangul(initial.character, medial.character, final)
      if (!composed) return null
      return {
        text: composed.syllable,
        romanization: composed.romanization,
        audio: { itemId: `composed-${composed.syllable.codePointAt(0)?.toString(16)}`, text: composed.syllable },
      }
    },
  },
}

export default koreanHangul
