export const LANGUAGES = [
  { value: 'German',     label: 'Deutsch',          flag: '\ud83c\udde9\ud83c\uddea', color: '#f59e0b' },
  { value: 'French',     label: 'Fran\u00e7ais',    flag: '\ud83c\uddeb\ud83c\uddf7', color: '#3b82f6' },
  { value: 'Italian',    label: 'Italiano',          flag: '\ud83c\uddee\ud83c\uddf9', color: '#22c55e' },
  { value: 'English',    label: 'English',           flag: '\ud83c\uddec\ud83c\udde7', color: '#6366f1' },
  { value: 'Bisaya',     label: 'Bisaya',            flag: '\ud83c\uddf5\ud83c\udded', color: '#ef4444' },
  { value: 'Indonesian', label: 'Bahasa Indonesia',  flag: '\ud83c\uddee\ud83c\udde9', color: '#f97316' },
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
    group: 'Photographic',
    styles: [
      { value: 'photorealistic', label: 'Photorealistic' },
      { value: 'noir', label: 'Film Noir' },
      { value: 'vintage_film', label: 'Vintage Film' },
      { value: 'double_exposure', label: 'Double Exposure' },
      { value: 'polaroid', label: 'Polaroid' },
    ],
  },
  {
    group: 'Classic Fine Art',
    styles: [
      { value: 'oil_painting', label: 'Oil Painting' },
      { value: 'watercolor', label: 'Watercolor' },
      { value: 'impressionism', label: 'Impressionism' },
      { value: 'expressionism', label: 'Expressionism' },
      { value: 'surrealism', label: 'Surrealism' },
      { value: 'cubism', label: 'Cubism' },
      { value: 'renaissance', label: 'Renaissance' },
      { value: 'pop_art', label: 'Pop Art' },
      { value: 'chiaroscuro', label: 'Chiaroscuro' },
    ],
  },
  {
    group: 'Decorative & Regional',
    styles: [
      { value: 'art_nouveau', label: 'Art Nouveau' },
      { value: 'art_deco', label: 'Art Deco' },
      { value: 'ukiyo_e', label: 'Ukiyo-e' },
      { value: 'chinese_ink_wash', label: 'Chinese Ink Wash' },
    ],
  },
  {
    group: 'Animation & Shows',
    styles: [
      { value: 'studio_ghibli', label: 'Studio Ghibli' },
      { value: 'disney_animation', label: 'Disney Animation' },
      { value: 'pixar_3d', label: 'Pixar 3D' },
      { value: 'anime', label: 'Anime' },
      { value: 'comic_book', label: 'Comic Book' },
      { value: 'one_piece_style', label: 'One Piece' },
      { value: 'dragon_ball_style', label: 'Dragon Ball' },
      { value: 'south_park_style', label: 'South Park' },
      { value: 'rick_and_morty_style', label: 'Rick and Morty' },
      { value: 'blue_eyed_samurai', label: 'Blue Eye Samurai' },
      { value: 'invincible', label: 'Invincible' },
    ],
  },
  {
    group: 'Digital & Retro',
    styles: [
      { value: 'pixel_art', label: 'Pixel Art' },
      { value: 'synthwave', label: 'Synthwave' },
      { value: 'cyberpunk', label: 'Cyberpunk' },
      { value: 'vaporwave', label: 'Vaporwave' },
      { value: 'retro_90s', label: 'Retro 90s' },
      { value: 'glitch_art', label: 'Glitch Art' },
    ],
  },
  {
    group: 'Craft & Tactile',
    styles: [
      { value: 'knitted', label: 'Knitted' },
      { value: 'claymation', label: 'Claymation' },
      { value: 'origami', label: 'Origami' },
      { value: 'stained_glass', label: 'Stained Glass' },
    ],
  },
  {
    group: 'Illustration & Drawing',
    styles: [
      { value: 'pen_and_ink', label: 'Pen and Ink' },
      { value: 'charcoal_sketch', label: 'Charcoal Sketch' },
      { value: 'engraving', label: 'Engraving' },
      { value: 'botanical_illustration', label: 'Botanical Illustration' },
      { value: 'storybook', label: 'Storybook Illustration' },
    ],
  },
  {
    group: 'Artist-Inspired',
    styles: [
      { value: 'van_gogh', label: 'Van Gogh' },
      { value: 'banksy', label: 'Banksy' },
      { value: 'escher', label: 'Escher' },
      { value: 'klimt', label: 'Klimt' },
      { value: 'gerhard_richter', label: 'Gerhard Richter' },
    ],
  },
  {
    group: 'Genre & Fantasy',
    styles: [
      { value: 'steampunk', label: 'Steampunk' },
      { value: 'fantasy_art', label: 'Fantasy Art' },
      { value: 'collage', label: 'Collage' },
      { value: 'lego_voxel', label: 'Lego / Voxel' },
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
