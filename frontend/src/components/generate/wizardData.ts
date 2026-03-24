export const LANGUAGES = [
  { value: 'German', label: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
  { value: 'French', label: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { value: 'Italian', label: 'Italiano', flag: '\ud83c\uddee\ud83c\uddf9' },
  { value: 'English', label: 'English', flag: '\ud83c\uddec\ud83c\udde7' },
  { value: 'Bisaya', label: 'Bisaya', flag: '\ud83c\uddf5\ud83c\udded' },
] as const

export const VIBES = [
  { value: 'auto', label: 'Auto', description: 'AI picks the best direction per word' },
  { value: 'literal', label: 'Literal', description: 'Clean, obvious imagery' },
  { value: 'cinematic', label: 'Cinematic', description: 'Dramatic scenes, moody lighting' },
  { value: 'provocative', label: 'Provocative', description: 'Bold, attention-grabbing' },
  { value: 'movie', label: 'Movie', description: 'AI picks a film to theme it after' },
  { value: 'specific_movie', label: 'Specific Movie', description: 'You choose the exact film' },
] as const

export interface ArtStyle {
  value: string
  label: string
}

export interface ArtStyleGroup {
  group: string
  styles: ArtStyle[]
}

export const ART_STYLE_GROUPS: ArtStyleGroup[] = [
  {
    group: 'Classic & Fine Art',
    styles: [
      { value: 'photorealistic', label: 'Photorealistic' },
      { value: 'oil_painting', label: 'Oil Painting' },
      { value: 'watercolor', label: 'Watercolor' },
      { value: 'renaissance', label: 'Renaissance' },
      { value: 'impressionist', label: 'Impressionist' },
      { value: 'expressionist', label: 'Expressionist' },
      { value: 'art_nouveau', label: 'Art Nouveau' },
      { value: 'art_deco', label: 'Art Deco' },
      { value: 'chiaroscuro', label: 'Chiaroscuro' },
      { value: 'ukiyo_e', label: 'Ukiyo-e' },
    ],
  },
  {
    group: 'Modern & Graphic',
    styles: [
      { value: 'comic_book', label: 'Comic Book' },
      { value: 'pop_art', label: 'Pop Art' },
      { value: 'bauhaus', label: 'Bauhaus' },
      { value: 'minimalist', label: 'Minimalist' },
      { value: 'flat_design', label: 'Flat Design' },
      { value: 'geometric_abstract', label: 'Geometric Abstract' },
      { value: 'collage', label: 'Collage' },
    ],
  },
  {
    group: 'Illustration & Fantasy',
    styles: [
      { value: 'studio_ghibli', label: 'Studio Ghibli' },
      { value: 'disney_animation', label: 'Disney Animation' },
      { value: 'anime', label: 'Anime / Cel Shading' },
      { value: 'storybook', label: 'Storybook Illustration' },
      { value: 'fantasy_art', label: 'Fantasy Art' },
      { value: 'cyberpunk', label: 'Cyberpunk' },
      { value: 'steampunk', label: 'Steampunk' },
      { value: 'surrealist', label: 'Surrealist' },
    ],
  },
  {
    group: 'Texture & Craft',
    styles: [
      { value: 'knitted', label: 'Knitted / Crochet' },
      { value: 'paper_cut', label: 'Paper Cut' },
      { value: 'mosaic', label: 'Mosaic' },
      { value: 'stained_glass', label: 'Stained Glass' },
      { value: 'embroidery', label: 'Embroidery' },
      { value: 'lego_voxel', label: 'Lego / Voxel' },
    ],
  },
  {
    group: 'Photography & Film',
    styles: [
      { value: 'vintage_film', label: 'Vintage Film / Polaroid' },
      { value: 'film_noir', label: 'Film Noir (B&W)' },
      { value: 'double_exposure', label: 'Double Exposure' },
      { value: 'synthwave', label: 'Synthwave / Retrowave' },
      { value: 'retro_90s', label: 'Retro 90s' },
    ],
  },
  {
    group: 'Stylized',
    styles: [
      { value: 'pixel_art', label: 'Pixel Art' },
      { value: 'low_poly', label: 'Low Poly' },
      { value: 'sketch', label: 'Sketch / Pencil' },
      { value: 'pen_and_ink', label: 'Pen and Ink' },
      { value: 'charcoal', label: 'Charcoal' },
      { value: 'blue_eyed_samurai', label: 'Blue Eye Samurai' },
      { value: 'invincible', label: 'Invincible' },
      { value: 'big_mouth', label: 'Big Mouth' },
    ],
  },
]

export const GENRES = [
  { value: 'auto', label: 'Auto' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'hip-hop', label: 'Hip-hop' },
  { value: 'classical', label: 'Classical' },
  { value: 'folk', label: 'Folk' },
  { value: 'r&b', label: 'R&B' },
  { value: 'reggae', label: 'Reggae' },
] as const

export const MAX_WORDS = 10

export const STEP_LABELS: Record<number, string> = {
  1: 'Language',
  2: 'Words',
  3: 'Vibe',
  4: 'Art Style',
  5: 'Music',
  6: 'Confirm',
}
