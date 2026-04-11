from __future__ import annotations

import json
import os
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from .. import state
from ..manifest import create_manifest, now_iso, read_manifest, write_manifest
from ..settings import DEFAULT_SETTINGS, load_defaults
from ..slugify import SUPPORTED_LANGUAGES, language_to_code, slugify
from ..workspace import create_word_folder, get_word_dir, list_word_dirs

router = APIRouter()

_suggest_rate_limit: dict[str, list[float]] = defaultdict(list)
SUGGEST_RATE_LIMIT = 10
SUGGEST_RATE_WINDOW = 60


class SuggestWordsRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    target_language: str = Field(..., min_length=1, max_length=50)
    base_language: str = Field("English", min_length=1, max_length=50)
    count: int = Field(5, ge=1, le=10)


_SUGGEST_SYSTEM_PROMPT_TEMPLATE = (
    "You are a vocabulary suggestion engine. Given a category and target language, "
    "suggest exactly {count} words or short phrases that a language learner would find "
    "interesting and useful.\n\n"
    "CRITICAL: Respond with ONLY valid JSON. No markdown, no explanation, no code blocks.\n\n"
    "Output format:\n"
    "{{\n"
    '  "words": [\n'
    "    {{\n"
    '      "word": "word/phrase in target language",\n'
    '      "translation": "translation in {base_language}"\n'
    "    }}\n"
    "  ]\n"
    "}}\n\n"
    "Rules:\n"
    "- Choose culturally authentic, interesting vocabulary \u2014 not boring textbook words\n"
    '- For "Random Mix": pick from varied categories and difficulty levels\n'
    "- All {count} entries must be unique\n"
    "- Keep translations concise (1-4 words)\n"
    "- For phrases: keep them short (2-5 words in target language)"
)


class AddWordRequest(BaseModel):
    word: str = Field(..., max_length=50)
    translation: str
    language: str
    mnemonic: Optional[str] = None
    etymology: Optional[str] = None
    example: Optional[str] = None
    tags: Optional[str] = None

    @field_validator("word", mode="before")
    @classmethod
    def normalize_word(cls, v: Any) -> Any:
        if isinstance(v, str):
            return re.sub(r"\s+", " ", v.strip())
        return v


def _compute_stage_statuses(word_dir: Path, m: Any) -> dict:
    statuses = {}
    stage_map = {
        "concept": ("concept", m.selected.concept),
        "song": ("songs", m.selected.song),
        "images": ("images", m.selected.images),
        "video": ("videos", m.selected.video),
        "final": ("final", m.selected.final),
        "bookend": ("bookend", m.selected.bookend),
    }
    for stage_name, (folder, selected) in stage_map.items():
        stage_dir = word_dir / folder
        if stage_name == "concept":
            versions = list(stage_dir.glob("*.json")) if stage_dir.exists() else []
            versions = [v for v in versions if v.name != "generation-meta.json"]
        else:
            versions = [d for d in stage_dir.iterdir() if d.is_dir()] if stage_dir.exists() else []

        failed = any(e.stage == stage_name and e.status == "failed" for e in m.lineage)
        has_success = any(e.stage == stage_name and e.status == "success" for e in m.lineage)

        if selected:
            status = "done"
        elif has_success and not selected:
            status = "pending_selection"
        elif failed and not versions:
            status = "failed"
        elif versions:
            status = "pending_selection"
        else:
            status = "empty"

        statuses[stage_name] = {
            "status": status,
            "version_count": len(versions),
            "selected": selected,
        }
    return statuses


