"""In-memory fake of the minimal supabase-py surface used by the orchestrator.

Supports:
  table(name).select(*).eq|neq|in_|is_|lt|gt|order|limit|maybe_single|single.execute()
  table(name).update(dict).eq|neq|in_|is_.execute()
  table(name).insert(dict or list[dict]).execute()
  rpc(name, params).execute()  — dispatches to _RPC_HANDLERS for known names
  storage.from_(...).upload(...).get_public_url(...)  — stubs

RPC handlers mirror the SQL functions in
`20260418_transition_rpc.sql` exactly (transition_word_stage, mark_word_failed,
claim_retry_word). The handlers implement the SAME WHERE predicates and
SET clauses, so tests exercise the real exclusivity semantics rather than a
loose mock. Row-level atomicity is enforced by a per-table lock.

Unknown RPC names are recorded (for refund_credit, etc.) but return None.
"""

from __future__ import annotations

import copy
import threading
import uuid
from datetime import datetime, timezone
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class _Response:
    def __init__(self, data: Any):
        self.data = data


class _Table:
    def __init__(self, sb, name: str):
        self.sb = sb
        self.name = name

    def select(self, *_cols: str) -> "_Query":
        return _Query(self, op="select")

    def update(self, values: dict) -> "_Query":
        return _Query(self, op="update", payload=copy.deepcopy(values))

    def insert(self, values) -> "_Query":
        return _Query(self, op="insert", payload=copy.deepcopy(values))


class _Query:
    def __init__(self, table: _Table, *, op: str, payload=None):
        self.table = table
        self.op = op
        self.payload = payload
        self.filters: list[tuple[str, str, Any]] = []
        self.order_by: list[tuple[str, bool]] = []
        self.limit_n: int | None = None
        self.single_mode: str | None = None

    def eq(self, col, val):
        self.filters.append(("eq", col, val)); return self

    def neq(self, col, val):
        self.filters.append(("neq", col, val)); return self

    def in_(self, col, vals):
        self.filters.append(("in", col, list(vals))); return self

    def is_(self, col, val):
        self.filters.append(("is", col, val)); return self

    def lt(self, col, val):
        self.filters.append(("lt", col, val)); return self

    def gt(self, col, val):
        self.filters.append(("gt", col, val)); return self

    def order(self, col, desc: bool = False):
        self.order_by.append((col, desc)); return self

    def limit(self, n: int):
        self.limit_n = n; return self

    def single(self):
        self.single_mode = "single"; return self

    def maybe_single(self):
        self.single_mode = "maybe_single"; return self

    def execute(self) -> _Response:
        sb = self.table.sb
        with sb._lock:
            if self.op == "select":
                return self._do_select(sb)
            if self.op == "update":
                return self._do_update(sb)
            if self.op == "insert":
                return self._do_insert(sb)
            raise AssertionError(f"unknown op {self.op}")

    def _match(self, row: dict) -> bool:
        for kind, col, val in self.filters:
            rv = row.get(col)
            if kind == "eq" and rv != val:
                return False
            if kind == "neq" and rv == val:
                return False
            if kind == "in" and rv not in val:
                return False
            if kind == "is":
                normalized = None if val in (None, "null") else val
                if rv is not normalized:
                    return False
            if kind == "lt" and (rv is None or not rv < val):
                return False
            if kind == "gt" and (rv is None or not rv > val):
                return False
        return True

    def _sort(self, rows):
        for col, desc in reversed(self.order_by):
            rows.sort(key=lambda r: (r.get(col) is None, r.get(col)), reverse=desc)
        return rows

    def _do_select(self, sb) -> _Response:
        rows = [copy.deepcopy(r) for r in sb._tables[self.table.name] if self._match(r)]
        rows = self._sort(rows)
        if self.limit_n is not None:
            rows = rows[: self.limit_n]
        if self.single_mode:
            if not rows:
                if self.single_mode == "maybe_single":
                    return _Response(None)
                raise RuntimeError("single() returned no rows")
            return _Response(rows[0])
        return _Response(rows)

    def _do_update(self, sb) -> _Response:
        updated: list[dict] = []
        for row in sb._tables[self.table.name]:
            if self._match(row):
                row.update(self.payload)
                updated.append(copy.deepcopy(row))
        return _Response(updated)

    def _do_insert(self, sb) -> _Response:
        payload = self.payload
        items = payload if isinstance(payload, list) else [payload]
        inserted: list[dict] = []
        table = sb._tables[self.table.name]
        for item in items:
            row = copy.deepcopy(item)
            row.setdefault("id", str(uuid.uuid4()))
            table.append(row)
            inserted.append(copy.deepcopy(row))
        return _Response(inserted)


class _Storage:
    """Stub — orchestration unit tests don't exercise storage."""
    def from_(self, *_a, **_kw):
        return self

    def upload(self, *_a, **_kw):
        return None

    def get_public_url(self, *_a, **_kw):
        return "https://example.invalid/x"


# ---------------------------------------------------------------------------
# RPC handlers — mirror orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql
# ---------------------------------------------------------------------------

