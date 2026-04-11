"""HTTP REST API backend for Ace-Step.

Per ENGINE_SONG.md Section 3.2 (HTTP REST API — Primary):
1. POST /release_task with JSON payload → receive job_id
2. Poll GET /query_result/{job_id} until complete
3. Download audio files from result
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

import httpx

from .acestep_base import AceStepBackend
from .models import AceStepParams, AceStepResponse, AceStepTiming

logger = logging.getLogger(__name__)

# Polling configuration
DEFAULT_POLL_INTERVAL = 2.0  # seconds between polls
DEFAULT_POLL_TIMEOUT = 300.0  # max seconds to wait for generation
DEFAULT_HTTP_TIMEOUT = 30.0  # timeout for individual HTTP requests


class AceStepHTTP(AceStepBackend):
    """Ace-Step HTTP REST API client (primary backend).

    Communicates with Ace-Step's built-in REST API server,
    launched with `uv run acestep-api` (port 8001) or
    `acestep --enable-api` (hybrid mode).
    """

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8001",
        poll_interval: float = DEFAULT_POLL_INTERVAL,
        poll_timeout: float = DEFAULT_POLL_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._poll_interval = poll_interval
        self._poll_timeout = poll_timeout
        self._client = httpx.Client(timeout=DEFAULT_HTTP_TIMEOUT)

    @property
    def backend_name(self) -> str:
        return "http"

    @property
    def url(self) -> str:
        return self._base_url

    def health_check(self) -> bool:
        """Check if the HTTP API is reachable."""
        try:
            # Try common health endpoints
            for endpoint in ["/health", "/docs", "/"]:
                try:
                    resp = self._client.get(f"{self._base_url}{endpoint}", timeout=5.0)
                    if resp.status_code < 500:
                        return True
                except httpx.HTTPError:
                    continue
            return False
        except Exception:
            return False

    def generate(self, params: AceStepParams) -> AceStepResponse:
        """Submit generation job, poll for completion, download audio.

        Raises:
            ConnectionError: If Ace-Step is unreachable.
            RuntimeError: If generation fails or times out.
        """
        if params.lora_path:
            raise RuntimeError(
                "LoRA requires the Gradio backend. "
                "Current backend: http. Set ACESTEP_BACKEND=gradio in .env"
            )

        # Step 1: Submit the generation task
        job_id = self._submit_task(params)
        logger.info(f"Submitted generation job: {job_id}")

        # Step 2: Poll for completion
        result = self._poll_result(job_id)
        logger.info(f"Generation complete for job: {job_id}")

        # Step 3: Extract audio paths and metadata from result
        return self._parse_result(result)

    def _submit_task(self, params: AceStepParams) -> str:
        """POST /release_task → receive job_id."""
        payload = params.to_http_payload()
        logger.debug(f"Submitting task with payload keys: {list(payload.keys())}")
        logger.debug("Lyrics to ACE-Step (first 200): %s", params.lyrics[:200])

        try:
            resp = self._client.post(
                f"{self._base_url}/release_task",
                json=payload,
            )
            resp.raise_for_status()
        except httpx.ConnectError as e:
            raise ConnectionError(
                f"Ace-Step connection refused: {self._base_url}. "
                f"Is Ace-Step running? Start with: uv run acestep-api"
            ) from e
        except httpx.HTTPStatusError as e:
            raise RuntimeError(
                f"Ace-Step rejected the task (HTTP {e.response.status_code}): "
                f"{e.response.text}"
            ) from e

        data = resp.json()
        job_id = data.get("job_id") or data.get("id") or data.get("task_id")
        if not job_id:
            raise RuntimeError(f"No job_id in response: {data}")

        return str(job_id)

    def _poll_result(self, job_id: str) -> dict[str, Any]:
        """Poll GET /query_result/{job_id} until complete or timeout."""
        start = time.monotonic()

        while True:
            elapsed = time.monotonic() - start
            if elapsed > self._poll_timeout:
                raise RuntimeError(
                    f"Generation timed out after {self._poll_timeout}s for job {job_id}"
                )

            try:
                resp = self._client.get(f"{self._base_url}/query_result/{job_id}")
                resp.raise_for_status()
            except httpx.ConnectError as e:
                raise ConnectionError(
                    f"Lost connection to Ace-Step during polling: {self._base_url}"
                ) from e
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    # Job not found yet — may still be queuing
                    time.sleep(self._poll_interval)
                    continue
                raise RuntimeError(
                    f"Poll error (HTTP {e.response.status_code}): {e.response.text}"
                ) from e

            data = resp.json()
            status = data.get("status", "").lower()

            if status in ("completed", "done", "success", "finished"):
                return data
            elif status in ("failed", "error"):
                error_msg = data.get("error") or data.get("message") or "Unknown generation error"
                raise RuntimeError(f"Ace-Step generation failed: {error_msg}")
            elif status in ("pending", "processing", "running", "queued"):
                logger.debug(f"Job {job_id} status: {status} ({elapsed:.1f}s elapsed)")
                time.sleep(self._poll_interval)
            else:
                # Unknown status — keep polling
                logger.warning(f"Unknown job status '{status}' for {job_id}, continuing to poll")
                time.sleep(self._poll_interval)

    def _parse_result(self, result: dict[str, Any]) -> AceStepResponse:
        """Extract audio paths, seeds, and timing from the result."""
        audio_paths: list[str] = []
        seeds: list[int] = []

        # Try common response shapes
        # Shape 1: {"audio_files": [...], "seeds": [...]}
        if "audio_files" in result:
            audio_paths = result["audio_files"]
        # Shape 2: {"result": {"audio_files": [...]}}
        elif "result" in result and isinstance(result["result"], dict):
            inner = result["result"]
            audio_paths = inner.get("audio_files", [])
            seeds = inner.get("seeds", [])
        # Shape 3: {"outputs": [{"path": "...", "seed": 123}]}
        elif "outputs" in result and isinstance(result["outputs"], list):
            for out in result["outputs"]:
                if isinstance(out, dict):
                    if "path" in out:
                        audio_paths.append(out["path"])
                    if "seed" in out:
                        seeds.append(out["seed"])
                elif isinstance(out, str):
                    audio_paths.append(out)
        # Shape 4: {"audio_url": "..."} for single output
        elif "audio_url" in result:
            audio_paths = [result["audio_url"]]

        if "seeds" in result and not seeds:
            seeds = result["seeds"]

        # Parse timing if available
        timing = None
        timing_data = result.get("timing") or result.get("result", {}).get("timing")
        if timing_data and isinstance(timing_data, dict):
            timing = AceStepTiming(
                total_seconds=timing_data.get("total"),
                lm_seconds=timing_data.get("lm"),
                dit_seconds=timing_data.get("dit"),
                vae_seconds=timing_data.get("vae"),
                overhead_seconds=timing_data.get("overhead"),
            )

        return AceStepResponse(
            audio_paths=audio_paths,
            seeds=seeds,
            timing=timing,
            raw_response=result,
        )

    def download_file(self, url_or_path: str, dest: Path) -> Path:
        """Download an audio file from the API or copy from a local path.

        Args:
            url_or_path: URL to download from, or local file path.
            dest: Destination file path.

        Returns:
            The destination path.
        """
        if url_or_path.startswith(("http://", "https://")):
            resp = self._client.get(url_or_path)
            resp.raise_for_status()
            dest.write_bytes(resp.content)
        else:
            # Local path — might be returned by Ace-Step
            src = Path(url_or_path)
            if src.exists():
                import shutil
                shutil.copy2(src, dest)
            else:
                # Try as relative to base URL
                resp = self._client.get(f"{self._base_url}/{url_or_path.lstrip('/')}")
                resp.raise_for_status()
                dest.write_bytes(resp.content)

        return dest

    def __del__(self):
        try:
            self._client.close()
        except Exception:
            pass
