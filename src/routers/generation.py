from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .. import state
from ..dispatcher import EngineUnreachableError, call_engine
from ..manifest import (
    add_lineage,
    now_iso,
    read_manifest,
    remove_version,
    update_selection,
    update_settings,
    write_manifest,
)
from ..pipeline import PipelineError, STAGE_DIR_MAP, STAGE_ORDER, run_stage
from ..settings import load_defaults
from ..suno import generate_song as suno_generate_song
from ..workspace import create_version_dir, get_word_dir, list_word_dirs, make_version_label

logger = logging.getLogger(__name__)

router = APIRouter()


class TrimRequest(BaseModel):
    source_version: str
    trim_start: float
    trim_end: float


class RunWordPipelineRequest(BaseModel):
    start_from: Optional[str] = None


@router.put("/api/words/{word_slug}/settings/{stage}")
async def put_word_settings(word_slug: str, stage: str, body: dict):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404)
    m = update_settings(word_dir, stage, body)
    return {"ok": True, "settings": m.settings.get(stage, {})}


@router.get("/api/words/{word_slug}/settings/{stage}")
async def get_word_settings(word_slug: str, stage: str):
    from ..settings import resolve_settings

    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404)
    m = read_manifest(word_dir)
    defaults = load_defaults(state.WORKSPACE_PATH)
    overrides = m.settings.get(stage, {})
    effective = resolve_settings(stage, m.settings, defaults)
    return {
        "effective": effective,
        "overrides": overrides,
        "defaults": defaults.get(stage, {}),
    }


@router.delete("/api/words/{word_slug}/settings/{stage}")
async def delete_word_settings(word_slug: str, stage: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404)
    m = read_manifest(word_dir)
    if stage in m.settings:
        m.settings[stage] = {}
    write_manifest(word_dir, m)
    return {"ok": True}


@router.put("/api/words/{word_slug}/select/{stage}")
async def select_version(word_slug: str, stage: str, body: dict):
    version = body.get("version")
    if not version:
        raise HTTPException(400, "version required")
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404)
    m = update_selection(word_dir, stage, version)
    sel_field = "final" if stage == "assembly" else stage
    return {"ok": True, "selected": getattr(m.selected, sel_field, None)}


@router.post("/api/words/{word_slug}/run/{stage}")
async def run_word_stage(word_slug: str, stage: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    try:
        result = await run_stage(state.WORKSPACE_PATH, word_slug, stage)
        return result
    except PipelineError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.delete("/api/words/{word_slug}/images/{version}/{filename}")
async def delete_image(word_slug: str, version: str, filename: str):
    img_path = get_word_dir(state.WORKSPACE_PATH, word_slug) / "images" / version / filename
    if not img_path.exists():
        raise HTTPException(404, "Image not found")
    if not img_path.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
        raise HTTPException(400, "Not an image file")
    img_path.unlink()
    return {"ok": True, "deleted": filename}


@router.delete("/api/words/{word_slug}/versions/{stage}/{version:path}")
async def delete_version(word_slug: str, stage: str, version: str):
    import shutil

    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    stage_folder = STAGE_DIR_MAP.get(stage, stage)
    version_path = word_dir / stage_folder / version
    if not version_path.exists():
        raise HTTPException(404, "Version not found")
    try:
        if version_path.is_dir():
            shutil.rmtree(version_path)
        else:
            version_path.unlink()
        remove_version(word_dir, stage, version)
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"ok": True, "deleted": version}


@router.get("/api/words/{word_slug}/concept/{version}")
async def get_concept_artifact(word_slug: str, version: str):
    path = get_word_dir(state.WORKSPACE_PATH, word_slug) / "concept" / version
    if not path.exists():
        raise HTTPException(404)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.put("/api/words/{word_slug}/concept/{version}")
async def save_concept_edit(word_slug: str, version: str, body: dict):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    original_path = word_dir / "concept" / version

    if not original_path.exists():
        raise HTTPException(404, "Original concept not found")

    with open(original_path, "r", encoding="utf-8") as f:
        original = json.load(f)

    original.update({k: v for k, v in body.items() if k in ("lyrics", "music_caption", "visual_hint")})

    base = version.replace(".json", "")
    ts = now_iso().replace(":", "").replace("-", "").replace("Z", "").replace("T", "T")
    new_name = f"{base}-edit_{ts[:15]}.json"
    new_path = word_dir / "concept" / new_name

    with open(new_path, "w", encoding="utf-8") as f:
        json.dump(original, f, indent=2, ensure_ascii=False)

    add_lineage(word_dir, "concept", new_name, {"edited_from": version}, {}, "success")

    return {"ok": True, "new_version": new_name}


