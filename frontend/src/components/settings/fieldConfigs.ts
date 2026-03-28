/**
 * Shared field definitions for all engine settings.
 * Used by both BatchSettings (global defaults) and StageSettings (per-word overrides).
 */

export type FieldType = 'dropdown' | 'combo' | 'slider' | 'toggle' | 'number' | 'text' | 'readonly' | 'lora' | 'voice'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: (string | number)[]
  comboPresets?: (string | number)[]
  comboPresetGroups?: { label: string; items: (string | number)[] }[]
  min?: number
  max?: number
  step?: number
  default?: unknown
  placeholder?: string
  helper?: string
  optionLabels?: Record<string, string>
  advanced?: boolean
  condition?: (settings: Record<string, unknown>) => boolean
  readonlyText?: string | ((settings: Record<string, unknown>) => string)
  sendAsString?: boolean
}

export const STAGE_LABELS: Record<string, string> = {
  images: 'Image Engine',
  concept: 'Concept Engine',
  song: 'Song Engine',
  video: 'Video Engine',
  assembly: 'Assembly Engine',
  bookend: 'Bookend Engine',
}

export const CONCEPT_FIELDS: FieldDef[] = [
  { key: 'vocal_gender', label: 'Vocal Gender', type: 'dropdown', options: ['male', 'female', 'any'], default: 'female' },
  { key: 'lyric_mode', label: 'Lyric Mode', type: 'dropdown', options: ['reliable', 'minimal', 'standard', 'dramatic', 'contextual', 'creative'], default: 'reliable' },
  { key: 'genre', label: 'Genre', type: 'combo', options: ['auto'], default: 'auto' },
  { key: 'caption_style', label: 'Caption Style', type: 'dropdown', options: ['vocal_forward', 'production'], optionLabels: { 'vocal_forward': 'Vocal Forward (pronunciation focus)', 'production': 'Production (full arrangement)' }, default: 'production' },
  { key: 'syllable_chop', label: 'Syllable Chop', type: 'toggle', default: false },
  { key: 'duration', label: 'Duration', type: 'dropdown', options: [15, 20, 30, 60], default: 20 },
  { key: 'visual_hint', label: 'Visual Hint', type: 'toggle', default: false },
  { key: 'use_art_style', label: 'Use Art Style for Music', type: 'toggle', default: false },
  { key: 'llm_model', label: 'LLM Model', type: 'dropdown', options: ['deepseek/deepseek-v3.2', 'deepseek/deepseek-v3.2-speciale', 'deepseek/deepseek-chat-v3-0324', 'moonshotai/kimi-k2.5', 'google/gemini-2.5-flash', 'anthropic/claude-3.5-haiku', 'mistralai/mistral-small'], default: 'deepseek/deepseek-v3.2', optionLabels: { 'deepseek/deepseek-v3.2': 'DeepSeek V3.2', 'deepseek/deepseek-v3.2-speciale': 'DeepSeek V3.2 Speciale', 'deepseek/deepseek-chat-v3-0324': 'DeepSeek V3 (legacy)' }, advanced: true },
  { key: 'llm_temperature', label: 'LLM Temperature', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.7, advanced: true },
]

export const SONG_FIELDS: FieldDef[] = [
  { key: 'duration', label: 'Duration', type: 'dropdown', options: [15, 20, 30, 60], default: 20 },
  { key: 'batch_size', label: 'Batch Size', type: 'slider', min: 1, max: 8, step: 1, default: 4 },
  { key: 'inference_steps', label: 'Inference Steps', type: 'slider', min: 32, max: 100, step: 1, default: 50 },
  { key: 'guidance_scale', label: 'Guidance Scale', type: 'slider', min: 5, max: 10, step: 0.1, default: 8.0 },
  { key: 'shift', label: 'Shift', type: 'slider', min: 1, max: 5, step: 0.1, default: 2.5 },
  { key: 'thinking', label: 'Thinking', type: 'toggle', default: true },
  { key: 'bpm', label: 'BPM', type: 'number', placeholder: 'Leave blank = auto', default: null },
  { key: 'seed', label: 'Seed', type: 'number', default: -1, helper: '-1 = random' },
  { key: 'lora_id', label: 'LoRA Adapter', type: 'lora', default: '', advanced: true },
  { key: 'lora_strength', label: 'LoRA Strength', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.75, advanced: true, condition: s => !!s.lora_id || s.lora_id === '__custom__' },
  { key: 'lora_trigger_phrase', label: 'LoRA Trigger Phrase', type: 'text', default: '', advanced: true, helper: 'Activation tag prepended to music caption.', placeholder: 'de_diction', condition: s => !!s.lora_id || s.lora_id === '__custom__' },
]

