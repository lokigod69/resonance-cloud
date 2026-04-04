export interface TutorVoice {
  id: string
  name: string
  language: string
  gender: 'male' | 'female'
  mistralVoiceId: string
  elevenLabsId?: string
  sampleUrl: string
}

export const TUTOR_VOICES: TutorVoice[] = [
  // ── English ──
  { id: 'en_hope',      name: 'Hope',      language: 'en', gender: 'female', mistralVoiceId: 'b20117b6-f11c-461f-9978-19968c237e32', sampleUrl: '/voices/en_Hope_female.mp3' },
  { id: 'en_serena',    name: 'Serena',    language: 'en', gender: 'female', mistralVoiceId: '8aa47c25-0dca-46cc-8713-ca5178f261ed', sampleUrl: '/voices/en_Serena_female.mp3' },
  { id: 'en_katherine', name: 'Katherine', language: 'en', gender: 'female', mistralVoiceId: '82a4760d-fbcc-47d0-ab37-f347f6b04553', sampleUrl: '/voices/en_Katherine_female.mp3' },
  { id: 'en_drew',      name: 'Drew',      language: 'en', gender: 'male',   mistralVoiceId: '9f63c271-6025-40a8-9e14-e2b8809625fb', sampleUrl: '/voices/en_Drew_male.mp3' },
  { id: 'en_marcus',    name: 'Marcus',    language: 'en', gender: 'male',   mistralVoiceId: '10f047af-92a9-493d-a079-51418d3bf8c0', sampleUrl: '/voices/en_Marcus_male.mp3' },
  { id: 'en_jon',       name: 'Jon',       language: 'en', gender: 'male',   mistralVoiceId: 'daec1b31-288a-45ba-a2c0-df0619f562a0', sampleUrl: '/voices/en_Jon_male.mp3' },
  // ── Italian ──
  { id: 'it_elettra', name: 'Elettra', language: 'it', gender: 'female', mistralVoiceId: '38647032-b1b5-4f8e-8ef6-04ac11925296', sampleUrl: '/voices/it_Elettra_female.mp3' },
  { id: 'it_sami',    name: 'Sami',    language: 'it', gender: 'female', mistralVoiceId: '8b783bc6-a038-44ca-8609-2b5e7bff9acf', sampleUrl: '/voices/it_Sami_female.mp3' },
  { id: 'it_mario',   name: 'Mario',   language: 'it', gender: 'male',   mistralVoiceId: '8aabef59-029d-43fd-ad20-e0e798924f5d', sampleUrl: '/voices/it_Mario_male.mp3' },
  { id: 'it_brando',  name: 'Brando',  language: 'it', gender: 'male',   mistralVoiceId: '92a33343-0073-4254-938c-0b2b3433bffc', sampleUrl: '/voices/it_Brando_male.mp3' },
  // ── French ──
  { id: 'fr_claire', name: 'Claire', language: 'fr', gender: 'female', mistralVoiceId: '99104b5b-e943-4598-878d-0a881a45baef', sampleUrl: '/voices/fr_Claire_female.mp3' },
  { id: 'fr_anna',   name: 'Anna',   language: 'fr', gender: 'female', mistralVoiceId: '253f7b5b-56f3-435c-b9c5-5a2e77f45737', sampleUrl: '/voices/fr_Anna_female.mp3' },
  { id: 'fr_yann',   name: 'Yann',   language: 'fr', gender: 'male',   mistralVoiceId: '1292f393-9deb-4dcf-a860-96c3b2dc55eb', sampleUrl: '/voices/fr_Yann_male.mp3' },
  { id: 'fr_martin', name: 'Martin', language: 'fr', gender: 'male',   mistralVoiceId: 'efe8c4d3-4635-4476-978a-fde3223c5f21', sampleUrl: '/voices/fr_Martin_male.mp3' },
  // ── German ──
  { id: 'de_mila',    name: 'Mila',    language: 'de', gender: 'female', mistralVoiceId: '5eea3a34-f977-4bbc-9a67-4050588ebc83', sampleUrl: '/voices/de_Mila_female.mp3' },
  { id: 'de_kerstin', name: 'Kerstin', language: 'de', gender: 'female', mistralVoiceId: '1102bcf8-c761-40b7-a6b8-3ba33b70aa46', sampleUrl: '/voices/de_Kerstin_female.mp3' },
  { id: 'de_michael', name: 'Michael', language: 'de', gender: 'male',   mistralVoiceId: '0b1de138-ab7a-4ce1-a0ad-acde214ab936', sampleUrl: '/voices/de_Michael_male.mp3' },
  { id: 'de_thomas',  name: 'Thomas',  language: 'de', gender: 'male',   mistralVoiceId: '77f67837-55e2-46d1-af07-83cb10bfe20a', sampleUrl: '/voices/de_Thomas_male.mp3' },
  // ── Spanish ──
  { id: 'es_carolina', name: 'Carolina', language: 'es', gender: 'female', mistralVoiceId: '20c4028f-ec23-47ae-af8a-fb2e0615abd8', sampleUrl: '/voices/es_Carolina_female.mp3' },
  { id: 'es_gabriela', name: 'Gabriela', language: 'es', gender: 'female', mistralVoiceId: '88ae25a4-1b5f-4355-92eb-4e1875f344a7', sampleUrl: '/voices/es_Gabriela_female.mp3' },
  { id: 'es_david',    name: 'David',    language: 'es', gender: 'male',   mistralVoiceId: 'f53b2f80-efe9-4dd0-8101-c25bc5ef6428', sampleUrl: '/voices/es_David_male.mp3' },
  { id: 'es_abel',     name: 'Abel',     language: 'es', gender: 'male',   mistralVoiceId: 'a3c743c4-643a-4627-b603-61b52b03e37c', sampleUrl: '/voices/es_Abel_male.mp3' },
  // ── Portuguese ──
  { id: 'pt_yasmin',  name: 'Yasmin',  language: 'pt', gender: 'female', mistralVoiceId: '80d1df25-564a-47b6-9325-bb61277c8464', sampleUrl: '/voices/pt_Yasmin_female.mp3' },
  { id: 'pt_leni',    name: 'Leni',    language: 'pt', gender: 'female', mistralVoiceId: '92606271-c4e9-4937-9d97-2afa7ec6d47e', sampleUrl: '/voices/pt_Leni_female.mp3' },
  { id: 'pt_arnold',  name: 'Arnold',  language: 'pt', gender: 'male',   mistralVoiceId: '66dedc7f-4aac-47bc-9553-c716bad193d6', sampleUrl: '/voices/pt_Arnold_male.mp3' },
  { id: 'pt_matheus', name: 'Matheus', language: 'pt', gender: 'male',   mistralVoiceId: 'be33dc88-02fb-4fa5-96d6-2e93b387c4b4', sampleUrl: '/voices/pt_Matheus_male.mp3' },
  // ── Dutch ──
  { id: 'nl_melanie', name: 'Melanie', language: 'nl', gender: 'female', mistralVoiceId: 'b6ed2ec1-bace-4d5e-88c2-ee1d881c115d', sampleUrl: '/voices/nl_Melanie_female.mp3' },
  { id: 'nl_ruth',    name: 'Ruth',    language: 'nl', gender: 'female', mistralVoiceId: '41d64204-5ced-4019-bec4-98ab1af2d73e', sampleUrl: '/voices/nl_Ruth_female.mp3' },
  { id: 'nl_robert',  name: 'Robert',  language: 'nl', gender: 'male',   mistralVoiceId: 'abb53d6c-f34d-45bd-80fe-dec09262879c', sampleUrl: '/voices/nl_Robert_male.mp3' },
  { id: 'nl_arjen',   name: 'Arjen',   language: 'nl', gender: 'male',   mistralVoiceId: '689a076a-a367-4323-8d7d-801ebc25c2f0', sampleUrl: '/voices/nl_Arjen_male.mp3' },
  // ── Hindi ──
  { id: 'hi_kanika',  name: 'Kanika',  language: 'hi', gender: 'female', mistralVoiceId: '8dfc9345-ba80-4f88-91e8-92205ca53807', sampleUrl: '/voices/hi_Kanika_female.mp3' },
  { id: 'hi_tripti',  name: 'Tripti',  language: 'hi', gender: 'female', mistralVoiceId: 'd1df2044-5b13-4cbc-9c07-570342a580f2', sampleUrl: '/voices/hi_Tripti_female.mp3' },
  { id: 'hi_sara',    name: 'Sara',    language: 'hi', gender: 'female', mistralVoiceId: 'aa5e52cd-4260-4ef7-bea6-a30ae66434a5', sampleUrl: '/voices/hi_Sara_female.mp3' },
  { id: 'hi_viraj',   name: 'Viraj',   language: 'hi', gender: 'male',   mistralVoiceId: '8d64aa15-aa57-416a-8b79-48ca54e72685', sampleUrl: '/voices/hi_Viraj_male.mp3' },
  { id: 'hi_aaditya', name: 'Aaditya', language: 'hi', gender: 'male',   mistralVoiceId: 'ec3dec08-19c2-445c-a06b-7b1587d3ce65', sampleUrl: '/voices/hi_Aaditya_male.mp3' },
  { id: 'hi_bunty',   name: 'Bunty',   language: 'hi', gender: 'male',   mistralVoiceId: '4810864d-bc52-48fa-bd98-97d74bbc43a9', sampleUrl: '/voices/hi_Bunty_male.mp3' },
  // ── Arabic ──
  { id: 'ar_salma',   name: 'Salma',   language: 'ar', gender: 'female', mistralVoiceId: 'cbf6b6ae-4e88-4cab-aa95-261891957592', sampleUrl: '/voices/ar_Salma_female.mp3' },
  { id: 'ar_saraar',  name: 'Sara',    language: 'ar', gender: 'female', mistralVoiceId: 'afc7b096-cc10-48dd-9b41-a1add4e8a665', sampleUrl: '/voices/ar_SaraAR_female.mp3' },
  { id: 'ar_yasmine', name: 'Yasmine', language: 'ar', gender: 'female', mistralVoiceId: 'b106c1c5-2ec2-4576-b634-9cff6099abcf', sampleUrl: '/voices/ar_Yasmine_female.mp3' },
  { id: 'ar_yousef',  name: 'Yousef',  language: 'ar', gender: 'male',   mistralVoiceId: '414a56c0-f4de-4ec1-8f8a-2bfffe963a1c', sampleUrl: '/voices/ar_Yousef_male.mp3' },
  { id: 'ar_adam',    name: 'Adam',    language: 'ar', gender: 'male',   mistralVoiceId: 'bf0ecf1c-1f6e-47bf-a64c-d83c6ee78725', sampleUrl: '/voices/ar_Adam_male.mp3' },
  { id: 'ar_omar',    name: 'Omar',    language: 'ar', gender: 'male',   mistralVoiceId: 'b35622cc-b2ae-4dbf-9c28-277a21585d4a', sampleUrl: '/voices/ar_Omar_male.mp3' },
  // ── Filipino (ElevenLabs only) ──
  { id: 'fil_maria',  name: 'Maria',  language: 'fil', gender: 'female', mistralVoiceId: '', elevenLabsId: '4RLeKvASM0Zt73Htf5GF', sampleUrl: '/voices/fil_Maria_female.mp3' },
  // ── Indonesian (ElevenLabs only) ──
  { id: 'id_anjani',  name: 'Anjani', language: 'id',  gender: 'female', mistralVoiceId: '', elevenLabsId: '52LXmmR0nGnIcDs1TL3f', sampleUrl: '/voices/id_Anjani_female.mp3' },
  // ── Korean (ElevenLabs only) ──
  { id: 'ko_hanna',   name: 'Hanna',  language: 'ko',  gender: 'female', mistralVoiceId: '', elevenLabsId: 'zgDzx5jLLCqEp6Fl7Kl7', sampleUrl: '/voices/ko_Hanna_female.mp3' },
]

export function getVoicesForLanguage(lang: string): TutorVoice[] {
  return TUTOR_VOICES.filter((v) => v.language === lang)
}
