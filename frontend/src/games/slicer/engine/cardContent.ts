import type { CardContent, DeckDefinition, DeckMode, DeckWord } from './types';

export type ResolvedPrompt = {
  text: string;
  lang: string;
  mode: DeckMode;
};

export function deckMode(deck: DeckDefinition): DeckMode {
  return deck.mode ?? 'audio_to_image';
}

export function resolvePrompt(deck: DeckDefinition, word: DeckWord): ResolvedPrompt {
  const mode = deckMode(deck);
  if (mode === 'audio_to_text') {
    return {
      text: word.translation ?? word.word,
      lang: deck.base_language,
      mode,
    };
  }
  return {
    text: word.word,
    lang: deck.target_language,
    mode,
  };
}

export function resolveCardContent(deck: DeckDefinition, word: DeckWord): CardContent {
  if (deckMode(deck) === 'audio_to_image' && word.imageUrl) {
    return { kind: 'image', url: word.imageUrl, label: word.word };
  }
  return { kind: 'text', text: word.word, imageRole: 'placeholder' };
}
