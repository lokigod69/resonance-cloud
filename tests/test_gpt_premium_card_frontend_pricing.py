"""Static contract tests for GPT Image-2 premium card UX and pricing."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
USE_WIZARD_STATE = ROOT / "frontend" / "src" / "components" / "generate" / "useWizardState.ts"
CARD_STYLE_STEP = ROOT / "frontend" / "src" / "components" / "generate" / "steps" / "CardImageStyleStep.tsx"
CONFIRM_STEP = ROOT / "frontend" / "src" / "components" / "generate" / "steps" / "ConfirmStep.tsx"
GENERATE_PG = ROOT / "frontend" / "src" / "pages" / "GeneratePG.tsx"
GENERATE_GO = ROOT / "frontend" / "src" / "pages" / "GenerateGO.tsx"
DECK_VIEW = ROOT / "frontend" / "src" / "pages" / "DeckView.tsx"
DECK_VIEW_PG = ROOT / "frontend" / "src" / "pages" / "DeckViewPG.tsx"


def _source(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_wizard_state_tracks_card_image_model_and_model_aware_pricing():
    source = _source(USE_WIZARD_STATE)

    assert "cardImageModel: 'zturbo' | 'gpt_image_2'" in source
    assert "SET_CARD_IMAGE_MODEL" in source
    assert "CARD_CREDIT_COST_PER_WORD" in source
    assert "gpt_image_2: 5" in source
    assert "zturbo: 1" in source
    assert "computeCreditCost(" in source
    assert "cardImageModel" in source


def test_card_payload_always_sends_explicit_card_image_model():
    source = _source(USE_WIZARD_STATE)

    assert "card_image_model: state.cardImageModel" in source
    assert "card_image_style: state.cardImageStyle" in source


def test_generate_pages_preserve_card_model_in_standard_and_quick_payloads():
    combined = "\n".join(_source(path) for path in [GENERATE_PG, GENERATE_GO])

    assert "card_image_model" in combined
    assert "cardImageModel" in combined
    assert "settings_override = {" in combined
    assert "card_image_model: state.cardImageModel" in combined or "card_image_model: cardImageModel" in combined


def test_wizard_copy_exposes_distinct_standard_and_gpt_card_tiers():
    source = _source(CARD_STYLE_STEP)

    assert "Standard Card" in source
    assert "Z-Image Turbo" in source
    assert "1 credit" in source
    assert "GPT Image-2 Card" in source
    assert "Premium GPT image card" in source
    assert "5 credits" in source
    assert "Visual style" in source
    assert "image model" not in source.lower()


def test_confirm_step_uses_model_aware_credit_cost():
    source = _source(CONFIRM_STEP)

    assert "computeCreditCost(state.deckType, state.words.length, state.cardImageModel)" in source
    assert "GPT Image-2 Card" in source
    assert "Standard Card" in source


def test_card_deck_views_suppress_video_affordances_for_card_decks():
    combined = "\n".join(_source(path) for path in [DECK_VIEW, DECK_VIEW_PG])

    assert "deck_type" in combined
    assert "isCardDeck" in combined
    assert "Bild wird erstellt" in combined
    assert "In Warteschlange" in combined
    assert "Bild konnte nicht erstellt werden" in combined
    assert "Bild erneut erstellen" in combined
    assert "!isCardDeck" in combined
    assert "navigate(`/study/flashcard?deck=${deck.id}`)" in combined
