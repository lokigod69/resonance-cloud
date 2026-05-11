import type { GameWordRow } from '../../shared/useGameDeck';
import type { GameDeck } from '../engine/types';

const FALLBACK_IMAGE_URL = '/games/runner/cards/frame-default.png';

export type RunnerWordRow = Pick<
  GameWordRow,
  | 'id'
  | 'word'
  | 'translation'
  | 'ipa'
  | 'thumbnail_url'
  | 'thumbnail_url_b'
  | 'image_url'
  | 'image_urls'
  | 'tts_audio_url'
  | 'decks'
>;

export function adaptDeck(words: RunnerWordRow[], language: string | null): GameDeck {
  if (words.length < 3) {
    throw new Error('Runner needs at least three words.');
  }

  const languageCode = language ?? 'en';

  return {
    id: `runner-${languageCode}`,
    name: 'Runner',
    languageCode,
    cards: words.map((word) => ({
      id: word.id,
      word: word.word,
      translation: word.translation ?? word.word,
      imageUrl: pickImageUrl(word) ?? FALLBACK_IMAGE_URL,
      audioUrl: word.tts_audio_url ?? undefined,
      ipa: word.ipa ?? undefined,
      languageCode: word.decks?.target_language ?? languageCode,
      tags: [],
    })),
  };
}

export function pickImageUrl(word: RunnerWordRow): string | undefined {
  const firstImage = Array.isArray(word.image_urls)
    ? word.image_urls.find((url): url is string => Boolean(url))
    : undefined;

  return firstImage
    ?? word.image_url
    ?? word.thumbnail_url
    ?? word.thumbnail_url_b
    ?? undefined;
}