export const IMAGE_FIELDS: FieldDef[] = [
  { key: 'creative_direction', label: 'Creative Direction', type: 'dropdown', options: ['auto', 'literal', 'editorial', 'cinematic', 'provocative', 'minimal', 'movie', 'movie_remix'], default: 'auto' },
  { key: 'movie_override', label: 'Movie', type: 'text', placeholder: 'Auto-pick (leave empty)', helper: 'Constrain all scenes to this movie', condition: s => s.creative_direction === 'movie' || s.creative_direction === 'movie_remix' },
  { key: 'visual_reference', label: 'Visual Reference', type: 'dropdown', options: ['auto', 'etymology', 'mnemonic', 'none'], default: 'auto' },
  { key: 'frame_narrative', label: 'Frame Narrative', type: 'dropdown', options: ['auto', 'scale', 'action', 'environment', 'narrative', 'context', 'collection'], default: 'auto' },
  { key: 'image_count', label: 'Image Count', type: 'dropdown', options: ['auto', 1, 2, 3, 4, 5, 6, 7, 8], default: 'auto' },
  { key: 'art_style', label: 'Art Style', type: 'combo', options: ['none', 'auto', 'random'], comboPresetGroups: [
    { label: 'Core', items: ['photorealistic'] },
    { label: 'Classic Fine Art', items: [
      'oil_painting', 'watercolor', 'impressionism', 'expressionist', 'surrealism', 'cubism',
      'renaissance', 'baroque', 'art_nouveau', 'pointillism', 'fauvism', 'minimalism',
      'abstract_art', 'pop_art', 'chiaroscuro',
    ] },
    { label: 'Asian & Traditional', items: ['ukiyo_e', 'chinese_ink_wash', 'persian_miniature', 'folk_art'] },
    { label: 'Animation & Comics', items: [
      'studio_ghibli', 'comic_book', 'manga', 'one_piece_style', 'dragon_ball_style',
      'rick_and_morty_style', 'south_park_style', 'disney_animation', 'pixar_3d', 'cartoon_network',
      'blue_eyed_samurai', 'invincible', 'big_mouth',
    ] },
    { label: 'Digital & Modern', items: [
      'pixel_art', 'synthwave', 'retro_90s', 'vaporwave', 'cyberpunk', 'flat_illustration',
      'graffiti_street_art', 'lowbrow_pop_surrealism', 'futurism', 'glitch_art', 'neon_noir',
    ] },
    { label: 'Craft & Tactile', items: [
      'knitted', 'paper_cut_art', 'origami', 'claymation', 'stained_glass', 'mosaic',
      'embroidery', 'woodblock_print',
    ] },
    { label: 'Photography & Film', items: ['noir', 'vintage_film', 'polaroid', 'daguerreotype', 'double_exposure', 'tilt_shift'] },
    { label: 'Illustration', items: [
      'pen_and_ink', 'charcoal_sketch', 'engraving', 'botanical_illustration', 'doodle',
      'geometric', 'isometric',
    ] },
    { label: 'Artist-Inspired', items: [
      'in_the_style_of_van_gogh', 'in_the_style_of_kandinsky', 'in_the_style_of_gerhard_richter',
      'in_the_style_of_basquiat', 'in_the_style_of_banksy', 'in_the_style_of_monet',
      'in_the_style_of_dali', 'in_the_style_of_hokusai', 'in_the_style_of_warhol',
      'in_the_style_of_picasso', 'in_the_style_of_klimt', 'in_the_style_of_escher',
      'in_the_style_of_mucha', 'in_the_style_of_rothko',
    ] },
    { label: 'Avant-Garde', items: ['constructivism', 'suprematism', 'vorticism', 'de_stijl', 'brutalism'] },
  ], default: 'photorealistic', optionLabels: {
    none: 'None (LLM decides)', auto: 'Auto', random: 'Random (preset)', photorealistic: 'Photorealistic',
    oil_painting: 'Oil Painting', watercolor: 'Watercolor', impressionism: 'Impressionism',
    expressionist: 'Expressionism', surrealism: 'Surrealism', cubism: 'Cubism',
    renaissance: 'Renaissance', baroque: 'Baroque', art_nouveau: 'Art Nouveau',
    pointillism: 'Pointillism', fauvism: 'Fauvism', minimalism: 'Minimalism',
    abstract_art: 'Abstract Art', pop_art: 'Pop Art', chiaroscuro: 'Chiaroscuro',
    ukiyo_e: 'Ukiyo-e', chinese_ink_wash: 'Chinese Ink Wash',
    persian_miniature: 'Persian Miniature', folk_art: 'Folk Art',
    studio_ghibli: 'Studio Ghibli', comic_book: 'Comic Book', manga: 'Manga',
    one_piece_style: 'One Piece Style', dragon_ball_style: 'Dragon Ball Z Style',
    rick_and_morty_style: 'Rick and Morty Style', south_park_style: 'South Park Style',
    disney_animation: 'Disney Animation',
    pixar_3d: 'Pixar 3D', cartoon_network: 'Cartoon Network',
    pixel_art: 'Pixel Art', synthwave: 'Synthwave', retro_90s: 'Retro 90s',
    vaporwave: 'Vaporwave', cyberpunk: 'Cyberpunk', flat_illustration: 'Flat Illustration',
    graffiti_street_art: 'Graffiti / Street Art', lowbrow_pop_surrealism: 'Lowbrow / Pop Surrealism',
    futurism: 'Futurism', glitch_art: 'Glitch Art', neon_noir: 'Neon Noir',
    knitted: 'Knitted', paper_cut_art: 'Paper Cut Art', origami: 'Origami',
    claymation: 'Claymation', stained_glass: 'Stained Glass', mosaic: 'Mosaic',
    embroidery: 'Embroidery', woodblock_print: 'Woodblock Print',
    noir: 'Noir', vintage_film: 'Vintage Film', polaroid: 'Polaroid',
    daguerreotype: 'Daguerreotype', double_exposure: 'Double Exposure', tilt_shift: 'Tilt Shift',
    pen_and_ink: 'Pen and Ink', charcoal_sketch: 'Charcoal Sketch', engraving: 'Engraving',
    botanical_illustration: 'Botanical Illustration', doodle: 'Doodle',
    geometric: 'Geometric', isometric: 'Isometric',
    in_the_style_of_van_gogh: 'Van Gogh Style', in_the_style_of_kandinsky: 'Kandinsky Style',
    in_the_style_of_gerhard_richter: 'Gerhard Richter Style',
    in_the_style_of_basquiat: 'Basquiat Style', in_the_style_of_banksy: 'Banksy Style',
    in_the_style_of_monet: 'Monet Style', in_the_style_of_dali: 'Dalí Style',
    in_the_style_of_hokusai: 'Hokusai Style', in_the_style_of_warhol: 'Warhol Style',
    in_the_style_of_picasso: 'Picasso Style', in_the_style_of_klimt: 'Klimt Style',
    in_the_style_of_escher: 'Escher Style', in_the_style_of_mucha: 'Mucha Style',
    in_the_style_of_rothko: 'Rothko Style',
    constructivism: 'Constructivism', suprematism: 'Suprematism', vorticism: 'Vorticism',
    de_stijl: 'De Stijl', brutalism: 'Brutalism',
  } },
  { key: 'word_in_image', label: 'Word in Image', type: 'toggle', default: true },
  { key: 'image_model', label: 'Image Model', type: 'dropdown', options: ['fast', 'quality'], default: 'quality' },
  { key: 'llm_model', label: 'LLM Model', type: 'dropdown', options: ['deepseek/deepseek-v3.2', 'deepseek/deepseek-v3.2-speciale', 'google/gemini-3.1-flash-lite-preview', 'x-ai/grok-4.1-fast'], default: 'deepseek/deepseek-v3.2', advanced: true },
]

