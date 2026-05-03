"""Static checks for authoritative GPT Image-2 card submit pricing."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "frontend" / "supabase" / "migrations"


def _latest_submit_generation_sql() -> str:
    candidates = sorted(MIGRATIONS.glob("*gpt*card*pricing*.sql"))
    assert candidates, "missing GPT premium card pricing migration"
    return candidates[-1].read_text(encoding="utf-8")


def test_submit_generation_prices_video_standard_card_and_gpt_card():
    sql = _latest_submit_generation_sql()

    assert "create or replace function public.submit_generation(" in sql
    assert "v_card_image_model" in sql
    assert "gpt_image_2" in sql
    assert "zturbo" in sql
    assert "when v_deck_type = 'video' then 10" in sql
    assert "when v_card_image_model = 'gpt_image_2' then 5" in sql
    assert "else 1" in sql


def test_submit_generation_persists_explicit_card_model_and_replays_original_price():
    sql = _latest_submit_generation_sql()

    assert "jsonb_set(" in sql
    assert "'{card_image_model}'" in sql
    assert "v_existing_job.credit_cost_per_word" in sql
    assert "v_existing_job.credits_charged" in sql
    assert "v_settings_override" in sql


def test_submit_generation_rejects_invalid_card_image_model():
    sql = _latest_submit_generation_sql()

    assert "invalid card_image_model" in sql
    assert "not in ('zturbo', 'gpt_image_2')" in sql
