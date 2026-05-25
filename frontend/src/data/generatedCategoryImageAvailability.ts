// Generated thematic curriculum image sets copied from finalized OpenAI outputs.
// Legacy curated curriculum images remain under public/curriculum/categories.
export const GENERATED_CATEGORY_IMAGE_HERO_TERMS = {
  animals: 'dog',
  fruits: 'apple',
  vegetables: 'carrot',
  nuts_seeds: 'almond',
  home_objects: 'chair',
  body_health: 'head',
  clothing_appearance: 'shirt',
} as const

export type GeneratedCategoryImageCategory = keyof typeof GENERATED_CATEGORY_IMAGE_HERO_TERMS

export const GENERATED_CATEGORY_IMAGE_CATEGORIES = new Set<string>(
  Object.keys(GENERATED_CATEGORY_IMAGE_HERO_TERMS),
)
