"""Cloud startup script.

Design ref: PIPELINE_REFACTOR_DESIGN_V4_FINAL.md §8.3, §10.

Runs:
1. Env pre-flight (fail fast on missing POD_URL/POD_AUTH_TOKEN/Supabase).
2. Health check HTTP server on a background thread.
3. The orchestrator main loop (foreground). Its startup recovery gate runs
   synchronously before any worker starts.

HIGH-5: this module does NOT call logging.basicConfig. The orchestrator's
job_runner.py owns logging configuration (with correlation-ID format). Any
basicConfig here would steal the format from job_runner's format (first call
wins) and drop word_id/stage fields from deployed log lines.

HIGH-7: only POD_URL / POD_AUTH_TOKEN are accepted. No GPU_WORKER_* fallback
at the startup gate.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from threading import Thread

logger = logging.getLogger("cloud")


# ─── Health Check Server ──────────────────────────────────────────────

def start_health_server():
    """Minimal HTTP server for Railway/Render liveness checks."""
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class HealthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                body = json.dumps({
                    "status": "healthy",
                    "mode": "cloud",
                    "storage": os.getenv("STORAGE_MODE", "local"),
                    "dispatch": os.getenv("DISPATCH_MODE", "http"),
                })
                self.wfile.write(body.encode())
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            return

    port = int(os.getenv("HEALTH_PORT") or os.getenv("PORT") or "8091")
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    logger.info("Health check server listening on port %s", port)
    server.serve_forever()


# ─── Env Checks ───────────────────────────────────────────────────────

def _check_required_env() -> None:
    """Fail fast if any required env var is missing.

    HIGH-7: POD_URL / POD_AUTH_TOKEN only. Legacy GPU_WORKER_* no longer
    accepted at the gate. Sir Robert should set POD_URL/POD_AUTH_TOKEN in
    Railway.
    """
    missing: list[str] = []

    if not os.getenv("SUPABASE_URL"):
        missing.append("SUPABASE_URL")
    if not os.getenv("SUPABASE_SERVICE_KEY") and not os.getenv("SUPABASE_KEY"):
        missing.append("SUPABASE_SERVICE_KEY (or SUPABASE_KEY)")
    if not os.getenv("POD_URL"):
        missing.append("POD_URL")
    if not os.getenv("POD_AUTH_TOKEN"):
        missing.append("POD_AUTH_TOKEN")

    if missing:
        logger.error(
            "Orchestrator startup aborted: missing env var(s): %s",
            ", ".join(missing),
        )
        sys.exit(1)


# ─── Main ─────────────────────────────────────────────────────────────

async def main():
    logger.info("=" * 60)
    logger.info("Resonance Cloud — Starting")
    logger.info("  STORAGE_MODE  = %s", os.getenv("STORAGE_MODE", "local"))
    logger.info("  DISPATCH_MODE = %s", os.getenv("DISPATCH_MODE", "http"))
    logger.info("  MUSIC_MODE    = %s", os.getenv("MUSIC_MODE", "suno"))
    logger.info("=" * 60)

    _check_required_env()

    health_thread = Thread(target=start_health_server, daemon=True)
    health_thread.start()

    # Hand off to the orchestrator. job_runner.main() owns logging format,
    # signal handlers, and recovery gate ordering.
    from job_runner import main as job_runner_main

    logger.info("Starting orchestrator main loop...")
    await job_runner_main()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        sys.exit(0)
