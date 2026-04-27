"""Resonance Cloud Job Runner (v2 — pipelined orchestrator).

Design: PIPELINE_REFACTOR_DESIGN_V4_FINAL.md

Entry point for the orchestrator. Performs env-var pre-flight checks, wires
queues and workers, installs the SIGTERM handler (§6.7), and drives the main
asyncio gather() loop.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from supabase import Client, create_client

from src.orchestration.state import install_correlation_filter

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
UPSTREAM_QUEUE_DEPTH = int(os.getenv("UPSTREAM_QUEUE_DEPTH", "3"))   # §5.1
VIDEO_QUEUE_DEPTH = int(os.getenv("VIDEO_QUEUE_DEPTH", "2"))         # §5.2
POST_VIDEO_QUEUE_DEPTH = int(os.getenv("POST_VIDEO_QUEUE_DEPTH", "8"))
FEEDER_POLL_INTERVAL = float(os.getenv("FEEDER_POLL_INTERVAL", "5"))
FINALIZER_POLL_INTERVAL = float(os.getenv("FINALIZER_POLL_INTERVAL", "30"))
METRICS_INTERVAL = float(os.getenv("METRICS_INTERVAL", "60"))
VIDEO_CONCURRENCY = int(os.getenv("VIDEO_CONCURRENCY", "1"))

# HIGH-5: job_runner.py owns the logging format; start_cloud.py must NOT
# call basicConfig before job_runner imports. `force=True` makes this the
# authoritative configuration even if something configured root logging
# earlier in the process (imports, supabase client init).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s word=%(word_id)s stage=%(stage)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    force=True,
)
install_correlation_filter()
log = logging.getLogger("job_runner")


def log_workspace_diagnostics() -> None:
    """Log cloud workspace durability diagnostics at startup."""
    try:
        from src.storage import STORAGE_MODE, get_workspace_root

        root = get_workspace_root()
        root_posix = root.as_posix()
        cloud_workspace_root = os.getenv("CLOUD_WORKSPACE_ROOT")
        railway_mount = os.getenv("RAILWAY_VOLUME_MOUNT_PATH")
        is_tmp = root_posix == "/tmp" or root_posix.startswith("/tmp/")

        writable = False
        probe = root / ".workspace_write_probe"
        try:
            probe.write_text("ok", encoding="utf-8")
            writable = True
        except Exception as e:
            log.warning(
                "workspace diagnostics: root is not writable path=%s error=%s",
                root, e,
            )
        finally:
            try:
                probe.unlink(missing_ok=True)
            except Exception as e:
                log.warning(
                    "workspace diagnostics: probe cleanup failed path=%s error=%s",
                    probe, e,
                )

        log.info(
            "workspace diagnostics: storage_mode=%s root=%s exists=%s writable=%s "
            "CLOUD_WORKSPACE_ROOT=%s RAILWAY_VOLUME_MOUNT_PATH=%s",
            STORAGE_MODE,
            root,
            root.exists(),
            writable,
            cloud_workspace_root,
            railway_mount,
        )

        if STORAGE_MODE == "cloud" and is_tmp:
            log.warning(
                "workspace diagnostics: CLOUD WORKSPACE IS UNDER /tmp (%s). "
                "This is ephemeral on Railway; smart retry artifacts and "
                "manifest.json will not survive container restarts. Mount a "
                "Railway volume and set CLOUD_WORKSPACE_ROOT to that mounted path.",
                root,
            )

        if STORAGE_MODE == "cloud" and railway_mount:
            mount = Path(railway_mount)
            try:
                root.relative_to(mount)
            except ValueError:
                log.warning(
                    "workspace diagnostics: root=%s is not under "
                    "RAILWAY_VOLUME_MOUNT_PATH=%s; workspaces may not be durable",
                    root, mount,
                )
    except Exception as e:
        log.warning("workspace diagnostics failed: %s", e, exc_info=True)


# ─── Supabase Client ──────────────────────────────────────────────────────────

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


sb: Client = get_supabase()


# ─── Pod credentials validation (HIGH-7) ──────────────────────────────────────
#
# §10: orchestrator reads POD_URL + POD_AUTH_TOKEN. No GPU_WORKER_* fallback
# in the startup check — legacy names add surface area without benefit. If
# Sir Robert needs to keep the legacy-named var, setting POD_URL + POD_AUTH_TOKEN
# to the same values is the migration path.

def assert_pod_credentials() -> None:
    pod_url = os.getenv("POD_URL", "")
    pod_token = os.getenv("POD_AUTH_TOKEN", "")
    missing = []
    if not pod_url:
        missing.append("POD_URL")
    if not pod_token:
        missing.append("POD_AUTH_TOKEN")
    if missing:
        msg = (
            "Missing required pod env var(s): " + ", ".join(missing) +
            ". §10 requires POD_URL and POD_AUTH_TOKEN (legacy GPU_WORKER_* "
            "names are no longer accepted in startup checks). Set them in "
            "Railway environment and redeploy."
        )
        log.error(msg)
        raise SystemExit(msg)


# ─── Settings merger (used by feeder.bootstrap_job) ───────────────────────────

SETTINGS_OVERRIDE_MAP: dict[str, tuple[str, str]] = {
    "genre": ("concept", "genre"),
    # Niveau wizard: per-generation lyric mode (Standard / Phrase / Story / Song
    # → reliable / contextual / creative / dramatic). Required so the wizard's
    # settings_override actually reaches the concept engine.
    "lyric_mode": ("concept", "lyric_mode"),
    "creative_direction": ("images", "creative_direction"),
    "art_style": ("images", "art_style"),
    "visual_reference": ("images", "visual_reference"),
    "frame_narrative": ("images", "frame_narrative"),
}


def merge_settings(
    profile_settings: dict[str, Any],
    art_style: str | None,
    movie_override: str | None,
    settings_override: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    from src.settings import DEFAULT_SETTINGS

    merged: dict[str, dict[str, Any]] = {}
    for stage, defaults in DEFAULT_SETTINGS.items():
        profile_stage = profile_settings.get(stage, {})
        merged[stage] = {**defaults, **profile_stage}

    if settings_override:
        for key, value in settings_override.items():
            if value is None or value == "":
                continue
            mapping = SETTINGS_OVERRIDE_MAP.get(key)
            if mapping is None:
                continue
            stage, field = mapping
            merged.setdefault(stage, {})[field] = value

    if art_style:
        merged.setdefault("images", {})["art_style"] = art_style
    if movie_override:
        merged.setdefault("images", {})["movie_override"] = movie_override
        merged["images"]["creative_direction"] = "movie"

    return merged


# ─── Shutdown event (MED-1 SIGTERM handler) ───────────────────────────────────

_shutdown = asyncio.Event()


def _install_signal_handlers(loop: asyncio.AbstractEventLoop) -> None:
    """Register SIGTERM/SIGINT to set _shutdown (§6.7).

    Windows note: asyncio loop.add_signal_handler is POSIX-only. On Windows
    we fall back to signal.signal which is thread-safe-enough for this
    process-wide event.
    """
    def _handler(*_a):
        log.info("job_runner: shutdown signal received")
        loop.call_soon_threadsafe(_shutdown.set)

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _handler)
        except (NotImplementedError, RuntimeError):
            try:
                signal.signal(sig, _handler)
            except Exception as e:
                log.warning("could not install %s handler: %s", sig, e)


# ─── Main orchestrator loop ───────────────────────────────────────────────────

async def main() -> None:
    log.info("Resonance Orchestrator (pipelined) starting")
    log.info("Supabase: %s", SUPABASE_URL)
    log.info(
        "Queues: upstream=%d video=%d post_video=%d",
        UPSTREAM_QUEUE_DEPTH, VIDEO_QUEUE_DEPTH, POST_VIDEO_QUEUE_DEPTH,
    )
    log_workspace_diagnostics()

    assert_pod_credentials()

    # Install signal handlers as early as possible
    try:
        _install_signal_handlers(asyncio.get_running_loop())
    except Exception as e:
        log.warning("signal-handler install failed (non-fatal): %s", e)

    # Ensure system_settings row exists
    def _check_settings():
        return (
            sb.table("system_settings")
              .select("*")
              .eq("id", 1)
              .maybe_single()
              .execute()
        )
    settings_check = await asyncio.to_thread(_check_settings)
    if not getattr(settings_check, "data", None):
        log.warning(
            "system_settings row missing — creating default "
            "(auto_approve=true, queue_paused=false)"
        )
        def _insert():
            return sb.table("system_settings").insert({
                "id": 1, "auto_approve": True, "queue_paused": False,
            }).execute()
        await asyncio.to_thread(_insert)

    upstream_queue = asyncio.Queue(maxsize=UPSTREAM_QUEUE_DEPTH)
    video_queue = asyncio.Queue(maxsize=VIDEO_QUEUE_DEPTH)
    post_video_queue = asyncio.Queue(maxsize=POST_VIDEO_QUEUE_DEPTH)

    # Startup recovery gate (§8.3)
    from src.orchestration.recovery import run_recovery_pass
    await run_recovery_pass(
        sb,
        upstream_queue=upstream_queue,
        video_queue=video_queue,
        post_video_queue=post_video_queue,
    )

    from src.orchestration.feeder import Feeder, make_bootstrap_callable
    from src.orchestration.upstream_worker import UpstreamWorker
    from src.orchestration.video_dispatcher import VideoDispatcher
    from src.orchestration.downstream_worker import make_downstream_workers
    from src.orchestration.finalizer import Finalizer
    from src.orchestration.observability import MetricsReporter

    feeder = Feeder(
        sb,
        upstream_queue=upstream_queue,
        video_queue=video_queue,
        post_video_queue=post_video_queue,
        bootstrap=make_bootstrap_callable(sb, upstream_queue=upstream_queue),
        poll_interval=FEEDER_POLL_INTERVAL,
    )
    upstream = UpstreamWorker(
        sb,
        upstream_queue=upstream_queue,
        video_queue=video_queue,
    )
    dispatcher = VideoDispatcher(
        sb,
        video_queue=video_queue,
        post_video_queue=post_video_queue,
        concurrency=VIDEO_CONCURRENCY,
    )
    downstream = make_downstream_workers(sb, post_video_queue=post_video_queue)
    finalizer = Finalizer(sb, poll_interval=FINALIZER_POLL_INTERVAL)
    metrics = MetricsReporter(
        sb,
        upstream_queue=upstream_queue,
        video_queue=video_queue,
        post_video_queue=post_video_queue,
        upstream_worker=upstream,
        video_dispatcher=dispatcher,
        downstream_workers=downstream,
        interval=METRICS_INTERVAL,
    )

    tasks = [
        asyncio.create_task(feeder.run(), name="feeder"),
        asyncio.create_task(upstream.run(), name="upstream"),
        asyncio.create_task(dispatcher.run(), name="video_dispatcher"),
        asyncio.create_task(finalizer.run(), name="finalizer"),
        asyncio.create_task(metrics.run(), name="metrics"),
    ]
    tasks.extend(
        asyncio.create_task(w.run(), name=f"downstream-{i}")
        for i, w in enumerate(downstream)
    )

    log.info("Orchestrator running with %d tasks", len(tasks))

    # Wait for shutdown signal; then orchestrate stop per §6.7.
    shutdown_waiter = asyncio.create_task(_shutdown.wait(), name="shutdown-waiter")
    done, pending = await asyncio.wait(
        [shutdown_waiter, *tasks],
        return_when=asyncio.FIRST_COMPLETED,
    )

    if _shutdown.is_set():
        log.info("job_runner: draining — §6.7 shutdown sequence")
        # Feeder stops pulling first so nothing new enters queues.
        feeder.stop()
        # Upstream/downstream finish current stage and exit.
        upstream.stop()
        for w in downstream:
            w.stop()
        # Video dispatcher does NOT wait for in-flight renders (§6.7). Cancel.
        dispatcher.stop()
        # Finalizer and metrics exit on next iteration.
        finalizer.stop()
        metrics.stop()
        # Give workers up to 30s to drain their current stage; then cancel.
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=30.0,
            )
        except asyncio.TimeoutError:
            log.warning("job_runner: drain timeout — cancelling outstanding tasks")
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
    else:
        # A worker task exited unexpectedly. Cancel everything and surface.
        log.error(
            "job_runner: unexpected task exit; cancelling remainder",
        )
        for t in pending:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    shutdown_waiter.cancel()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Shutting down")
