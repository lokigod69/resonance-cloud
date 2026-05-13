import type { GameWordRow } from '../../shared/useGameDeck';
import type { GameDeck } from '../engine/types';
import { getCardThumbUrl } from '@/lib/imageUrls';

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
  const cards = words.flatMap((word) => {
    const id = normalizeText(word.id);
    const headword = normalizeText(word.word);
    if (!id || !headword) {
      console.warn('[runner] Skipping card missing required text fields.', { id: word.id });
      return [];
    }

    return [{
      id,
      word: headword,
      translation: normalizeText(word.translation) ?? headword,
      imageUrl: pickImageUrl(word) ?? FALLBACK_IMAGE_URL,
      audioUrl: normalizeUrl(word.tts_audio_url),
      ipa: normalizeText(word.ipa),
      languageCode: normalizeText(word.decks?.target_language) ?? languageCode,
      tags: [],
    }];
  });

  if (cards.length < 3) {
    throw new Error('Runner needs at least three playable words.');
  }

  return {
    id: `runner-${languageCode}`,
    name: 'Runner',
    languageCode,
    cards,
  };
}

export function pickImageUrl(word: RunnerWordRow): string | undefined {
  const firstImage = Array.isArray(word.image_urls)
    ? word.image_urls.map(normalizeUrl).find((url): url is string => Boolean(url))
    : undefined;

  const imageUrl = firstImage
    ?? normalizeUrl(word.image_url)
    ?? normalizeUrl(word.thumbnail_url)
    ?? normalizeUrl(word.thumbnail_url_b)
    ?? undefined;

  return getCardThumbUrl(imageUrl, 512) ?? undefined;
}

function normalizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUrl(value: string | null | undefined): string | undefined {
  return normalizeText(value);
}
