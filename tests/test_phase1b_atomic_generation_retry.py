from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql"


def _read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_phase1b_migration_defines_atomic_submit_and_retry_rpcs():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "create or replace function public.submit_generation(" in sql
    assert "create or replace function public.request_word_retry(" in sql
    assert "auth.uid()" in sql
    assert "for update" in sql
    assert "credits = credits -" in sql
    assert "grant execute on function public.submit_generation" in sql
    assert "grant execute on function public.request_word_retry" in sql


def test_submit_generation_serializes_same_idempotency_key_before_side_effects():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "submit_idempotency_key" in sql
    assert "pg_advisory_xact_lock" in sql
    assert "select *\n      into v_existing_job" in sql
    assert sql.index("pg_advisory_xact_lock") < sql.index("insert into public.decks")
    assert sql.index("select *\n      into v_existing_job") < sql.index("insert into public.decks")


def test_generation_submit_uses_rpc_without_direct_credit_update():
    source = _read("frontend/src/components/generate/submitGeneration.ts")

    assert "supabase.rpc('submit_generation'" in source
    assert ".from('profiles')" not in source
    assert ".update({ credits:" not in source
    assert ".from('generation_jobs')" not in source
    assert ".from('words')" not in source


def test_retry_flows_use_rpc_without_direct_credit_update():
    for path in [
        "frontend/src/pages/DeckView.tsx",
        "frontend/src/pages/DeckViewPG.tsx",
        "frontend/src/pages/Music.tsx",
    ]:
        source = _read(path)
        assert "supabase.rpc('request_word_retry'" in source
        assert ".update({ credits:" not in source
        assert ".from('profiles')" not in source