export const isKling = (s: Record<string, unknown>) =>
  s.video_mode === 'kling_standard' || s.video_mode === 'kling_pro'

export const isLtx = (s: Record<string, unknown>) =>
  s.video_mode === 'ltx_fast' || s.video_mode === 'ltx_pro' || s.video_mode === 'ltx'

export const VIDEO_FIELDS: FieldDef[] = [
  { key: 'video_mode', label: 'Video Mode', type: 'dropdown', options: ['ken_burns', 'ltx_fast', 'ltx_pro', 'kling_standard', 'kling_pro'], default: 'ltx_fast', optionLabels: { ken_burns: 'Ken Burns', ltx_fast: 'LTX 2.3 Fast', ltx_pro: 'LTX 2.3 Pro', kling_standard: 'Kling Standard', kling_pro: 'Kling Pro' } },
  // ken_burns
  { key: 'duration', label: 'Duration', type: 'slider', min: 3, max: 30, step: 1, default: 5, condition: s => s.video_mode === 'ken_burns' },
  { key: 'fps', label: 'FPS', type: 'readonly', readonlyText: '25 fps (fixed)', condition: s => s.video_mode === 'ken_burns' },
  // ltx
  { key: 'duration', label: 'Duration', type: 'slider', min: 6, max: 10, step: 1, default: 6, condition: isLtx },
  { key: 'resolution', label: 'Resolution', type: 'dropdown', options: ['1080p', '1440p', '2160p'], default: '1080p', condition: isLtx },
  { key: 'fps', label: 'FPS', type: 'readonly', readonlyText: '25 fps', condition: isLtx },
  { key: 'text_to_video', label: 'Text-to-Video', type: 'toggle', default: false, helper: 'Generate video from text prompts only — no images. The storyboard LLM creates scene descriptions optimized for AI video generation.', condition: isLtx },
  { key: 'frame_transitions', label: 'Frame Transitions', type: 'toggle', default: false, helper: 'Enable transitions between frames', condition: (s: Record<string, unknown>) => isLtx(s) && !s.text_to_video },
  { key: 'transition_mode', label: 'Transition Mode', type: 'dropdown', options: ['all_cut', 'morph_then_cut', 'cut_then_morph', 'all_morph', 'auto'], optionLabels: { all_cut: 'All Cut', morph_then_cut: 'Morph then Cut', cut_then_morph: 'Cut then Morph', all_morph: 'All Morph', auto: 'Auto' }, default: 'all_cut', helper: 'How scenes connect: morphing transitions or hard cuts', condition: (s: Record<string, unknown>) => isLtx(s) && !s.text_to_video && s.frame_transitions === true },
  { key: 'motion_type', label: 'Camera Motion', type: 'dropdown', options: ['auto', 'slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down', 'dolly_in', 'dolly_out', 'orbit_left', 'orbit_right', 'tracking_left', 'tracking_right', 'crane_up', 'crane_down', 'push_in', 'pull_out', 'handheld', 'static'], optionLabels: { auto: 'Auto (from storyboard)', slow_zoom_in: 'Slow Zoom In', slow_zoom_out: 'Slow Zoom Out', pan_left: 'Pan Left', pan_right: 'Pan Right', pan_up: 'Pan Up', pan_down: 'Pan Down', dolly_in: 'Dolly In', dolly_out: 'Dolly Out', orbit_left: 'Orbit Left', orbit_right: 'Orbit Right', tracking_left: 'Tracking Left', tracking_right: 'Tracking Right', crane_up: 'Crane Up', crane_down: 'Crane Down', push_in: 'Push In', pull_out: 'Pull Out', handheld: 'Handheld', static: 'Static' }, default: 'auto', helper: 'Auto uses per-scene camera motion from storyboard' },
  { key: 'motion_speed', label: 'Motion Speed', type: 'dropdown', options: ['very_slow', 'slow', 'medium', 'fast'], optionLabels: { very_slow: 'Very Slow', slow: 'Slow', medium: 'Medium', fast: 'Fast' }, default: 'slow', condition: (s: Record<string, unknown>): boolean => !!(s.motion_type && s.motion_type !== 'auto' && s.motion_type !== 'static') },
  // kling
  { key: 'duration', label: 'Duration', type: 'dropdown', options: ['5', '10'], default: '5', sendAsString: true, condition: isKling },
  { key: 'fps', label: 'Resolution & FPS', type: 'readonly', readonlyText: 'Determined by Kling', condition: isKling },
  // advanced (all modes)
  { key: 'negative_prompt', label: 'Negative Prompt', type: 'text', default: 'blur, distort, and low quality', advanced: true },
  { key: 'cfg_scale', label: 'CFG Scale', type: 'slider', min: 0, max: 1, step: 0.05, default: 0.5, advanced: true, condition: isKling },
  { key: 'seed', label: 'Seed', type: 'number', default: -1, helper: '-1 = random', advanced: true },
]

