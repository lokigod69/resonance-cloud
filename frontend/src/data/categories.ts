export interface CategoryGroup {
  label: string
  categories: string[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Essentials',
    categories: [
      'Greetings & Introductions',
      'Food & Dining',
      'Travel & Directions',
      'Family & Relationships',
      'Numbers & Time',
    ],
  },
  {
    label: 'Language Building',
    categories: [
      'Verbs (Actions)',
      'Adjectives (Descriptions)',
      'Nouns (Things)',
      'Idioms & Expressions',
    ],
  },
  {
    label: 'Real Talk',
    categories: [
      'Slang & Street Language',
      'Romantic & Flirting',
      'Drinking & Nightlife',
      'Texting & Internet',
      'Playful Insults',
      'Taboo & Swearing',
    ],
  },
  {
    label: 'Cultural',
    categories: [
      'Proverbs & Wisdom',
      'Untranslatable Words',
      'Philosophical Concepts',
      'Poetic & Literary',
      'Humor & Wordplay',
    ],
  },
  {
    label: 'Fun & Unique',
    categories: [
      'Tongue Twisters',
      'Onomatopoeia (Sound Words)',
      'Famous Quotes',
      'Compliments & Flattery',
    ],
  },
  {
    label: 'Practical',
    categories: [
      'Negotiation & Haggling',
      'Emergencies',
      'Complaining & Frustration',
      'Emotional Nuance',
    ],
  },
  {
    label: 'Surprise Me',
    categories: ['Random Mix'],
  },
]