@router.post("/api/words/{word_slug}/trim/assembly")
async def trim_assembly(word_slug: str, body: TrimRequest):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)

    stage_dir = word_dir / "final"
    source_file = stage_dir / body.source_version / "final.mp4"
    if not source_file.exists():
        raise HTTPException(404, f"Source file not found: {body.source_version}/final.mp4")

    if body.trim_start < 0:
        raise HTTPException(400, "trim_start must be >= 0")
    if body.trim_end <= body.trim_start:
        raise HTTPException(400, "trim_end must be greater than trim_start")
    if body.trim_end - body.trim_start < 1.0:
        raise HTTPException(400, "Trimmed duration must be at least 1 second")

    label = make_version_label("assembly", {"assembly_mode": "trim"}, stage_dir)
    output_dir, version_name = create_version_dir(stage_dir, label)

    manifest = read_manifest(word_dir)

    payload = {
        "source_path": str(source_file),
        "trim_start": body.trim_start,
        "trim_end": body.trim_end,
        "output_dir": str(output_dir),
        "settings": {
            "video_codec": "libx264",
            "video_preset": "slow",
            "video_crf": 18,
            "audio_codec": "aac",
            "audio_bitrate": "320k",
        },
        "metadata": {
            "word": manifest.word_original,
            "language": manifest.language,
            "translation": manifest.translation,
            "timestamp": now_iso(),
            "source_version": body.source_version,
        },
    }

    try:
        result = await call_engine("assembly", payload, endpoint="/trim")
    except EngineUnreachableError as e:
        raise HTTPException(503, str(e))
    except TimeoutError as e:
        raise HTTPException(504, str(e))

    status = result.get("status", "failed")

    from_versions = {"trimmed_from": body.source_version}
    settings_snapshot = {"trim_start": body.trim_start, "trim_end": body.trim_end}
    add_lineage(word_dir, "assembly", version_name, from_versions, settings_snapshot, status)

    if status == "success":
        update_selection(word_dir, "assembly", version_name)

    return {"stage": "assembly", "version": version_name, "result": result}


@router.post("/api/autopilot/run")
async def start_autopilot(body: dict):
    if state.autopilot_state["running"]:
        raise HTTPException(409, "Autopilot already running")
    if any(s.get("running") for s in state.word_pipeline_state.values()):
        raise HTTPException(409, "A word pipeline is running \u2014 wait for it to finish")

    word_slugs = body.get("word_slugs")
    pause_at_song = body.get("pause_at_song", False)

    if not word_slugs:
        word_dirs = list_word_dirs(state.WORKSPACE_PATH)
        word_slugs = [wd.name for wd in word_dirs]

    filtered = []
    for s in word_slugs:
        wd = get_word_dir(state.WORKSPACE_PATH, s)
        if (wd / "manifest.json").exists():
            m = read_manifest(wd)
            if not m.muted:
                filtered.append(s)
        else:
            filtered.append(s)
    word_slugs = filtered

    if not word_slugs:
        return JSONResponse(
            {"error": "All words are muted. Unmute some words before running."},
            status_code=400,
        )

    state.autopilot_state = {
        "running": True,
        "cancelled": False,
        "progress": [],
        "current_word": None,
        "current_stage": None,
        "total": len(word_slugs),
        "done": 0,
        "errors": [],
        "pause_at_song": pause_at_song,
        "paused_for_song_selection": False,
        "paused_word": None,
    }

    asyncio.create_task(_run_autopilot(word_slugs))
    return {"ok": True, "word_count": len(word_slugs)}


@router.post("/api/autopilot/cancel")
async def cancel_autopilot():
    state.autopilot_state["cancelled"] = True
    return {"ok": True}


@router.post("/api/autopilot/resume")
async def resume_autopilot():
    state.autopilot_state["paused_for_song_selection"] = False
    return {"ok": True}


@router.get("/api/autopilot/status")
async def autopilot_status():
    return state.autopilot_state


