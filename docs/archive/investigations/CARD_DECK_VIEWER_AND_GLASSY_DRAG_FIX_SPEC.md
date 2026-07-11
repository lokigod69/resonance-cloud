# Card Deck Viewer and Glassy Drag Fix Spec

## Problem

Card decks are generated as image/card products, but deck viewing still contains video-era behavior.

Classic DeckView:
- completed card click opens `/study/flashcard?deck=...`
- user cannot inspect a single generated card in full from the deck
- this makes card decks feel like study-only content, not reviewable generated artifacts

Glassy DeckViewPG:
- card deck carousel mostly works
- swiping can fail when the gesture starts on the image
- likely cause: image/native pointer behavior competing with `useDrag`
- card deck should not have video play/volume/fullscreen affordances

## Current Code Facts

- `DeckView.tsx` has `isCardDeck = deck.deck_type === 'card'`
- `DeckView.tsx` suppresses play overlay for card decks
- `DeckView.tsx` uses card/image copy for card processing/failure
- `DeckView.tsx` still navigates card clicks to flashcard study
- `DeckViewPG.tsx` uses `useDrag` for carousel navigation
- `DeckViewPG.tsx` suppresses video controls for card decks
- `WordInfoPanel.tsx` already provides rating and collapsible word metadata

## Target Behavior

### Card Decks

- click completed card -> open card viewer modal
- modal shows large image, word, translation, mnemonic, rating, share, metadata
- left/right arrows navigate completed cards
- keyboard Escape closes
- keyboard arrows navigate
- no video controls
- no play overlay
- failed copy says image/card failure
- processing copy says image/card creation

### Video Decks

- preserve current video modal/player behavior
- play overlay remains video-only
- volume/fullscreen/version controls remain video-only

## Recommended Implementation

1. Add `CardWordViewerModal.tsx`
2. Replace classic card-click study navigation with modal open
3. Keep study entry through footer `Lernen`
4. Fix card image drag in glassy with `draggable={false}` and card-only pointer handling
5. Add static tests

## Non-Goals

- no backend changes
- no generation prompt changes
- no card tier changes
- no Layer 2 controls
- no typography/speech-bubble controls
- no broad UI redesign
- no routing rewrite

## Tests

- classic card deck click does not navigate to `/study/flashcard`
- classic card deck renders card viewer modal
- video deck still renders video viewer modal
- card deck does not render play overlay
- video deck still renders play overlay
- glassy card thumbnails are non-draggable and do not block carousel gesture
- failed card copy says image/card failure
- processing card copy says image/card creation
