// Shared types for image-less decks and conversation vocab extraction.
// Owned by Agent A; consumed by Agent B.

export interface ImagelessItem {
  word: string;
  translation: string;
  ipa: string | null;
  is_phrase: boolean;
}

// /api/translate-and-ipa
export interface TranslateAndIpaRequest {
  items: Array<{ word: string; is_phrase?: boolean }>;
  target_language: string; // 2-letter code, e.g. 'de', 'es'
  base_language: string;   // 2-letter code, e.g. 'en'
}
export interface TranslateAndIpaResponse {
  items: ImagelessItem[];
}

// /api/extract-vocabulary
export interface ExtractVocabularyRequest {
  // Provide either conversation_id (DB-sourced) OR messages (in-memory). Not both.
  conversation_id?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  target_language: string;
  base_language: string;
  max_items?: number;        // default 10
  include_words?: boolean;   // default true
  include_phrases?: boolean; // default true
}
export interface ExtractVocabularyResponse {
  items: ImagelessItem[];
  conversation_id?: string;
}

// submit_imageless_import RPC payload shape (the jsonb passed as p_items)
export type SubmitImagelessImportItem = ImagelessItem;

// append_imageless_cards RPC
export interface AppendImagelessCardsParams {
  p_deck_id: string;
  p_items: SubmitImagelessImportItem[];
  p_origin?: string;
}
export type AppendImagelessCardsResponse = number; // count of inserted rows

// /api/generate-imageless-tts
export interface GenerateImagelessTtsRequest {
  word_ids: string[];
}
export interface GenerateImagelessTtsResult {
  word_id: string;
  status: 'ready' | 'failed';
  tts_audio_url?: string;
  error?: string;
}
export interface GenerateImagelessTtsResponse {
  generated: number;
  failed: number;
  results: GenerateImagelessTtsResult[];
}