async def _run_autopilot(word_slugs: list[str]):
    try:
        for slug in word_slugs:
            if state.autopilot_state["cancelled"]:
                break

            state.autopilot_state["current_word"] = slug
            word_dir = get_word_dir(state.WORKSPACE_PATH, slug)

            if not (word_dir / "manifest.json").exists():
                state.autopilot_state["errors"].append(f"{slug}: no manifest")
                state.autopilot_state["done"] += 1
                continue

            m = read_manifest(word_dir)
            stages_to_run = _get_incomplete_stages(word_dir, m)

            word_errors = []
            for stage_name in stages_to_run:
                if state.autopilot_state["cancelled"]:
                    break

                if stage_name == "song" and state.autopilot_state.get("pause_at_song"):
                    state.autopilot_state["paused_for_song_selection"] = True
                    state.autopilot_state["paused_word"] = slug
                    while state.autopilot_state.get("paused_for_song_selection") and not state.autopilot_state["cancelled"]:
                        await asyncio.sleep(1)
                    if state.autopilot_state["cancelled"]:
                        break
                    m = read_manifest(word_dir)
                    if m.selected.song:
                        continue

                state.autopilot_state["current_stage"] = stage_name
                msg = f"{slug}: running {stage_name}..."
                state.autopilot_state["progress"].append(msg)

                try:
                    await run_stage(state.WORKSPACE_PATH, slug, stage_name)
                except Exception as e:
                    err = f"{slug}/{stage_name}: {e}"
                    state.autopilot_state["errors"].append(err)
                    state.autopilot_state["progress"].append(f"  \u2717 {err}")
                    word_errors.append(stage_name)
                    break

                state.autopilot_state["progress"].append(f"  \u2713 {slug}/{stage_name} done")

            if not word_errors and not state.autopilot_state["cancelled"]:
                await _maybe_trigger_suno(slug)
            state.autopilot_state["done"] += 1

    finally:
        state.autopilot_state["running"] = False
        state.autopilot_state["current_word"] = None
        state.autopilot_state["current_stage"] = None


def _parse_workspace_identity() -> tuple[str, str] | None:
    parts = state.WORKSPACE_PATH.name.split("_", 2)
    if len(parts) == 3 and parts[0] == "cloud":
        return parts[1], parts[2]
    return None


async def _maybe_trigger_suno(word_slug: str) -> None:
    try:
        logger.info("[Suno] Checking auto-trigger for %s...", word_slug)
        defaults = load_defaults(state.WORKSPACE_PATH)
        if not defaults.get("suno", {}).get("enabled", False):
            logger.info(
                "[Suno] Skipping %s: auto-trigger disabled (suno.enabled=false in %s)",
                word_slug,
                state.WORKSPACE_PATH / "settings-defaults.json",
            )
            return

        identity = _parse_workspace_identity()
        if not identity:
            logger.warning("[Suno] Cannot auto-trigger: workspace '%s' is not a cloud workspace", state.WORKSPACE_PATH.name)
            return
        user_id, deck_id = identity
        logger.info("[Suno] Workspace identity: user_id=%s, deck_id=%s", user_id, deck_id)

        word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
        m = read_manifest(word_dir)
        if not m.selected.bookend:
            logger.info("[Suno] Skipping auto-trigger for %s: bookend not selected", word_slug)
            return

        logger.info("[Suno] Auto-generating for %s...", word_slug)
        result = await suno_generate_song(str(state.WORKSPACE_PATH.parent), user_id, deck_id, word_slug)
        if result.get("status") == "success":
            logger.info("[Suno] Success for %s: %s", word_slug, result.get("audio_url", "N/A"))
        else:
            logger.warning("[Suno] Failed for %s: %s", word_slug, result.get("error", "unknown"))
    except Exception as e:
        logger.error("[Suno] Error for %s: %s", word_slug, e)


def _get_incomplete_stages(word_dir: Path, m: Any) -> list[str]:
    defaults = load_defaults(word_dir.parent)
    bookend_defaults = defaults.get("bookend", {})
    bookend_word = m.settings.get("bookend", {})
    bookend_enabled = {**bookend_defaults, **bookend_word}.get("enabled", True)

    stages = []
    for stage_name in STAGE_ORDER:
        if stage_name == "bookend" and not bookend_enabled:
            continue
        sel = getattr(m.selected, "final" if stage_name == "assembly" else stage_name, None)
        if sel is None:
            stages.append(stage_name)
    return stages


