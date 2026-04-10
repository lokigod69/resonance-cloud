export interface CategoryGroup {
  label: string
  emoji: string
  categories: { name: string; emoji: string }[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Surprise Me',
    emoji: '🎲',
    categories: [{ name: 'Random Mix', emoji: '🎲' }],
  },
  {
    label: 'Essentials',
    emoji: '🎯',
    categories: [
      { name: 'Greetings & Introductions', emoji: '👋' },
      { name: 'Food & Dining', emoji: '🍽️' },
      { name: 'Travel & Directions', emoji: '✈️' },
      { name: 'Family & Relationships', emoji: '👨‍👩‍👧' },
      { name: 'Numbers & Time', emoji: '🔢' },
    ],
  },
  {
    label: 'Language Building',
    emoji: '📚',
    categories: [
      { name: 'Verbs (Actions)', emoji: '🏃' },
      { name: 'Adjectives (Descriptions)', emoji: '🎨' },
      { name: 'Nouns (Things)', emoji: '📦' },
      { name: 'Idioms & Expressions', emoji: '💬' },
    ],
  },
  {
    label: 'Real Talk',
    emoji: '🍻',
    categories: [
      { name: 'Slang & Street Language', emoji: '🔥' },
      { name: 'Romantic & Flirting', emoji: '💕' },
      { name: 'Drinking & Nightlife', emoji: '🍸' },
      { name: 'Texting & Internet', emoji: '📱' },
      { name: 'Playful Insults', emoji: '😜' },
      { name: 'Taboo & Swearing', emoji: '🤬' },
    ],
  },
  {
    label: 'Cultural',
    emoji: '🦉',
    categories: [
      { name: 'Proverbs & Wisdom', emoji: '🦉' },
      { name: 'Untranslatable Words', emoji: '🌟' },
      { name: 'Philosophical Concepts', emoji: '🧘' },
      { name: 'Poetic & Literary', emoji: '📜' },
      { name: 'Humor & Wordplay', emoji: '😂' },
    ],
  },
  {
    label: 'Fun & Unique',
    emoji: '🎪',
    categories: [
      { name: 'Tongue Twisters', emoji: '👅' },
      { name: 'Onomatopoeia (Sound Words)', emoji: '💥' },
      { name: 'Famous Quotes', emoji: '✨' },
      { name: 'Compliments & Flattery', emoji: '💐' },
    ],
  },
  {
    label: 'Practical',
    emoji: '🧰',
    categories: [
      { name: 'Negotiation & Haggling', emoji: '🤝' },
      { name: 'Emergencies', emoji: '🚨' },
      { name: 'Complaining & Frustration', emoji: '😤' },
      { name: 'Emotional Nuance', emoji: '🎭' },
    ],
  },
]
