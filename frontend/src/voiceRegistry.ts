export interface TutorVoice {
  id: string
  name: string
  language: string
  gender: 'male' | 'female'
  mistralVoiceId: string
  sampleUrl: string
}

export const TUTOR_VOICES: TutorVoice[] = [
  // ── English (20) ──
  { id: 'en_jon',       name: 'Jon',       language: 'en', gender: 'male',   mistralVoiceId: 'daec1b31-288a-45ba-a2c0-df0619f562a0', sampleUrl: '/voices/en_Jon_male.mp3' },
  { id: 'en_drew',      name: 'Drew',      language: 'en', gender: 'male',   mistralVoiceId: '9f63c271-6025-40a8-9e14-e2b8809625fb', sampleUrl: '/voices/en_Drew_male.mp3' },
  { id: 'en_pharao',    name: 'Pharao',    language: 'en', gender: 'male',   mistralVoiceId: '8127e716-0c58-4065-abcf-7b0b912fd400', sampleUrl: '/voices/en_Pharao_male.mp3' },
  { id: 'en_andy',      name: 'Andy',      language: 'en', gender: 'male',   mistralVoiceId: '3f44e679-8b82-47f6-b95a-2ad352e4718e', sampleUrl: '/voices/en_Andy_male.mp3' },
  { id: 'en_austin',    name: 'Austin',    language: 'en', gender: 'male',   mistralVoiceId: '6ae04a4b-3357-4e9e-b960-e7b579db6880', sampleUrl: '/voices/en_Austin_male.mp3' },
  { id: 'en_theo',      name: 'Theo',      language: 'en', gender: 'male',   mistralVoiceId: '26596326-2a67-4ba0-991a-c5f56197bea7', sampleUrl: '/voices/en_Theo_male.mp3' },
  { id: 'en_jamal',     name: 'Jamal',     language: 'en', gender: 'male',   mistralVoiceId: '44fbbf55-16b9-4fee-9b3f-5f062f3d2047', sampleUrl: '/voices/en_Jamal_male.mp3' },
  { id: 'en_marcus',    name: 'Marcus',    language: 'en', gender: 'male',   mistralVoiceId: '10f047af-92a9-493d-a079-51418d3bf8c0', sampleUrl: '/voices/en_Marcus_male.mp3' },
  { id: 'en_declansage',name: 'DeclanSage',language: 'en', gender: 'male',   mistralVoiceId: 'c13e5a31-cbdd-4354-8282-f02b03ff9541', sampleUrl: '/voices/en_DeclanSage_male.mp3' },
  { id: 'en_jacob',     name: 'Jacob',     language: 'en', gender: 'male',   mistralVoiceId: '51693642-1f7b-49d6-abaa-ac1f6053d675', sampleUrl: '/voices/en_Jacob_male.mp3' },
  { id: 'en_hope',      name: 'Hope',      language: 'en', gender: 'female', mistralVoiceId: 'b20117b6-f11c-461f-9978-19968c237e32', sampleUrl: '/voices/en_Hope_female.mp3' },
  { id: 'en_serena',    name: 'Serena',    language: 'en', gender: 'female', mistralVoiceId: '8aa47c25-0dca-46cc-8713-ca5178f261ed', sampleUrl: '/voices/en_Serena_female.mp3' },
  { id: 'en_cherie',    name: 'Cherie',    language: 'en', gender: 'female', mistralVoiceId: 'f1826e7a-060f-4bff-b37e-d9a364349895', sampleUrl: '/voices/en_Cherie_female.mp3' },
  { id: 'en_katherine', name: 'Katherine', language: 'en', gender: 'female', mistralVoiceId: '82a4760d-fbcc-47d0-ab37-f347f6b04553', sampleUrl: '/voices/en_Katherine_female.mp3' },
  { id: 'en_monika',    name: 'Monika',    language: 'en', gender: 'female', mistralVoiceId: '182386f4-8c1b-4f09-8063-9382b10dc7f8', sampleUrl: '/voices/en_Monika_female.mp3' },
  { id: 'en_haley',     name: 'Haley',     language: 'en', gender: 'female', mistralVoiceId: '00aa8234-5bdc-49b3-8e35-207dbb2966cd', sampleUrl: '/voices/en_Haley_female.mp3' },
  { id: 'en_renee',     name: 'Renee',     language: 'en', gender: 'female', mistralVoiceId: '2b151ae1-38ba-41f2-a40d-b1a59e116bf3', sampleUrl: '/voices/en_Renee_female.mp3' },
  { id: 'en_danielle',  name: 'Danielle',  language: 'en', gender: 'female', mistralVoiceId: 'c50c6385-37ad-4dff-bb22-005dac3950fc', sampleUrl: '/voices/en_Danielle_female.mp3' },
  { id: 'en_siren',     name: 'Siren',     language: 'en', gender: 'female', mistralVoiceId: '80b94be2-89d6-402c-986d-bf5c49796a42', sampleUrl: '/voices/en_Siren_female.mp3' },
  { id: 'en_valory',    name: 'Valory',    language: 'en', gender: 'female', mistralVoiceId: '4c38b533-79bd-4f74-b704-fba2f703fe16', sampleUrl: '/voices/en_Valory_female.mp3' },

  // ── Italian (12) ──
  { id: 'it_marcotrox', name: 'MarcoTrox', language: 'it', gender: 'male',   mistralVoiceId: '7342cde6-d6af-4ec5-953e-63773cd87a8c', sampleUrl: '/voices/it_MarcoTrox_male.mp3' },
  { id: 'it_mario',     name: 'Mario',     language: 'it', gender: 'male',   mistralVoiceId: '8aabef59-029d-43fd-ad20-e0e798924f5d', sampleUrl: '/voices/it_Mario_male.mp3' },
  { id: 'it_brando',    name: 'Brando',    language: 'it', gender: 'male',   mistralVoiceId: '92a33343-0073-4254-938c-0b2b3433bffc', sampleUrl: '/voices/it_Brando_male.mp3' },
  { id: 'it_marco',     name: 'Marco',     language: 'it', gender: 'male',   mistralVoiceId: '63e9828a-67e2-4344-88bb-29c6dc3a8d73', sampleUrl: '/voices/it_Marco_male.mp3' },
  { id: 'it_gulio',     name: 'Gulio',     language: 'it', gender: 'male',   mistralVoiceId: '28f74a8b-8e24-4b47-9814-0f04cda9b908', sampleUrl: '/voices/it_Gulio_male.mp3' },
  { id: 'it_chris',     name: 'Chris',     language: 'it', gender: 'male',   mistralVoiceId: '02f44db2-c0b2-477d-9564-e91412781b36', sampleUrl: '/voices/it_Chris_male.mp3' },
  { id: 'it_sami',      name: 'Sami',      language: 'it', gender: 'female', mistralVoiceId: '8b783bc6-a038-44ca-8609-2b5e7bff9acf', sampleUrl: '/voices/it_Sami_female.mp3' },
  { id: 'it_toca',      name: 'Toca',      language: 'it', gender: 'female', mistralVoiceId: 'b1b82ff6-3d65-4b91-94db-c630c8d808a9', sampleUrl: '/voices/it_Toca_female.mp3' },
  { id: 'it_elettra',   name: 'Elettra',   language: 'it', gender: 'female', mistralVoiceId: '38647032-b1b5-4f8e-8ef6-04ac11925296', sampleUrl: '/voices/it_Elettra_female.mp3' },
  { id: 'it_tiziana',   name: 'Tiziana',   language: 'it', gender: 'female', mistralVoiceId: '4c9441cf-5521-44d5-a172-dd22e8e73f97', sampleUrl: '/voices/it_Tiziana_female.mp3' },
  { id: 'it_ginevra',   name: 'Ginevra',   language: 'it', gender: 'female', mistralVoiceId: 'a4583ee3-dbbd-4753-84b5-94183dbf51ea', sampleUrl: '/voices/it_Ginevra_female.mp3' },
  { id: 'it_rita',      name: 'Rita',      language: 'it', gender: 'female', mistralVoiceId: '36accaba-07eb-4f20-a6e6-229e18f2875d', sampleUrl: '/voices/it_Rita_female.mp3' },

  // ── French (12) ──
  { id: 'fr_yann',      name: 'Yann',      language: 'fr', gender: 'male',   mistralVoiceId: '1292f393-9deb-4dcf-a860-96c3b2dc55eb', sampleUrl: '/voices/fr_Yann_male.mp3' },
  { id: 'fr_paul',      name: 'Paul',      language: 'fr', gender: 'male',   mistralVoiceId: '79baf749-f978-4086-aaf7-7d3e689b432e', sampleUrl: '/voices/fr_Paul_male.mp3' },
  { id: 'fr_guillame',  name: 'Guillame',  language: 'fr', gender: 'male',   mistralVoiceId: '1fb7ead7-b581-4899-af8a-cf4df48bff6d', sampleUrl: '/voices/fr_Guillame_male.mp3' },
  { id: 'fr_martin',    name: 'Martin',    language: 'fr', gender: 'male',   mistralVoiceId: 'efe8c4d3-4635-4476-978a-fde3223c5f21', sampleUrl: '/voices/fr_Martin_male.mp3' },
  { id: 'fr_frederic',  name: 'Frederic',  language: 'fr', gender: 'male',   mistralVoiceId: 'f2124e6b-f7ac-4f23-a589-c33ebacb376f', sampleUrl: '/voices/fr_Frederic_male.mp3' },
  { id: 'fr_jonathan',  name: 'Jonathan',  language: 'fr', gender: 'male',   mistralVoiceId: '83755e47-a3eb-4980-94c6-72df60c7eb12', sampleUrl: '/voices/fr_Jonathan_male.mp3' },
  { id: 'fr_anna',      name: 'Anna',      language: 'fr', gender: 'female', mistralVoiceId: '253f7b5b-56f3-435c-b9c5-5a2e77f45737', sampleUrl: '/voices/fr_Anna_female.mp3' },
  { id: 'fr_claire',    name: 'Claire',    language: 'fr', gender: 'female', mistralVoiceId: '99104b5b-e943-4598-878d-0a881a45baef', sampleUrl: '/voices/fr_Claire_female.mp3' },
  { id: 'fr_koraly',    name: 'Koraly',    language: 'fr', gender: 'female', mistralVoiceId: '1cf7f022-409f-4806-ad2e-68ef96a39834', sampleUrl: '/voices/fr_Koraly_female.mp3' },
  { id: 'fr_emelie',    name: 'Emelie',    language: 'fr', gender: 'female', mistralVoiceId: '9357c120-c0a5-4bac-b489-228bf41670eb', sampleUrl: '/voices/fr_Emelie_female.mp3' },
  { id: 'fr_caroline',  name: 'Caroline',  language: 'fr', gender: 'female', mistralVoiceId: '369f83f7-8180-48f2-97a7-448cb08359e6', sampleUrl: '/voices/fr_Caroline_female.mp3' },
  { id: 'fr_delphine',  name: 'Delphine',  language: 'fr', gender: 'female', mistralVoiceId: '90d15a8a-0243-40b0-8c48-a0fed37a7976', sampleUrl: '/voices/fr_Delphine_female.mp3' },

  // ── German (14) ──
  { id: 'de_michael',   name: 'Michael',   language: 'de', gender: 'male',   mistralVoiceId: '0b1de138-ab7a-4ce1-a0ad-acde214ab936', sampleUrl: '/voices/de_Michael_male.mp3' },
  { id: 'de_helmut',    name: 'Helmut',    language: 'de', gender: 'male',   mistralVoiceId: '702a91dc-4c42-408b-916d-e407eafcc9c7', sampleUrl: '/voices/de_Helmut_male.mp3' },
  { id: 'de_thomas',    name: 'Thomas',    language: 'de', gender: 'male',   mistralVoiceId: '77f67837-55e2-46d1-af07-83cb10bfe20a', sampleUrl: '/voices/de_Thomas_male.mp3' },
  { id: 'de_wolf',      name: 'Wolf',      language: 'de', gender: 'male',   mistralVoiceId: '74389084-c56a-4378-9dbf-0b3c696bb327', sampleUrl: '/voices/de_Wolf_male.mp3' },
  { id: 'de_leon',      name: 'Leon',      language: 'de', gender: 'male',   mistralVoiceId: '6fb5cb3c-9c07-4072-93e6-c7e1a0484efd', sampleUrl: '/voices/de_Leon_male.mp3' },
  { id: 'de_hopsi',     name: 'Hopsi',     language: 'de', gender: 'male',   mistralVoiceId: 'e9f04b5a-4776-4f7c-9618-3a289f5ae07b', sampleUrl: '/voices/de_Hopsi_male.mp3' },
  { id: 'de_whispersoul',name:'WhisperSoul',language:'de', gender: 'male',   mistralVoiceId: '99e06bfc-6608-41b3-aedf-4bc98ae73520', sampleUrl: '/voices/de_WhisperSoul_male.mp3' },
  { id: 'de_ramona',    name: 'Ramona',    language: 'de', gender: 'female', mistralVoiceId: '3c98c9be-afa8-4dd7-b878-ea26ca15dccb', sampleUrl: '/voices/de_Ramona_female.mp3' },
  { id: 'de_irene',     name: 'Irene',     language: 'de', gender: 'female', mistralVoiceId: 'bb9f8e8b-9c03-496e-89a2-94fc27b4fe40', sampleUrl: '/voices/de_Irene_female.mp3' },
  { id: 'de_mila',      name: 'Mila',      language: 'de', gender: 'female', mistralVoiceId: '5eea3a34-f977-4bbc-9a67-4050588ebc83', sampleUrl: '/voices/de_Mila_female.mp3' },
  { id: 'de_kerstin',   name: 'Kerstin',   language: 'de', gender: 'female', mistralVoiceId: '1102bcf8-c761-40b7-a6b8-3ba33b70aa46', sampleUrl: '/voices/de_Kerstin_female.mp3' },
  { id: 'de_enia',      name: 'Enia',      language: 'de', gender: 'female', mistralVoiceId: '44baf039-31db-4602-bbcf-cacfca9320aa', sampleUrl: '/voices/de_Enia_female.mp3' },
  { id: 'de_annade',    name: 'AnnaDE',    language: 'de', gender: 'female', mistralVoiceId: 'dcc89e44-9e80-452e-b8d2-350caeaa5cef', sampleUrl: '/voices/de_AnnaDE_female.mp3' },
  { id: 'de_lucy',      name: 'Lucy',      language: 'de', gender: 'female', mistralVoiceId: '14630722-c283-4a0c-8ec6-2072da9ec7a7', sampleUrl: '/voices/de_Lucy_female.mp3' },

  // ── Spanish (12) ──
  { id: 'es_david',     name: 'David',     language: 'es', gender: 'male',   mistralVoiceId: 'f53b2f80-efe9-4dd0-8101-c25bc5ef6428', sampleUrl: '/voices/es_David_male.mp3' },
  { id: 'es_abel',      name: 'Abel',      language: 'es', gender: 'male',   mistralVoiceId: 'a3c743c4-643a-4627-b603-61b52b03e37c', sampleUrl: '/voices/es_Abel_male.mp3' },
  { id: 'es_god',       name: 'God',       language: 'es', gender: 'male',   mistralVoiceId: '931b3137-00f4-4fc3-af40-46acbb098470', sampleUrl: '/voices/es_God_male.mp3' },
  { id: 'es_abuelo',    name: 'Abuelo',    language: 'es', gender: 'male',   mistralVoiceId: 'a266c6b5-dc4e-40dc-9587-d1b85b172ffb', sampleUrl: '/voices/es_Abuelo_male.mp3' },
  { id: 'es_salvatore', name: 'Salvatore', language: 'es', gender: 'male',   mistralVoiceId: 'db72ff49-145d-46fd-9f3b-d59d4c5bb90d', sampleUrl: '/voices/es_Salvatore_male.mp3' },
  { id: 'es_ludovico',  name: 'Ludovico',  language: 'es', gender: 'male',   mistralVoiceId: 'fd890ec2-8af7-4420-8a7e-a876529e0845', sampleUrl: '/voices/es_Ludovico_male.mp3' },
  { id: 'es_sandra',    name: 'Sandra',    language: 'es', gender: 'female', mistralVoiceId: '51a306cc-d7f5-449b-afc9-9c74fa600fba', sampleUrl: '/voices/es_Sandra_female.mp3' },
  { id: 'es_carolina',  name: 'Carolina',  language: 'es', gender: 'female', mistralVoiceId: '20c4028f-ec23-47ae-af8a-fb2e0615abd8', sampleUrl: '/voices/es_Carolina_female.mp3' },
  { id: 'es_sheila',    name: 'Sheila',    language: 'es', gender: 'female', mistralVoiceId: 'e2d19eb5-4605-4082-bc40-e8ab076ea7bb', sampleUrl: '/voices/es_Sheila_female.mp3' },
  { id: 'es_gabriela',  name: 'Gabriela',  language: 'es', gender: 'female', mistralVoiceId: '88ae25a4-1b5f-4355-92eb-4e1875f344a7', sampleUrl: '/voices/es_Gabriela_female.mp3' },
  { id: 'es_jehnny',    name: 'Jehnny',    language: 'es', gender: 'female', mistralVoiceId: '81c93ea2-3f2d-4126-9326-c6c5e8402164', sampleUrl: '/voices/es_Jehnny_female.mp3' },
  { id: 'es_gabi',      name: 'Gabi',      language: 'es', gender: 'female', mistralVoiceId: '66a7f942-e9ec-477f-9ff8-f2d917243d92', sampleUrl: '/voices/es_Gabi_female.mp3' },

  // ── Portuguese (10) ──
  { id: 'pt_arnold',    name: 'Arnold',    language: 'pt', gender: 'male',   mistralVoiceId: '66dedc7f-4aac-47bc-9553-c716bad193d6', sampleUrl: '/voices/pt_Arnold_male.mp3' },
  { id: 'pt_matheus',   name: 'Matheus',   language: 'pt', gender: 'male',   mistralVoiceId: 'be33dc88-02fb-4fa5-96d6-2e93b387c4b4', sampleUrl: '/voices/pt_Matheus_male.mp3' },
  { id: 'pt_lax',       name: 'Lax',       language: 'pt', gender: 'male',   mistralVoiceId: '59d94a4d-251b-418a-bc98-6d4daa62c2d4', sampleUrl: '/voices/pt_Lax_male.mp3' },
  { id: 'pt_will',      name: 'Will',      language: 'pt', gender: 'male',   mistralVoiceId: '23b2543a-74eb-4fc1-b79a-ebca9eb06b25', sampleUrl: '/voices/pt_Will_male.mp3' },
  { id: 'pt_paulo',     name: 'Paulo',     language: 'pt', gender: 'male',   mistralVoiceId: '11b75c82-85b7-44a2-8cef-a3e4d6224020', sampleUrl: '/voices/pt_Paulo_male.mp3' },
  { id: 'pt_leni',      name: 'Leni',      language: 'pt', gender: 'female', mistralVoiceId: '92606271-c4e9-4937-9d97-2afa7ec6d47e', sampleUrl: '/voices/pt_Leni_female.mp3' },
  { id: 'pt_scheila',   name: 'Scheila',   language: 'pt', gender: 'female', mistralVoiceId: '66cda1e5-80b0-4d46-a9b4-5c3a2e4dbdd1', sampleUrl: '/voices/pt_Scheila_female.mp3' },
  { id: 'pt_yasmin',    name: 'Yasmin',    language: 'pt', gender: 'female', mistralVoiceId: '80d1df25-564a-47b6-9325-bb61277c8464', sampleUrl: '/voices/pt_Yasmin_female.mp3' },
  { id: 'pt_raquel',    name: 'Raquel',    language: 'pt', gender: 'female', mistralVoiceId: '085a2255-38b3-498b-97d5-261b1ec9547e', sampleUrl: '/voices/pt_Raquel_female.mp3' },
  { id: 'pt_keren',     name: 'Keren',     language: 'pt', gender: 'female', mistralVoiceId: '7f0aa586-98e8-45b6-a26f-8c93f838a2f4', sampleUrl: '/voices/pt_Keren_female.mp3' },

  // ── Dutch (4) ──
  { id: 'nl_robert',    name: 'Robert',    language: 'nl', gender: 'male',   mistralVoiceId: 'abb53d6c-f34d-45bd-80fe-dec09262879c', sampleUrl: '/voices/nl_Robert_male.mp3' },
  { id: 'nl_arjen',     name: 'Arjen',     language: 'nl', gender: 'male',   mistralVoiceId: '689a076a-a367-4323-8d7d-801ebc25c2f0', sampleUrl: '/voices/nl_Arjen_male.mp3' },
  { id: 'nl_melanie',   name: 'Melanie',   language: 'nl', gender: 'female', mistralVoiceId: 'b6ed2ec1-bace-4d5e-88c2-ee1d881c115d', sampleUrl: '/voices/nl_Melanie_female.mp3' },
  { id: 'nl_ruth',      name: 'Ruth',      language: 'nl', gender: 'female', mistralVoiceId: '41d64204-5ced-4019-bec4-98ab1af2d73e', sampleUrl: '/voices/nl_Ruth_female.mp3' },

  // ── Hindi (6) ──
  { id: 'hi_viraj',     name: 'Viraj',     language: 'hi', gender: 'male',   mistralVoiceId: '8d64aa15-aa57-416a-8b79-48ca54e72685', sampleUrl: '/voices/hi_Viraj_male.mp3' },
  { id: 'hi_aaditya',   name: 'Aaditya',   language: 'hi', gender: 'male',   mistralVoiceId: 'ec3dec08-19c2-445c-a06b-7b1587d3ce65', sampleUrl: '/voices/hi_Aaditya_male.mp3' },
  { id: 'hi_bunty',     name: 'Bunty',     language: 'hi', gender: 'male',   mistralVoiceId: '4810864d-bc52-48fa-bd98-97d74bbc43a9', sampleUrl: '/voices/hi_Bunty_male.mp3' },
  { id: 'hi_kanika',    name: 'Kanika',    language: 'hi', gender: 'female', mistralVoiceId: '8dfc9345-ba80-4f88-91e8-92205ca53807', sampleUrl: '/voices/hi_Kanika_female.mp3' },
  { id: 'hi_tripti',    name: 'Tripti',    language: 'hi', gender: 'female', mistralVoiceId: 'd1df2044-5b13-4cbc-9c07-570342a580f2', sampleUrl: '/voices/hi_Tripti_female.mp3' },
  { id: 'hi_sara',      name: 'Sara',      language: 'hi', gender: 'female', mistralVoiceId: 'aa5e52cd-4260-4ef7-bea6-a30ae66434a5', sampleUrl: '/voices/hi_Sara_female.mp3' },

  // ── Arabic (6) ──
  { id: 'ar_adam',      name: 'Adam',      language: 'ar', gender: 'male',   mistralVoiceId: 'bf0ecf1c-1f6e-47bf-a64c-d83c6ee78725', sampleUrl: '/voices/ar_Adam_male.mp3' },
  { id: 'ar_yousef',    name: 'Yousef',    language: 'ar', gender: 'male',   mistralVoiceId: '414a56c0-f4de-4ec1-8f8a-2bfffe963a1c', sampleUrl: '/voices/ar_Yousef_male.mp3' },
  { id: 'ar_omar',      name: 'Omar',      language: 'ar', gender: 'male',   mistralVoiceId: 'b35622cc-b2ae-4dbf-9c28-277a21585d4a', sampleUrl: '/voices/ar_Omar_male.mp3' },
  { id: 'ar_salma',     name: 'Salma',     language: 'ar', gender: 'female', mistralVoiceId: 'cbf6b6ae-4e88-4cab-aa95-261891957592', sampleUrl: '/voices/ar_Salma_female.mp3' },
  { id: 'ar_saraar',    name: 'Sara',      language: 'ar', gender: 'female', mistralVoiceId: 'afc7b096-cc10-48dd-9b41-a1add4e8a665', sampleUrl: '/voices/ar_SaraAR_female.mp3' },
  { id: 'ar_yasmine',   name: 'Yasmine',   language: 'ar', gender: 'female', mistralVoiceId: 'b106c1c5-2ec2-4576-b634-9cff6099abcf', sampleUrl: '/voices/ar_Yasmine_female.mp3' },

  // Filipino (fil), Indonesian (id), Korean (ko) and Cebuano/Bisaya (ceb) are
  // served by Gemini TTS, which uses its own language-agnostic voice registry
  // (src/data/geminiVoices.ts) — they have no Voxtral voice entries here.
]

export function getVoicesForLanguage(lang: string): TutorVoice[] {
  return TUTOR_VOICES.filter((v) => v.language === lang)
}
