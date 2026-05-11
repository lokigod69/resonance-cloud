import type { GameDeck, RawDeck } from './types';

export function loadDeck(raw: RawDeck): GameDeck {
  if (!raw.id || !raw.name || !raw.languageCode) {
    throw new Error('Deck must include id, name, and languageCode.');
  }

  const cards = raw.cards.map((card) => {
    if (!card.id || !card.word || !card.translation || !card.imageUrl) {
      throw new Error(`Card ${card.id || '(unknown)'} is missing required game fields.`);
    }

    return {
      ...card,
      languageCode: card.languageCode ?? raw.languageCode,
      tags: card.tags ?? [],
    };
  });

  if (cards.length < 3) {
    throw new Error('Lexicon Path needs at least three cards.');
  }

  return {
    id: raw.id,
    name: raw.name,
    languageCode: raw.languageCode,
    cards,
  };
}
