// Static data for the landing page sections
// Language names used in DEMO_WORDS must be resolvable by FlagIcon's LANG_NAME_MAP
type DemoLanguage = 'French' | 'German' | 'English' | 'Italian' | 'Spanish' | 'Portuguese' | 'Dutch' | 'Hindi' | 'Arabic' | 'Filipino' | 'Tagalog' | 'Bisaya' | 'Indonesian' | 'Korean'
// Thumbnails and videos served from Supabase Storage (public bucket)

const SB = 'https://rkiucrrusrwgcviodysp.supabase.co/storage/v1/object/public/videos'

function thumb(userId: string, deckId: string, slug: string) {
  return `${SB}/${userId}/${deckId}/${slug}/thumb.jpg`
}
function vid(userId: string, deckId: string, slug: string) {
  return `${SB}/${userId}/${deckId}/${slug}/video.mp4`
}

// User/deck IDs for showcase content
const U1 = '8e2a8380-8822-46a4-9190-9c34c6313fd1'
const U2 = 'ef7a3c72-69cf-42a6-8c5f-2592f99c56f7'
const D_FR1 = '5fb91369-c4cf-479a-b9ee-886dc6e2d093'
const D_DE1 = '80482d3e-b7f8-4844-8105-6827771427fc'
const D_FR2 = '008ba7fd-65af-4730-9933-2e53ac072379'
const D_EN = '631b2cea-66b5-4969-b7fc-7ed722ad1301'
const D_DE2 = '8190dd5d-09f8-4728-bec0-eead7d6d6445'  // U2 German: furz, frigide, lahmarschig
const D_DE3 = '3c060627-befa-4337-a51e-ceb127c9d284'  // U2 German: ferkelchen
const D_EN2 = '5944c032-2c2d-4ed4-93ff-95db27a092a8'  // U1 English: garbage-truck
const D_FR3 = '0437adf6-91ed-4d8f-9172-ae37e66c0a6a'  // U1 French: oublier

// TODO: Consider a more abstract/atmospheric hero video without large in-video text
export const HERO_VIDEO_URL = vid(U2, D_FR2, 'riviere')

export const DEMO_WORDS: { word: string; translation: string; language: DemoLanguage; thumbnail: string; videoUrl: string }[] = [
  { word: 'ciel', translation: 'sky', language: 'French', thumbnail: thumb(U2, D_FR2, 'ciel'), videoUrl: vid(U2, D_FR2, 'ciel') },
  { word: 'Fuchs', translation: 'fox', language: 'German', thumbnail: thumb(U1, D_DE1, 'fuchs'), videoUrl: vid(U1, D_DE1, 'fuchs') },
  { word: 'furz', translation: 'fart', language: 'German', thumbnail: thumb(U2, D_DE2, 'furz'), videoUrl: vid(U2, D_DE2, 'furz') },
  { word: 'Peur', translation: 'fear', language: 'French', thumbnail: thumb(U1, D_FR1, 'peur'), videoUrl: vid(U1, D_FR1, 'peur') },
  { word: 'ferocious', translation: 'wild', language: 'English', thumbnail: thumb(U2, D_EN, 'ferocious'), videoUrl: vid(U2, D_EN, 'ferocious') },
  { word: 'liberté', translation: 'freedom', language: 'French', thumbnail: thumb(U2, D_FR2, 'liberte'), videoUrl: vid(U2, D_FR2, 'liberte') },
  { word: 'garbage truck', translation: 'garbage truck', language: 'English', thumbnail: thumb(U1, D_EN2, 'garbage-truck'), videoUrl: vid(U1, D_EN2, 'garbage-truck') },
  { word: 'oublier', translation: 'to forget', language: 'French', thumbnail: thumb(U1, D_FR3, 'oublier'), videoUrl: vid(U1, D_FR3, 'oublier') },
  { word: 'Ferkelchen', translation: 'piglet', language: 'German', thumbnail: thumb(U2, D_DE3, 'ferkelchen'), videoUrl: vid(U2, D_DE3, 'ferkelchen') },
  { word: 'frigide', translation: 'frigid', language: 'German', thumbnail: thumb(U2, D_DE2, 'frigide'), videoUrl: vid(U2, D_DE2, 'frigide') },
  { word: 'chameau', translation: 'camel', language: 'French', thumbnail: thumb(U2, D_FR2, 'chameau'), videoUrl: vid(U2, D_FR2, 'chameau') },
  { word: 'lahmarschig', translation: 'sluggish', language: 'German', thumbnail: thumb(U2, D_DE2, 'lahmarschig'), videoUrl: vid(U2, D_DE2, 'lahmarschig') },
]

export const LANGUAGES = [
  { label: 'German',     code: 'de',  color: '#FFD700' },
  { label: 'French',     code: 'fr',  color: '#4A90D9' },
  { label: 'Italian',    code: 'it',  color: '#4CAF50' },
  { label: 'English',    code: 'en',  color: '#E53935' },
  { label: 'Tagalog',    code: 'fil', color: '#FF6B35' },
  { label: 'Bisaya',     code: 'ceb', color: '#AB47BC' },
  { label: 'Indonesian', code: 'id',  color: '#009688' },
  { label: 'Dutch',      code: 'nl',  color: '#E65100' },
  { label: 'Spanish',    code: 'es',  color: '#C62828' },
  { label: 'Hindi',      code: 'hi',  color: '#F9A825' },
]

export const TUTOR_MOCK_CONVERSATION = [
  { role: 'user', text: 'Ich möchte ein Bier bestellen, bitte.' },
  { role: 'assistant', text: 'Sehr gut! Du könntest auch sagen: "Ich hätte gerne ein Bier." Das klingt etwas höflicher. Möchtest du das im Restaurant üben?' },
  { role: 'user', text: 'Ja, ich hätte gerne ein Bier und eine Brezel.' },
  { role: 'assistant', text: 'Fast perfekt! Es heißt "eine Brezel" — und du hast es richtig gesagt! 🥨 Was möchtest du noch bestellen?' },
]

export const TUTOR_MOCK_LANGUAGE = { label: 'German', code: 'de' }

export const STEPS = [
  {
    title: 'Type your words',
    description: 'Choose a language, type your vocabulary, pick a style.',
  },
  {
    title: 'AI creates your video',
    description: 'AI composes a song, generates images, and assembles a unique music video for every word.',
  },
  {
    title: 'Watch & remember',
    description: 'Study with built-in tools. Multi-sensory learning that sticks.',
  },
]
