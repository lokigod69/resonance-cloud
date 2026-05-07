import type {
  CardLayer2ArtStyle,
  CardLayer2MeaningStrategy,
  CardLayer2PresentationForm,
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

export const PRODUCT_LANE_VISUAL_TONES: Record<ProductLane, string> = {
  video: 'video',
  card_standard: 'standard',
  card_premium: 'premium',
}

export const MEANING_STRATEGY_VISUAL_TONES: Record<CardLayer2MeaningStrategy, string> = {
  clear_meaning: 'clear',
  exaggerated_meaning: 'exaggerated',
  absurd_hook: 'weird',
  sound_mnemonic: 'mnemonic',
}

export const MEANING_STRATEGY_UI_LABELS: Record<CardLayer2MeaningStrategy, string> = {
  clear_meaning: 'Clear',
  exaggerated_meaning: 'Exaggerated',
  absurd_hook: 'Weird',
  sound_mnemonic: 'Mnemonic',
}

export const PRESENTATION_FORM_UI_LABELS: Record<CardLayer2PresentationForm, string> = {
  single_scene: 'Single Scene',
  mini_story: 'Mini Story',
  split_panel: 'Split Panel',
  word_object_design: 'Word Design',
  infographic_card: 'Infographic',
}

export const PRESENTATION_FORM_VISUAL_TONES: Record<CardLayer2PresentationForm, string> = {
  single_scene: 'scene',
  mini_story: 'story',
  split_panel: 'split',
  word_object_design: 'word',
  infographic_card: 'infographic',
}

export const MEANING_STRATEGY_HELPERS: Record<CardLayer2MeaningStrategy, string> = {
  clear_meaning: 'Meaning-first',
  exaggerated_meaning: 'Stronger emphasis',
  absurd_hook: 'Strange hook',
  sound_mnemonic: 'Memory bridge',
}

export const PRESENTATION_FORM_HELPERS: Record<CardLayer2PresentationForm, string> = {
  single_scene: 'One moment',
  mini_story: '2-3 beats',
  split_panel: 'Contrast',
  word_object_design: 'Word object',
  infographic_card: 'Study poster',
}