export const ASSEMBLY_FIELDS: FieldDef[] = [
  { key: 'assembly_mode', label: 'Assembly Mode', type: 'dropdown', options: ['clean', 'pedagogic'], default: 'clean' },
  { key: 'gap_strategy', label: 'Gap Strategy', type: 'dropdown', options: ['ping_pong', 'loop', 'fade_black', 'freeze_ken_burns', 'word_card'], default: 'ping_pong' },
  { key: 'overflow_strategy', label: 'Overflow Strategy', type: 'dropdown', options: ['trim', 'fade_audio_black', 'video_full'], default: 'video_full', optionLabels: { trim: 'Trim video to audio', fade_audio_black: 'Fade both to black', video_full: 'Play full video (audio fades)' } },
  { key: 'transition', label: 'Transition', type: 'dropdown', options: ['cut', 'crossfade', 'dip_black'], default: 'cut' },
  { key: 'transition_duration', label: 'Transition Duration', type: 'slider', min: 0.1, max: 2, step: 0.1, default: 0.5 },
  { key: 'silence_trim', label: 'Silence Trim', type: 'toggle', default: true },
  { key: 'lufs_normalize', label: 'LUFS Normalize', type: 'toggle', default: true },
  { key: 'target_lufs', label: 'Target LUFS', type: 'slider', min: -24, max: -8, step: 0.5, default: -14 },
  { key: 'output_resolution', label: 'Output Resolution', type: 'dropdown', options: ['480p', '720p', '1080p'], default: '720p' },
  { key: 'output_fps', label: 'Output FPS', type: 'dropdown', options: [24, 25, 30], default: 24 },
  // word card — pedagogic only
  { key: 'word_card_duration', label: 'Word Card Duration', type: 'slider', min: 1, max: 5, step: 0.5, default: 2.0, condition: s => s.assembly_mode === 'pedagogic' },
  { key: 'word_card_show_translation', label: 'Show Translation', type: 'toggle', default: false, condition: s => s.assembly_mode === 'pedagogic' },
  { key: 'word_card_color', label: 'Word Card Color', type: 'combo', options: ['auto', 'white'], default: 'auto', condition: s => s.assembly_mode === 'pedagogic' },
  // advanced
  { key: 'silence_threshold_db', label: 'Silence Threshold (dB)', type: 'slider', min: -60, max: -20, step: 1, default: -40, advanced: true },
  { key: 'word_card_font', label: 'Word Card Font', type: 'text', default: 'Noto Sans', advanced: true },
  { key: 'word_card_font_size', label: 'Word Card Font Size', type: 'number', default: 72, advanced: true },
  { key: 'video_codec', label: 'Video Codec', type: 'dropdown', options: ['libx264', 'libx265'], default: 'libx264', advanced: true },
  { key: 'video_preset', label: 'Video Preset', type: 'dropdown', options: ['medium', 'slow', 'slower', 'veryslow'], default: 'slow', advanced: true },
  { key: 'video_crf', label: 'Video CRF', type: 'slider', min: 0, max: 51, step: 1, default: 18, advanced: true },
  { key: 'audio_codec', label: 'Audio Codec', type: 'dropdown', options: ['aac', 'libopus'], default: 'aac', advanced: true },
  { key: 'audio_bitrate', label: 'Audio Bitrate', type: 'dropdown', options: ['128k', '192k', '256k', '320k'], default: '320k', advanced: true },
]