@router.post("/api/words/{word_slug}/pipeline/start")
async def start_word_pipeline(word_slug: str, body: RunWordPipelineRequest = RunWordPipelineRequest()):
    if state.autopilot_state["running"]:
        raise HTTPException(409, "Batch autopilot is running \u2014 wait for it to finish")
    if state.word_pipeline_state.get(word_slug, {}).get("running"):
        raise HTTPException(409, "Pipeline already running for this word")

    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    if not (word_dir / "manifest.json").exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")

    m = read_manifest(word_dir)

    if body.start_from and body.start_from in STAGE_ORDER:
        idx = STAGE_ORDER.index(body.start_from)
        stages = STAGE_ORDER[idx:]
    else:
        stages = _get_incomplete_stages(word_dir, m)

    if not stages:
        return {"ok": True, "stages": [], "message": "All stages already complete"}

    state.word_pipeline_state[word_slug] = {
        "running": True,
        "cancelled": False,
        "current_stage": None,
        "completed_stages": [],
        "stages_remaining": list(stages),
        "paused_for_song": False,
        "error": None,
        "progress": [],
    }

    asyncio.create_task(_run_word_pipeline(word_slug))
    return {"ok": True, "stages": stages}


@router.get("/api/words/{word_slug}/pipeline/status")
async def get_word_pipeline_status(word_slug: str):
    return state.word_pipeline_state.get(word_slug, {"running": False})


@router.post("/api/words/{word_slug}/pipeline/cancel")
async def cancel_word_pipeline(word_slug: str):
    if word_slug in state.word_pipeline_state:
        state.word_pipeline_state[word_slug]["cancelled"] = True
        state.word_pipeline_state[word_slug]["paused_for_song"] = False
    return {"ok": True}


@router.post("/api/words/{word_slug}/pipeline/resume")
async def resume_word_pipeline(word_slug: str):
    if word_slug in state.word_pipeline_state:
        state.word_pipeline_state[word_slug]["paused_for_song"] = False
    return {"ok": True}


async def _run_word_pipeline(word_slug: str):
    from ..settings import resolve_settings

    run_state = state.word_pipeline_state[word_slug]
    try:
        word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
        stages = list(run_state["stages_remaining"])

        for stage_name in stages:
            if run_state["cancelled"]:
                run_state["progress"].append("Cancelled")
                break

            run_state["current_stage"] = stage_name
            run_state["progress"].append(f"Running {stage_name}...")

            try:
                await run_stage(state.WORKSPACE_PATH, word_slug, stage_name)
            except Exception as e:
                run_state["error"] = {"stage": stage_name, "message": str(e)}
                run_state["progress"].append(f"Failed at {stage_name}: {e}")
                break

            run_state["completed_stages"].append(stage_name)
            run_state["progress"].append(f"{stage_name} done")

            if stage_name == "song":
                m = read_manifest(word_dir)
                defaults = load_defaults(state.WORKSPACE_PATH)
                song_settings = resolve_settings("song", m.settings, defaults)
                batch_size = song_settings.get("batch_size", 1)

                if batch_size > 1:
                    songs_dir = word_dir / "songs"
                    if songs_dir.exists():
                        version_dirs = sorted([d for d in songs_dir.iterdir() if d.is_dir()])
                        if version_dirs:
                            latest = version_dirs[-1]
                            takes = list(latest.glob("*.flac")) + list(latest.glob("*.wav")) + list(latest.glob("*.mp3"))
                            if len(takes) > 1:
                                run_state["paused_for_song"] = True
                                run_state["progress"].append("Paused: select a song take, then continue")
                                while run_state["paused_for_song"] and not run_state["cancelled"]:
                                    await asyncio.sleep(1)
                                if run_state["cancelled"]:
                                    run_state["progress"].append("Cancelled")
                                    break

        if not run_state["error"] and not run_state["cancelled"]:
            run_state["progress"].append("Pipeline complete")
            await _maybe_trigger_suno(word_slug)

    finally:
        run_state["running"] = False
        run_state["current_stage"] = None


@router.get("/api/words/{word_slug}/stages/{stage}/{version}/meta")
async def get_generation_meta(word_slug: str, stage: str, version: str):
    word_dir = get_word_dir(state.WORKSPACE_PATH, word_slug)
    stage_folder = STAGE_DIR_MAP.get(stage, stage)
    meta_path = word_dir / stage_folder / version / "generation-meta.json"
    if not meta_path.exists():
        return {"meta": None}
    with open(meta_path) as f:
        return {"meta": json.load(f)}
