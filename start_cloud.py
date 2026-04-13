"""
Cloud startup script.

Runs:
1. Stuck job recovery (reset jobs left in 'processing' by previous container)
2. Health check HTTP server on a background thread
3. Job runner main loop (foreground — the primary process)

The FastAPI admin server (app.py / main.py) is NOT started in cloud mode.
The job runner polls Supabase for jobs and processes them using direct
engine function calls (DISPATCH_MODE=direct).

IMPORTANT: Importing job_runner triggers module-level side effects:
  - load_dotenv() runs at line 28 (harmless — env vars are set via Docker)
  - A Supabase client is created via get_supabase() at line 68
  - If SUPABASE_URL or SUPABASE_KEY are missing, sys.exit(1) fires at line 64
Therefore, all environment variables MUST be set before this script runs.
"""
import asyncio
import os
import sys
import logging
import json
from datetime import datetime, timedelta, timezone
from threading import Thread

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cloud")


# ─── Health Check Server ──────────────────────────────────────────────

def start_health_server():
    """
    Minimal HTTP server for Railway/Render liveness checks.

    Port resolution order:
      1. HEALTH_PORT env var (explicit override)
      2. PORT env var (Railway injects this)
      3. 8091 (default fallback)

    This avoids the common Railway failure mode where the platform routes
    traffic to $PORT but the app listens on a hardcoded different port.
    """
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
            pass  # Suppress per-request access logs

    port = int(os.getenv("HEALTH_PORT") or os.getenv("PORT") or "8091")
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    logger.info(f"Health check server listening on port {port}")
    server.serve_forever()


# ─── Stuck Job Recovery ───────────────────────────────────────────────

async def recover_stuck_jobs():
    """
    On startup, reset any jobs stuck in 'processing' status.

    When a container dies mid-pipeline, jobs stay in 'processing' forever.
    The job runner has NO existing stuck-job recovery logic — this is net-new.

    This resets them to 'approved' so they'll be re-picked-up by the polling loop.
    Only resets jobs stuck for > 30 minutes to avoid resetting a job that was
    JUST picked up by a concurrent worker (if any).

    The `started_at` column exists in `generation_jobs` (confirmed in
    migration file `20260322210000_phase2a_tables.sql`, set by job_runner
    at lines 602 and 710).
    """
    try:
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not set — skipping stuck job recovery")
            return

        sb = create_client(supabase_url, supabase_key)
        stale_threshold = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()

        result = (
            sb.table("generation_jobs")
            .update({
                "status": "approved",
                "error_message": "Reset after container restart",
            })
            .eq("status", "processing")
            .lt("started_at", stale_threshold)
            .execute()
        )

        if result.data:
            logger.warning(f"Reset {len(result.data)} stuck jobs back to 'approved'")
        else:
            logger.info("No stuck jobs found")

    except Exception as e:
        logger.error(f"Stuck job recovery failed (non-fatal): {e}")


# ─── Main ─────────────────────────────────────────────────────────────

async def main():
    logger.info("=" * 60)
    logger.info("Resonance Cloud — Starting")
    logger.info(f"  STORAGE_MODE  = {os.getenv('STORAGE_MODE', 'local')}")
    logger.info(f"  DISPATCH_MODE = {os.getenv('DISPATCH_MODE', 'http')}")
    logger.info(f"  MUSIC_MODE    = {os.getenv('MUSIC_MODE', 'suno')}")
    logger.info("=" * 60)

    # 1. Start health server in background
    health_thread = Thread(target=start_health_server, daemon=True)
    health_thread.start()

    # 2. Recover stuck jobs from previous container lifecycle
    await recover_stuck_jobs()

    # 3. Import and run the job runner's main loop
    #
    # SIDE EFFECTS AT IMPORT TIME:
    #   - load_dotenv() runs (line 28 of job_runner.py)
    #   - Supabase client created via get_supabase() (line 68)
    #   - sys.exit(1) if SUPABASE_URL/KEY missing (line 64)
    #
    # This creates a SECOND Supabase client (the first was created in
    # recover_stuck_jobs). This is slightly wasteful but harmless — the
    # job runner needs its own long-lived client for the polling loop.
    #
    logger.info("Starting job runner polling loop...")
    from job_runner import main as job_runner_main
    await job_runner_main()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        sys.exit(0)