export const BOOKEND_FIELDS: FieldDef[] = [
  { key: 'enabled', label: 'Enable Bookend', type: 'toggle', default: true, helper: 'Wrap assembled video with TTS pronunciation intro/outro cards' },
  { key: 'voice_id', label: 'Voice', type: 'voice', placeholder: 'e.g., EXAVITQu4vr4xnSDxMaL', helper: 'ElevenLabs voice for pronunciation (must match target language)', condition: s => s.enabled !== false },
  { key: 'model_id', label: 'TTS Model', type: 'dropdown', options: ['eleven_flash_v2_5', 'eleven_multilingual_v2', 'eleven_turbo_v2_5'], optionLabels: { eleven_flash_v2_5: 'Flash v2.5 (recommended, language enforcement)', eleven_multilingual_v2: 'Multilingual v2 (legacy, no language enforcement)', eleven_turbo_v2_5: 'Turbo v2.5 (faster, English-focused)' }, default: 'eleven_flash_v2_5', condition: s => s.enabled !== false },
  { key: 'display_duration_min', label: 'Min Display Duration', type: 'slider', min: 1.0, max: 5.0, step: 0.5, default: 1.5, helper: 'Minimum time the word card is shown (seconds)', condition: s => s.enabled !== false },
  { key: 'display_duration_max', label: 'Max Display Duration', type: 'slider', min: 2.0, max: 10.0, step: 0.5, default: 4.0, helper: 'Maximum time the word card is shown (seconds)', condition: s => s.enabled !== false },
  { key: 'display_buffer_pct', label: 'Buffer After TTS', type: 'slider', min: 0.0, max: 2.0, step: 0.1, default: 0.5, helper: 'Extra hold time after pronunciation as % of TTS duration (0.5 = 50%)', condition: s => s.enabled !== false },
  { key: 'fade_duration', label: 'Fade Duration', type: 'slider', min: 0.0, max: 1.0, step: 0.1, default: 0.3, helper: 'Fade transition at intro/outro boundaries (seconds)', condition: s => s.enabled !== false },
  { key: 'font', label: 'Font', type: 'dropdown', options: ['Bebas Neue', 'Montserrat', 'Poppins', 'Raleway', 'Inter', 'Playfair Display', 'Noto Sans'], optionLabels: { 'Bebas Neue': 'Bebas Neue (Cinematic)', 'Montserrat': 'Montserrat (Modern)', 'Poppins': 'Poppins (Friendly)', 'Raleway': 'Raleway (Elegant)', 'Inter': 'Inter (Clean)', 'Playfair Display': 'Playfair Display (Serif)', 'Noto Sans': 'Noto Sans (Universal)' }, default: 'Bebas Neue', helper: 'Font for word card text. Use Noto Sans for CJK languages.', condition: s => s.enabled !== false, advanced: true },
  { key: 'font_size', label: 'Font Size', type: 'slider', min: 24, max: 200, step: 4, default: 144, helper: 'Font size at 1080p (scales proportionally at other resolutions)', condition: s => s.enabled !== false, advanced: true },
  { key: 'text_color', label: 'Text Color', type: 'combo', options: ['auto', 'white'], default: 'auto', helper: 'Text color on word card. "auto" extracts from assembled video.', condition: s => s.enabled !== false, advanced: true },
  { key: 'background_color', label: 'Background Color', type: 'text', placeholder: '#000000', default: '#000000', condition: s => s.enabled !== false, advanced: true },
  { key: 'show_translation', label: 'Show Translation', type: 'toggle', default: true, helper: 'Display L1 translation below the target word', condition: s => s.enabled !== false },
  { key: 'show_phonetic', label: 'Show Phonetic (IPA)', type: 'toggle', default: false, helper: 'Display IPA phonetic transcription (not yet implemented in engine)', condition: s => s.enabled !== false },
]

export const STAGE_FIELDS: Record<string, FieldDef[]> = {
  concept: CONCEPT_FIELDS,
  song: SONG_FIELDS,
  images: IMAGE_FIELDS,
  video: VIDEO_FIELDS,
  assembly: ASSEMBLY_FIELDS,
  bookend: BOOKEND_FIELDS,
}
