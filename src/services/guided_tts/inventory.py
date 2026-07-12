"""Guided Today TTS inventory builder (no provider calls).

Given a lesson-data snapshot and a scope, build the set of (path, lesson,
vibe, surface, surface_key, normalized_text) rows that Guided Today would
need to generate, resolve a voice profile per row, compute a cache-key
preview, and report per-voice character counts and provider-call estimates.

Nothing in this module imports an HTTP client, opens a network socket, or
touches storage. The audit-trail tables and bucket are managed elsewhere.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import re
from typing import Any, Iterable, Sequence

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

NORMALIZATION_VERSION = "v1"

DEFAULT_PROVIDER = "elevenlabs"
DEFAULT_MODEL_ID = "eleven_flash_v2_5"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
DEFAULT_VOICE_SETTINGS: dict[str, Any] = {
    "stability": 0.75,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": True,
}

VALID_VIBES: tuple[str, ...] = ("bright", "wistful", "sharp")
VALID_SURFACES: tuple[str, ...] = ("corePhrase", "chunks", "trophyWord", "speak")

_ASSET_STATUS_READY = "ready"
_ASSET_STATUS_MISSING = "missing"
_ASSET_STATUS_UNRESOLVED_VOICE = "missing_voice_profile"


# ---------------------------------------------------------------------------
# Normalization (shared shape with src/services/pronunciation_tts.py V1)
# ---------------------------------------------------------------------------

_SMART_PUNCT = str.maketrans(
    {
        "‘": "'",
        "’": "'",
        "‚": "'",
        "‛": "'",
        "′": "'",
        "“": '"',
        "”": '"',
        "„": '"',
        "‟": '"',
        "″": '"',
        "‐": "-",
        "‑": "-",
        "‒": "-",
        "–": "-",
        "—": "-",
        "―": "-",
        "−": "-",
        " ": " ",
        " ": " ",
    }
)


def normalize_spoken_text(text: str) -> str:
    """Canonicalize learner-facing text before hashing and submission."""
    return re.sub(r"\s+", " ", str(text or "").translate(_SMART_PUNCT)).strip()


def text_hash(text: str) -> str:
    """sha256 of the normalized text."""
    return hashlib.sha256(normalize_spoken_text(text).encode("utf-8")).hexdigest()


def voice_settings_hash(settings: dict[str, Any]) -> str:
    """sha256 of a canonical JSON of the settings object.

    Sorted keys, fixed numeric precision via JSON's default float repr. The
    same shape is expected to be stored in `guided_voice_profiles.voice_settings_hash`.
    """
    payload = json.dumps(settings, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def cache_key(
    *,
    provider: str,
    target_language_code: str,
    voice_profile_key: str,
    provider_voice_id: str,
    provider_model_id: str,
    output_format: str,
    settings_hash: str,
    normalization_version: str,
    text_hash_value: str,
) -> str:
    """Deterministic surrogate for the unique index on guided_tts_assets."""
    payload = "|".join(
        [
            provider,
            target_language_code,
            voice_profile_key,
            provider_voice_id,
            provider_model_id,
            output_format,
            settings_hash,
            normalization_version,
            text_hash_value,
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def storage_path(
    *,
    target_language_code: str,
    voice_profile_key: str,
    provider_voice_id: str,
    provider_model_id: str,
    output_format: str,
    settings_hash: str,
    text_hash_value: str,
) -> str:
    """Storage path the worker would write to. Pure function; no IO.

    Includes provider_voice_id (like cache_key does): if a profile key is
    reseeded onto a different voice, the new clip must land on a new object
    instead of overwriting bytes that older asset rows still point to.
    """
    safe = lambda value: re.sub(r"[^A-Za-z0-9_.-]+", "_", value or "")
    return (
        f"elevenlabs/{safe(target_language_code)}/{safe(voice_profile_key)}/"
        f"{safe(provider_voice_id)}/{safe(provider_model_id)}/{safe(output_format)}/"
        f"{settings_hash[:12]}/{text_hash_value}.mp3"
    )


# ---------------------------------------------------------------------------
# Voice profile resolver
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class VoiceProfile:
    voice_profile_key: str
    provider: str = DEFAULT_PROVIDER
    target_language_code: str = "en-US"
    vibe: str | None = None
    scope_path_id: str | None = None
    scope_lesson_id: str | None = None
    scope_surface: str | None = None
    provider_voice_id: str = ""
    provider_model_id: str = DEFAULT_MODEL_ID
    output_format: str = DEFAULT_OUTPUT_FORMAT
    voice_settings: dict[str, Any] = field(default_factory=lambda: dict(DEFAULT_VOICE_SETTINGS))
    voice_settings_hash: str = ""
    assignment_version: int = 1
    active: bool = True
    priority: int = 100

    def specificity(self) -> int:
        """Higher = more specific. Used for resolver ordering."""
        score = 0
        if self.scope_surface is not None:
            score += 1
        if self.scope_lesson_id is not None:
            score += 2
        if self.scope_path_id is not None:
            score += 4
        if self.vibe is not None:
            score += 8
        return score

    def matches(
        self,
        *,
        target_language_code: str,
        vibe: str,
        path_id: str,
        lesson_id: str,
        surface: str,
    ) -> bool:
        if not self.active:
            return False
        if self.target_language_code != target_language_code:
            return False
        if self.vibe is not None and self.vibe != vibe:
            return False
        if self.scope_path_id is not None and self.scope_path_id != path_id:
            return False
        if self.scope_lesson_id is not None and self.scope_lesson_id != lesson_id:
            return False
        if self.scope_surface is not None and self.scope_surface != surface:
            return False
        return True


def resolve_voice_profile(
    profiles: Sequence[VoiceProfile],
    *,
    target_language_code: str,
    vibe: str,
    path_id: str,
    lesson_id: str,
    surface: str,
) -> VoiceProfile | None:
    """Hierarchical resolution. Higher specificity wins; ties → lower priority.

    Surfaces in the request stay verbatim (e.g. ``chunk``); profile scope
    surfaces are matched the same way. The resolver does not silently fall
    through to a random voice — it returns None when no row matches and the
    caller surfaces that as ``missing_voice_profile``.
    """
    candidates = [
        profile
        for profile in profiles
        if profile.matches(
            target_language_code=target_language_code,
            vibe=vibe,
            path_id=path_id,
            lesson_id=lesson_id,
            surface=surface,
        )
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda p: (-p.specificity(), p.priority))
    return candidates[0]


# ---------------------------------------------------------------------------
# Lesson surface extraction
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SurfaceRow:
    """One (path, lesson, vibe, surface, surface_key, text) row of the inventory."""

    path_id: str
    lesson_id: str
    lesson_number: int
    vibe: str
    surface: str           # 'corePhrase' | 'chunk' | 'trophyWord' | 'speakTarget'
    surface_key: str       # chunk id or '__self'
    source_text: str
    normalized_text: str
    text_hash: str
    target_language_code: str


def _make_row(
    *,
    path_id: str,
    lesson_id: str,
    lesson_number: int,
    vibe: str,
    surface: str,
    surface_key: str,
    text: str,
    target_language_code: str,
) -> SurfaceRow:
    normalized = normalize_spoken_text(text)
    return SurfaceRow(
        path_id=path_id,
        lesson_id=lesson_id,
        lesson_number=lesson_number,
        vibe=vibe,
        surface=surface,
        surface_key=surface_key,
        source_text=text,
        normalized_text=normalized,
        text_hash=text_hash(normalized),
        target_language_code=target_language_code,
    )


def _normalize_surfaces_arg(surfaces: Iterable[str] | None) -> set[str]:
    if surfaces is None:
        return set(VALID_SURFACES)
    out = set()
    for raw in surfaces:
        s = raw.strip()
        if s not in VALID_SURFACES:
            raise ValueError(
                f"unknown surface {s!r}; expected one of {VALID_SURFACES}"
            )
        out.add(s)
    return out


def _normalize_vibes_arg(vibes: Iterable[str] | None) -> list[str]:
    if vibes is None:
        return list(VALID_VIBES)
    out: list[str] = []
    for raw in vibes:
        v = raw.strip()
        if v not in VALID_VIBES:
            raise ValueError(f"unknown vibe {v!r}; expected one of {VALID_VIBES}")
        out.append(v)
    return out


def extract_lesson_surfaces(
    *,
    lesson: dict[str, Any],
    vibes: Iterable[str] | None = None,
    surfaces: Iterable[str] | None = None,
    target_language_code: str = "en-US",
) -> list[SurfaceRow]:
    """Extract the canary-scope surface rows for one lesson definition.

    ``lesson`` is the JSON-equivalent shape of ``GuidedLessonDefinition`` —
    a dict carrying ``id``, ``pathId``, ``lessonNumber``, and ``vibeVariants``.

    Rules:
      * ``speakTarget.targetPhrase`` is included as a separate row ONLY when
        its normalized form differs from ``corePhrase.targetText`` — dedupe
        as specified in the architecture report §6.
      * ``trophyWord.example`` and ``lessonItems`` are NOT included in PR #1.
      * ``build.chips`` are NOT included — punctuation tokens would create
        near-duplicates and hurt cache reuse.
    """
    requested_surfaces = _normalize_surfaces_arg(surfaces)
    requested_vibes = _normalize_vibes_arg(vibes)

    rows: list[SurfaceRow] = []

    path_id = lesson["pathId"]
    lesson_id = lesson["id"]
    lesson_number = int(lesson["lessonNumber"])
    variants = lesson.get("vibeVariants") or {}

    for vibe in requested_vibes:
        variant = variants.get(vibe)
        if variant is None:
            continue

        core_phrase = (variant.get("corePhrase") or {}).get("targetText", "")
        normalized_core = normalize_spoken_text(core_phrase)

        if "corePhrase" in requested_surfaces and core_phrase:
            rows.append(
                _make_row(
                    path_id=path_id,
                    lesson_id=lesson_id,
                    lesson_number=lesson_number,
                    vibe=vibe,
                    surface="corePhrase",
                    surface_key="__self",
                    text=core_phrase,
                    target_language_code=target_language_code,
                )
            )

        if "chunks" in requested_surfaces:
            for chunk in variant.get("chunks") or []:
                chunk_id = chunk.get("id")
                chunk_text = chunk.get("targetText") or ""
                if not chunk_id or not chunk_text:
                    continue
                rows.append(
                    _make_row(
                        path_id=path_id,
                        lesson_id=lesson_id,
                        lesson_number=lesson_number,
                        vibe=vibe,
                        surface="chunk",
                        surface_key=chunk_id,
                        text=chunk_text,
                        target_language_code=target_language_code,
                    )
                )

        if "trophyWord" in requested_surfaces:
            trophy_word = (variant.get("trophyWord") or {}).get("word") or ""
            if trophy_word:
                rows.append(
                    _make_row(
                        path_id=path_id,
                        lesson_id=lesson_id,
                        lesson_number=lesson_number,
                        vibe=vibe,
                        surface="trophyWord",
                        surface_key="__self",
                        text=trophy_word,
                        target_language_code=target_language_code,
                    )
                )

        if "speak" in requested_surfaces:
            speak_phrase = (variant.get("speakTarget") or {}).get("targetPhrase") or ""
            if speak_phrase:
                normalized_speak = normalize_spoken_text(speak_phrase)
                # Dedupe against corePhrase if normalized texts match.
                if normalized_speak and normalized_speak != normalized_core:
                    rows.append(
                        _make_row(
                            path_id=path_id,
                            lesson_id=lesson_id,
                            lesson_number=lesson_number,
                            vibe=vibe,
                            surface="speakTarget",
                            surface_key="__self",
                            text=speak_phrase,
                            target_language_code=target_language_code,
                        )
                    )

    return rows


# ---------------------------------------------------------------------------
# Inventory builder
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InventoryItem:
    row: SurfaceRow
    status: str                       # 'ready' | 'missing' | 'missing_voice_profile'
    voice_profile_key: str | None
    provider_voice_id: str | None
    provider_model_id: str | None
    output_format: str | None
    voice_settings_hash: str | None
    cache_key: str | None
    storage_path: str | None
    character_count: int
    asset_id: str | None = None       # set when status == 'ready'


def build_inventory(
    *,
    lessons: Sequence[dict[str, Any]],
    voice_profiles: Sequence[VoiceProfile],
    existing_assets_by_cache_key: dict[str, dict[str, Any]] | None = None,
    vibes: Iterable[str] | None = None,
    surfaces: Iterable[str] | None = None,
    target_language_code: str = "en-US",
) -> dict[str, Any]:
    """Build the canary inventory.

    ``existing_assets_by_cache_key`` is the (already-fetched) lookup of
    ``guided_tts_assets`` rows keyed by ``cache_key``. Pass an empty mapping
    when running offline; the script then reports every row as ``missing``.

    The result is JSON-serializable and contains both the per-row detail and
    aggregate roll-ups described in the architecture report §7.
    """
    existing = existing_assets_by_cache_key or {}
    items: list[InventoryItem] = []

    rows: list[SurfaceRow] = []
    for lesson in lessons:
        rows.extend(
            extract_lesson_surfaces(
                lesson=lesson,
                vibes=vibes,
                surfaces=surfaces,
                target_language_code=target_language_code,
            )
        )

    unresolved_combinations: set[tuple[str, str, str]] = set()  # (vibe, lang, surface)

    for row in rows:
        profile = resolve_voice_profile(
            voice_profiles,
            target_language_code=row.target_language_code,
            vibe=row.vibe,
            path_id=row.path_id,
            lesson_id=row.lesson_id,
            surface=row.surface,
        )

        if profile is None:
            unresolved_combinations.add(
                (row.target_language_code, row.vibe, row.surface)
            )
            items.append(
                InventoryItem(
                    row=row,
                    status=_ASSET_STATUS_UNRESOLVED_VOICE,
                    voice_profile_key=None,
                    provider_voice_id=None,
                    provider_model_id=None,
                    output_format=None,
                    voice_settings_hash=None,
                    cache_key=None,
                    storage_path=None,
                    character_count=len(row.normalized_text),
                )
            )
            continue

        ck = cache_key(
            provider=profile.provider,
            target_language_code=row.target_language_code,
            voice_profile_key=profile.voice_profile_key,
            provider_voice_id=profile.provider_voice_id,
            provider_model_id=profile.provider_model_id,
            output_format=profile.output_format,
            settings_hash=profile.voice_settings_hash,
            normalization_version=NORMALIZATION_VERSION,
            text_hash_value=row.text_hash,
        )
        sp = storage_path(
            target_language_code=row.target_language_code,
            voice_profile_key=profile.voice_profile_key,
            provider_voice_id=profile.provider_voice_id,
            provider_model_id=profile.provider_model_id,
            output_format=profile.output_format,
            settings_hash=profile.voice_settings_hash,
            text_hash_value=row.text_hash,
        )
        cached = existing.get(ck)
        if cached and cached.get("status") == "ready":
            status = _ASSET_STATUS_READY
            asset_id = cached.get("id")
        else:
            status = _ASSET_STATUS_MISSING
            asset_id = None

        items.append(
            InventoryItem(
                row=row,
                status=status,
                voice_profile_key=profile.voice_profile_key,
                provider_voice_id=profile.provider_voice_id,
                provider_model_id=profile.provider_model_id,
                output_format=profile.output_format,
                voice_settings_hash=profile.voice_settings_hash,
                cache_key=ck,
                storage_path=sp,
                character_count=len(row.normalized_text),
                asset_id=asset_id,
            )
        )

    return _summarize(items, unresolved_combinations)


def _summarize(
    items: Sequence[InventoryItem],
    unresolved_combinations: set[tuple[str, str, str]],
) -> dict[str, Any]:
    ready_count = sum(1 for it in items if it.status == _ASSET_STATUS_READY)
    missing_count = sum(1 for it in items if it.status == _ASSET_STATUS_MISSING)
    unresolved_count = sum(
        1 for it in items if it.status == _ASSET_STATUS_UNRESOLVED_VOICE
    )

    # Per-voice character count, deduped across rows that resolve to the
    # same (voice_profile_key, text_hash). Reruns of identical text against
    # the same voice profile would land in the same cache key, so we only
    # count distinct cache keys.
    per_voice: dict[str, dict[str, Any]] = {}
    seen_cache_keys: set[str] = set()
    duplicates_skipped = 0

    for item in items:
        if item.status == _ASSET_STATUS_UNRESOLVED_VOICE:
            continue
        if item.cache_key is None or item.voice_profile_key is None:
            continue
        if item.cache_key in seen_cache_keys:
            duplicates_skipped += 1
            continue
        seen_cache_keys.add(item.cache_key)
        entry = per_voice.setdefault(
            item.voice_profile_key,
            {
                "voice_profile_key": item.voice_profile_key,
                "provider_voice_id": item.provider_voice_id,
                "provider_model_id": item.provider_model_id,
                "output_format": item.output_format,
                "character_count": 0,
                "unique_texts": 0,
                "ready": 0,
                "missing": 0,
            },
        )
        entry["character_count"] += item.character_count
        entry["unique_texts"] += 1
        if item.status == _ASSET_STATUS_READY:
            entry["ready"] += 1
        else:
            entry["missing"] += 1

    # Cross-voice unique-text count (ignoring voice identity) — the count of
    # distinct normalized texts in the requested scope.
    unique_texts_ignoring_voice = len(
        {item.row.text_hash for item in items if item.row.text_hash}
    )

    estimated_provider_calls = sum(entry["missing"] for entry in per_voice.values())
    total_character_count = sum(entry["character_count"] for entry in per_voice.values())
    estimated_provider_characters = sum(
        item.character_count
        for item in items
        if item.status == _ASSET_STATUS_MISSING
    )

    return {
        "normalization_version": NORMALIZATION_VERSION,
        "totals": {
            "rows": len(items),
            "ready": ready_count,
            "missing": missing_count,
            "missing_voice_profile": unresolved_count,
            "unique_normalized_texts": unique_texts_ignoring_voice,
            "unique_cache_keys": len(seen_cache_keys),
            "duplicates_skipped": duplicates_skipped,
            "estimated_provider_calls": estimated_provider_calls,
            "estimated_provider_characters": estimated_provider_characters,
            "total_character_count_all_voices": total_character_count,
        },
        "per_voice": sorted(per_voice.values(), key=lambda e: e["voice_profile_key"]),
        "voices_unresolved": [
            {"target_language_code": lang, "vibe": vibe, "surface": surface}
            for (lang, vibe, surface) in sorted(unresolved_combinations)
        ],
        "items": [_item_to_dict(item) for item in items],
    }


def _item_to_dict(item: InventoryItem) -> dict[str, Any]:
    row = item.row
    return {
        "path_id": row.path_id,
        "lesson_id": row.lesson_id,
        "lesson_number": row.lesson_number,
        "vibe": row.vibe,
        "surface": row.surface,
        "surface_key": row.surface_key,
        "source_text": row.source_text,
        "normalized_text": row.normalized_text,
        "text_hash": row.text_hash,
        "target_language_code": row.target_language_code,
        "status": item.status,
        "voice_profile_key": item.voice_profile_key,
        "provider_voice_id": item.provider_voice_id,
        "provider_model_id": item.provider_model_id,
        "output_format": item.output_format,
        "voice_settings_hash": item.voice_settings_hash,
        "cache_key": item.cache_key,
        "storage_path": item.storage_path,
        "character_count": item.character_count,
        "asset_id": item.asset_id,
    }


def filter_lessons(
    lessons: Sequence[dict[str, Any]],
    *,
    path_id: str | None = None,
    path_ids: Iterable[str] | None = None,
    lesson_number: int | None = None,
    lesson_id: str | None = None,
) -> list[dict[str, Any]]:
    """Narrow a list of lesson dicts by path, lesson number, and/or lesson id."""
    out: list[dict[str, Any]] = []
    path_id_set = set(path_ids or [])
    for lesson in lessons:
        if path_id is not None and lesson.get("pathId") != path_id:
            continue
        if path_id_set and lesson.get("pathId") not in path_id_set:
            continue
        if lesson_number is not None and int(lesson.get("lessonNumber", -1)) != lesson_number:
            continue
        if lesson_id is not None and lesson.get("id") != lesson_id:
            continue
        out.append(lesson)
    return out


__all__ = [
    "NORMALIZATION_VERSION",
    "DEFAULT_PROVIDER",
    "DEFAULT_MODEL_ID",
    "DEFAULT_OUTPUT_FORMAT",
    "DEFAULT_VOICE_SETTINGS",
    "VALID_VIBES",
    "VALID_SURFACES",
    "VoiceProfile",
    "SurfaceRow",
    "InventoryItem",
    "normalize_spoken_text",
    "text_hash",
    "voice_settings_hash",
    "cache_key",
    "storage_path",
    "resolve_voice_profile",
    "extract_lesson_surfaces",
    "build_inventory",
    "filter_lessons",
]
