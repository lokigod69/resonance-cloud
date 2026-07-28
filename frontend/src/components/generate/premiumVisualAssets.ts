import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
  PremiumInfographicStyle,
  ProductLane,
} from './useWizardState'

export const PREMIUM_STYLE_SAMPLE_BASE_PATH = '/premium-style-samples'

export const PREMIUM_STYLE_SAMPLE_PATHS: Record<CardLayer2ArtStyle, string> = {
  realistic: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/realistic.webp`,
  cinematic: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/cinematic.webp`,
  editorial: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/editorial.webp`,
  illustration: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/illustration.webp`,
  anime: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/anime.webp`,
  studio_ghibli_inspired: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/studio_ghibli_inspired.webp`,
  disney_animation_inspired: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/disney_animation_inspired.webp`,
  comic_book: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/comic_book.webp`,
  pixel_art: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/pixel_art.webp`,
  vintage_film: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/vintage_film.webp`,
  oil_painting: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/oil_painting.webp`,
  surrealism: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/surrealism.webp`,
  fantasy_art: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/fantasy_art.webp`,
  pen_and_ink: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/pen_and_ink.webp`,
  charcoal_sketch: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/charcoal_sketch.webp`,
  claymation: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/claymation.webp`,
  ukiyo_e: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/ukiyo_e.webp`,
  south_park_style: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/south_park_style.webp`,
  rick_and_morty_style: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/rick_and_morty_style.webp`,
  pixar_3d: `${PREMIUM_STYLE_SAMPLE_BASE_PATH}/pixar_3d.webp`,
}

export function premiumStyleSamplePath(style: CardLayer2ArtStyle): string {
  return PREMIUM_STYLE_SAMPLE_PATHS[style]
}

// Generated brand-style sample art for the meaning/presentation option orbs
// (gpt-image-2 batch, cosmos palette). Same filename-per-enum contract as the
// art-style samples above; test-premium-style-assets.ts asserts existence.
export const PREMIUM_OPTION_SAMPLE_BASE_PATH = '/premium-option-samples'

export const MEANING_STRATEGY_SAMPLE_PATHS: Record<CardLayer2MeaningStrategy, string> = {
  clear_meaning: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/clear_meaning.webp`,
  exaggerated_meaning: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/exaggerated_meaning.webp`,
  absurd_hook: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/absurd_hook.webp`,
  sound_mnemonic: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/sound_mnemonic.webp`,
}

export const PRESENTATION_FORM_SAMPLE_PATHS: Record<CardLayer2PresentationForm, string> = {
  single_scene: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/single_scene.webp`,
  mini_story: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/mini_story.webp`,
  split_panel: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/split_panel.webp`,
  word_object_design: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/word_object_design.webp`,
  infographic_card: `${PREMIUM_OPTION_SAMPLE_BASE_PATH}/infographic_card.webp`,
}

export const PRODUCT_LANE_VISUAL_TONES: Record<ProductLane, string> = {
  video: 'video',
  card_standard: 'standard',
  card_premium: 'premium',
  card_text: 'word',
}

export const MEANING_STRATEGY_VISUAL_TONES: Record<CardLayer2MeaningStrategy, string> = {
  clear_meaning: 'clear',
  exaggerated_meaning: 'exaggerated',
  absurd_hook: 'weird',
  sound_mnemonic: 'mnemonic',
}

export const PRESENTATION_FORM_VISUAL_TONES: Record<CardLayer2PresentationForm, string> = {
  single_scene: 'scene',
  mini_story: 'story',
  split_panel: 'split',
  word_object_design: 'word',
  infographic_card: 'infographic',
}

export const INFOGRAPHIC_STYLE_VISUAL_TONES: Record<PremiumInfographicStyle, string> = {
  auto: 'infographic',
  study_poster: 'study',
  visual_dictionary: 'dictionary',
  language_atlas: 'atlas',
  museum_exhibit: 'museum',
  dense_encyclopedia: 'dense',
}
