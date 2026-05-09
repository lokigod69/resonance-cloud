// IMPORTANT: `name` values are the API contract sent to /api/suggest-words
// (and used in backend prompts). They must remain in stable English. The
// `labelKey` / `groupKey` fields are i18n lookups for display only — the
// English `name` / `label` fields stay as English fallbacks via t().
export interface Category {
  name: string
  emoji: string
  labelKey: string
}

export interface CategoryGroup {
  label: string
  emoji: string
  groupKey: string
  categories: Category[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Surprise Me',
    groupKey: 'category.group.surpriseMe',
    emoji: '🎲',
    categories: [
      { name: 'Random Mix', emoji: '🎲', labelKey: 'category.randomMix' },
    ],
  },
  {
    label: 'Essentials',
    groupKey: 'category.group.essentials',
    emoji: '🎯',
    categories: [
      { name: 'Greetings & Introductions', emoji: '👋', labelKey: 'category.greetings' },
      { name: 'Food & Dining', emoji: '🍽️', labelKey: 'category.foodDining' },
      { name: 'Travel & Directions', emoji: '✈️', labelKey: 'category.travelDirections' },
      { name: 'Family & Relationships', emoji: '👨‍👩‍👧', labelKey: 'category.familyRelationships' },
      { name: 'Numbers & Time', emoji: '🔢', labelKey: 'category.numbersTime' },
    ],
  },
  {
    label: 'Language Building',
    groupKey: 'category.group.languageBuilding',
    emoji: '📚',
    categories: [
      { name: 'Verbs (Actions)', emoji: '🏃', labelKey: 'category.verbs' },
      { name: 'Adjectives (Descriptions)', emoji: '🎨', labelKey: 'category.adjectives' },
      { name: 'Nouns (Things)', emoji: '📦', labelKey: 'category.nouns' },
      { name: 'Idioms & Expressions', emoji: '💬', labelKey: 'category.idioms' },
    ],
  },
  {
    label: 'Real Talk',
    groupKey: 'category.group.realTalk',
    emoji: '🍻',
    categories: [
      { name: 'Slang & Street Language', emoji: '🔥', labelKey: 'category.slangStreet' },
      { name: 'Romantic & Flirting', emoji: '💕', labelKey: 'category.romanticFlirting' },
      { name: 'Drinking & Nightlife', emoji: '🍸', labelKey: 'category.drinkingNightlife' },
      { name: 'Texting & Internet', emoji: '📱', labelKey: 'category.textingInternet' },
      { name: 'Playful Insults', emoji: '😜', labelKey: 'category.playfulInsults' },
      { name: 'Taboo & Swearing', emoji: '🤬', labelKey: 'category.tabooSwearing' },
    ],
  },
  {
    label: 'Cultural',
    groupKey: 'category.group.cultural',
    emoji: '🦉',
    categories: [
      { name: 'Proverbs & Wisdom', emoji: '🦉', labelKey: 'category.proverbs' },
      { name: 'Untranslatable Words', emoji: '🌟', labelKey: 'category.untranslatable' },
      { name: 'Philosophical Concepts', emoji: '🧘', labelKey: 'category.philosophical' },
      { name: 'Poetic & Literary', emoji: '📜', labelKey: 'category.poetic' },
      { name: 'Humor & Wordplay', emoji: '😂', labelKey: 'category.humorWordplay' },
    ],
  },
  {
    label: 'Fun & Unique',
    groupKey: 'category.group.funUnique',
    emoji: '🎪',
    categories: [
      { name: 'Tongue Twisters', emoji: '👅', labelKey: 'category.tongueTwisters' },
      { name: 'Onomatopoeia (Sound Words)', emoji: '💥', labelKey: 'category.onomatopoeia' },
      { name: 'Famous Quotes', emoji: '✨', labelKey: 'category.famousQuotes' },
      { name: 'Compliments & Flattery', emoji: '💐', labelKey: 'category.compliments' },
    ],
  },
  {
    label: 'Practical',
    groupKey: 'category.group.practical',
    emoji: '🧰',
    categories: [
      { name: 'Negotiation & Haggling', emoji: '🤝', labelKey: 'category.negotiation' },
      { name: 'Emergencies', emoji: '🚨', labelKey: 'category.emergencies' },
      { name: 'Complaining & Frustration', emoji: '😤', labelKey: 'category.complaining' },
      { name: 'Emotional Nuance', emoji: '🎭', labelKey: 'category.emotionalNuance' },
    ],
  },
]
