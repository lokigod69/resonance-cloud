// ⚠️ KEEP IN SYNC with the twin in orchestrator/frontend/api/voice-sample.ts
// (VOICE_SAMPLE_SENTENCES const). Per-language fixed sentences used by the
// voice sample buttons — short enough that generation + playback stays snappy,
// phoneme-rich enough that voice identity is recognizable across languages.
//
// NOTE: Cebuano (ceb) is not yet confirmed by a native speaker; flag in PR.

export const VOICE_SAMPLE_SENTENCES: Record<string, string> = {
  en: "Hello there, I'm your language tutor. Let's practice together — we'll start gently, build confidence, and have some fun along the way.",
  de: "Hallo, ich bin dein Sprachlehrer. Lass uns zusammen üben — wir beginnen ganz ruhig und machen gute Fortschritte, Schritt für Schritt.",
  fr: "Bonjour, je suis votre professeur de langue. Pratiquons ensemble — nous avancerons tranquillement, avec plaisir et sans pression aucune.",
  it: "Ciao, sono il tuo insegnante di lingua. Facciamo pratica insieme — cominceremo piano, con calma e con tanto entusiasmo.",
  es: "Hola, soy tu profesor de idiomas. Vamos a practicar juntos — comenzaremos despacio, con paciencia, y disfrutando cada pequeño paso.",
  ko: "안녕하세요, 저는 여러분의 언어 선생님입니다. 함께 천천히 연습해봐요. 편안하게, 즐겁게, 한 걸음씩 나아가요.",
  ceb: "Kumusta, ako ang inyong magtutudlo sa pinulongan. Magpraktis ta, hinay-hinay lang — sayon ra, lingaw kaayo, ug mag-uban ta.",
  fil: "Kumusta, ako ang iyong guro sa wika. Magsanay tayo nang magkasama — dahan-dahan lang, masaya, at may tiwala sa bawat hakbang.",
  id: "Halo, saya guru bahasa Anda. Mari kita berlatih bersama — pelan-pelan saja, dengan santai, riang, dan penuh semangat.",
}

export function getSampleSentence(language: string): string {
  return VOICE_SAMPLE_SENTENCES[language] ?? VOICE_SAMPLE_SENTENCES.en
}