def _compute_stages_detail(word_dir: Path, m: Any) -> dict:
    detail = {}
    lineage_status: dict[str, str] = {}
    for entry in m.lineage:
        lineage_status[entry.version] = entry.status

    concept_dir = word_dir / "concept"
    concept_versions = []
    if concept_dir.exists():
        for f in sorted(concept_dir.glob("*.json")):
            if f.name != "generation-meta.json":
                concept_versions.append({
                    "name": f.name,
                    "selected": m.selected.concept == f.name,
                    "status": lineage_status.get(f.name, "unknown"),
                })
    detail["concept"] = {"versions": concept_versions, "selected": m.selected.concept}

    songs_dir = word_dir / "songs"
    song_versions = []
    if songs_dir.exists():
        for vdir in sorted(songs_dir.iterdir()):
            if vdir.is_dir():
                takes = sorted([f.name for f in vdir.glob("*.flac")] +
                               [f.name for f in vdir.glob("*.wav")] +
                               [f.name for f in vdir.glob("*.mp3")])
                song_versions.append({
                    "version": vdir.name,
                    "takes": takes,
                    "selected": m.selected.song and m.selected.song.startswith(vdir.name),
                    "selected_take": m.selected.song,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail["song"] = {"versions": song_versions, "selected": m.selected.song}

    images_dir = word_dir / "images"
    image_versions = []
    if images_dir.exists():
        for vdir in sorted(images_dir.iterdir()):
            if vdir.is_dir():
                images = sorted([f.name for f in vdir.glob("*.png")] +
                                [f.name for f in vdir.glob("*.jpg")])
                storyboard = None
                sb_file = vdir / "storyboard.json"
                if sb_file.exists():
                    with open(sb_file, "r") as f:
                        try:
                            storyboard = json.load(f)
                        except Exception:
                            pass
                image_versions.append({
                    "version": vdir.name,
                    "images": images,
                    "storyboard": storyboard,
                    "selected": m.selected.images == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail["images"] = {"versions": image_versions, "selected": m.selected.images}

    videos_dir = word_dir / "videos"
    video_versions = []
    if videos_dir.exists():
        for vdir in sorted(videos_dir.iterdir()):
            if vdir.is_dir():
                clips = sorted([f.name for f in vdir.glob("scene_*.mp4")])
                thumbs = sorted([f.name for f in vdir.glob("scene_*_thumb.jpg")])
                video_versions.append({
                    "version": vdir.name,
                    "clips": clips,
                    "thumbnails": thumbs,
                    "selected": m.selected.video == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail["video"] = {"versions": video_versions, "selected": m.selected.video}

    final_dir = word_dir / "final"
    final_versions = []
    if final_dir.exists():
        for vdir in sorted(final_dir.iterdir()):
            if vdir.is_dir():
                mp4s = sorted([f.name for f in vdir.glob("*.mp4")])
                final_versions.append({
                    "version": vdir.name,
                    "files": mp4s,
                    "selected": m.selected.final == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail["final"] = {"versions": final_versions, "selected": m.selected.final}

    bookend_dir = word_dir / "bookend"
    bookend_versions = []
    if bookend_dir.exists():
        for vdir in sorted(bookend_dir.iterdir()):
            if vdir.is_dir():
                mp4s = sorted([f.name for f in vdir.glob("*.mp4")])
                bookend_versions.append({
                    "version": vdir.name,
                    "files": mp4s,
                    "selected": m.selected.bookend == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail["bookend"] = {"versions": bookend_versions, "selected": m.selected.bookend}

    return detail


@router.post("/api/suggest-words")
async def suggest_words(body: SuggestWordsRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    _suggest_rate_limit[client_ip] = [
        t for t in _suggest_rate_limit[client_ip] if now - t < SUGGEST_RATE_WINDOW
    ]
    if len(_suggest_rate_limit[client_ip]) >= SUGGEST_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")
    _suggest_rate_limit[client_ip].append(now)

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not set")

    model = DEFAULT_SETTINGS["concept"].get("llm_model", "deepseek/deepseek-v3.2")
    count = body.count

    system_prompt = _SUGGEST_SYSTEM_PROMPT_TEMPLATE.format(
        count=count, base_language=body.base_language
    )
    user_prompt = (
        f"Suggest {count} {body.category} words/phrases for learning {body.target_language}.\n"
        f"Make them interesting, natural, and actually useful for real conversations."
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 500,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        stripped = content.strip()
        if stripped.startswith("```"):
            stripped = re.sub(r"^```[a-zA-Z]*\n?", "", stripped)
            stripped = re.sub(r"\n?```$", "", stripped)
        parsed = json.loads(stripped)
        words = parsed.get("words", [])
        if not isinstance(words, list) or not words:
            raise ValueError("LLM response missing 'words' array")
        cleaned = [
            {"word": str(w.get("word", "")).strip(), "translation": str(w.get("translation", "")).strip()}
            for w in words
            if isinstance(w, dict) and w.get("word")
        ]
        if not cleaned:
            raise ValueError("No valid word entries in LLM response")
        return {"words": cleaned}
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        status = 429 if e.response.status_code == 429 else 502
        raise HTTPException(status_code=status, detail="Word suggestion service unavailable")
    except (json.JSONDecodeError, KeyError, ValueError):
        raise HTTPException(status_code=502, detail="Invalid response from word suggestion service")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Word suggestion service unreachable")


@router.get("/api/words")
async def list_words():
    word_dirs = list_word_dirs(state.WORKSPACE_PATH)
    words = []
    for wd in word_dirs:
        try:
            m = read_manifest(wd)
            stages = _compute_stage_statuses(wd, m)
            words.append({
                "word_original": m.word_original,
                "word_slug": m.word_slug,
                "translation": m.translation,
                "language": m.language,
                "stages": stages,
                "updated_at": m.updated_at,
                "muted": m.muted,
                "approved": m.approved,
            })
        except Exception as e:
            words.append({"word_slug": wd.name, "error": str(e)})
    return words


@router.post("/api/words")
async def add_word(body: AddWordRequest):
    word = body.word
    translation = body.translation.strip()
    language = body.language.strip()

    if not word or not translation or not language:
        raise HTTPException(400, "word, translation, and language are required")

    input_type = "phrase" if " " in word else "word"

    word_slug = slugify(word)
    lang_code = language_to_code(language)
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)

    if (word_dir / "manifest.json").exists():
        raise HTTPException(409, f"Word '{word}' already exists as '{word_slug}'")

    enrichment = {}
    if body.mnemonic:
        enrichment["mnemonic"] = body.mnemonic
    if body.etymology:
        enrichment["etymology"] = body.etymology
    if body.example:
        enrichment["example"] = body.example
    if body.tags:
        enrichment["tags"] = body.tags

    create_word_folder(state.WORKSPACE_PATH, word_slug)
    create_manifest(
        word_dir=word_dir,
        word_original=word,
        word_slug=word_slug,
        translation=translation,
        language=language,
        language_code=lang_code,
        enrichment_data=enrichment if enrichment else None,
        input_type=input_type,
    )

    return {"ok": True, "word_slug": word_slug}


@router.get("/api/words/{word_slug}")
async def get_word(word_slug: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")

    m = read_manifest(word_dir)
    stages_detail = _compute_stages_detail(word_dir, m)

    return {
        "manifest": m.model_dump(),
        "stages": stages_detail,
    }


@router.get("/api/words/{word_slug}/manifest")
async def get_manifest(word_slug: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)
    return m.model_dump()


@router.delete("/api/words/{word_slug}")
async def delete_word(word_slug: str):
    import shutil

    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not word_dir.exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    shutil.rmtree(word_dir)
    return {"ok": True, "deleted": word_slug}


@router.post("/api/words/{word_slug}/mute")
async def toggle_mute(word_slug: str, body: dict):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)
    m.muted = bool(body.get("muted", False))
    m.updated_at = now_iso()
    write_manifest(word_dir, m)
    return {"ok": True}


@router.post("/api/words/mute-all")
async def mute_all(body: dict):
    muted = bool(body.get("muted", False))
    word_dirs = list_word_dirs(state.WORKSPACE_PATH)
    count = 0
    for wd in word_dirs:
        if (wd / "manifest.json").exists():
            m = read_manifest(wd)
            m.muted = muted
            m.updated_at = now_iso()
            write_manifest(wd, m)
            count += 1
    return {"ok": True, "count": count}


@router.put("/api/words/{word_slug}/approve")
async def toggle_approve(word_slug: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)

    if m.approved:
        m.approved = False
        write_manifest(word_dir, m)
        return {"ok": True, "approved": False}

    defaults = load_defaults(state.WORKSPACE_PATH)
    bookend_defaults = defaults.get("bookend", {})
    bookend_word = m.settings.get("bookend", {})
    bookend_enabled = {**bookend_defaults, **bookend_word}.get("enabled", True)

    required_stages = [
        ("concept", "concept"), ("song", "song"), ("images", "images"),
        ("video", "video"), ("assembly", "final"),
    ]
    if bookend_enabled:
        required_stages.append(("bookend", "bookend"))

    missing = []
    for stage_name, field_name in required_stages:
        if not getattr(m.selected, field_name):
            missing.append(stage_name)

    if missing:
        raise HTTPException(
            400,
            f"Cannot approve: missing selections for {', '.join(missing)}"
        )

    m.approved = True
    write_manifest(word_dir, m)
    return {"ok": True, "approved": True}


@router.get("/api/languages")
async def list_languages():
    return SUPPORTED_LANGUAGES