def _handle_transition_word_stage(sb: "FakeSupabase", params: dict) -> bool:
    """Mirror of SQL function transition_word_stage.

    Returns True iff rowcount=1 (single guarded UPDATE succeeded).
    """
    word_id = params["p_word_id"]
    allowed = params["p_allowed_prior_stages"] or []
    new_stage = params["p_new_stage"]
    new_status = params["p_new_status"]
    increment = bool(params.get("p_increment_attempts", False))
    extra = params.get("p_additional_updates") or {}
    if isinstance(extra, str):
        # supabase-py sometimes double-encodes jsonb
        import json as _json
        extra = _json.loads(extra)

    for row in sb._tables["words"]:
        if row.get("id") != word_id:
            continue
        if row.get("current_stage") == "cancelling":
            return False
        if row.get("current_stage") not in allowed:
            return False

        old_stage = row.get("current_stage")
        row["current_stage"] = new_stage
        row["status"] = new_status
        row["stage_started_at"] = _now_iso()
        if increment:
            if old_stage != new_stage:
                row["stage_attempts"] = 1
            else:
                row["stage_attempts"] = (row.get("stage_attempts") or 0) + 1
            row["total_stage_attempts"] = (row.get("total_stage_attempts") or 0) + 1
        else:
            row["stage_attempts"] = 0

        for key in ("music_state", "suno_task_id", "suno_audio_url", "failed_stage"):
            if key in extra:
                row[key] = extra[key]
        return True
    return False


def _handle_mark_word_failed(sb: "FakeSupabase", params: dict) -> bool:
    """Mirror of SQL function mark_word_failed."""
    word_id = params["p_word_id"]
    failed_stage = params.get("p_failed_stage")
    for row in sb._tables["words"]:
        if row.get("id") != word_id:
            continue
        if row.get("current_stage") == "failed":
            return False
        row["current_stage"] = "failed"
        row["status"] = "failed"
        row["failed_stage"] = failed_stage
        row["stage_started_at"] = _now_iso()
        return True
    return False


def _handle_claim_retry_word(sb: "FakeSupabase", params: dict) -> bool:
    """Mirror of SQL function claim_retry_word."""
    word_id = params["p_word_id"]
    target_stage = params["p_target_stage"]
    target_status = params["p_target_status"]
    terminal = {"failed", "complete", "cancelled"}
    for row in sb._tables["words"]:
        if row.get("id") != word_id:
            continue
        if not row.get("retry_requested"):
            return False
        if row.get("current_stage") not in terminal:
            return False
        row["retry_requested"] = False
        row["failed_stage"] = None
        row["stage_attempts"] = 0
        row["total_stage_attempts"] = (row.get("total_stage_attempts") or 0) + 1
        row["status"] = target_status
        row["current_stage"] = target_stage
        row["stage_started_at"] = _now_iso()
        return True
    return False


_RPC_HANDLERS = {
    "transition_word_stage": _handle_transition_word_stage,
    "mark_word_failed": _handle_mark_word_failed,
    "claim_retry_word": _handle_claim_retry_word,
}


class FakeSupabase:
    def __init__(self):
        self._lock = threading.RLock()
        self._tables: dict[str, list[dict]] = {
            "words": [],
            "generation_jobs": [],
            "decks": [],
            "system_settings": [],
            "profiles": [],
            "language_profiles": [],
        }
        self.rpc_calls: list[tuple[str, dict]] = []
        self.storage = _Storage()

    def table(self, name: str) -> _Table:
        self._tables.setdefault(name, [])
        return _Table(self, name)

    def rpc(self, name: str, params: dict):
        outer = self

        class _RpcCall:
            def execute(inner):
                with outer._lock:
                    outer.rpc_calls.append((name, dict(params)))
                    handler = _RPC_HANDLERS.get(name)
                    if handler is not None:
                        return _Response(handler(outer, params))
                    return _Response(None)

        return _RpcCall()

    # --------- test helpers ---------------------------------------------
    def add_word(self, **fields) -> dict:
        row = {
            "id": str(uuid.uuid4()),
            "user_id": "u-1",
            "deck_id": "d-1",
            "generation_job_id": None,
            "word": "hello",
            "word_slug": "hello",
            "status": "pending",
            "current_stage": "pending",
            "music_state": "pending",
            "stage_attempts": 0,
            "total_stage_attempts": 0,
            "retry_requested": False,
            "retry_requested_at": None,
            "failed_stage": None,
            "stage_started_at": None,
            "suno_task_id": None,
            "suno_audio_url": None,
        }
        row.update(fields)
        self._tables["words"].append(row)
        return row

    def add_job(self, **fields) -> dict:
        row = {
            "id": str(uuid.uuid4()),
            "user_id": "u-1",
            "deck_id": "d-1",
            "status": "approved",
            "priority": 0,
            "target_language": "Spanish",
            "words_completed": 0,
            "words_failed": 0,
            "created_at": "2026-04-18T00:00:00+00:00",
        }
        row.update(fields)
        self._tables["generation_jobs"].append(row)
        return row
