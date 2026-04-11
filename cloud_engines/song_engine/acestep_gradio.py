"""Gradio client backend for Ace-Step.

Per ENGINE_SONG.md Section 3.2 (Gradio Client — Fallback):
Uses gradio_client.Client to call Ace-Step's Gradio UI endpoint
at localhost:7860 via client.predict().

WARNING: Positional parameters are fragile. If Ace-Step updates
the Gradio interface, parameter positions may shift. The HTTP
API backend is recommended for production use.
"""

from __future__ import annotations

import ast
import json
import logging
from typing import Any

from .acestep_base import AceStepBackend
from .models import AceStepParams, AceStepResponse

logger = logging.getLogger(__name__)


class AceStepGradio(AceStepBackend):
    """Ace-Step Gradio client (fallback backend).

    Communicates with Ace-Step's standard Gradio UI,
    launched with `uv run acestep` (port 7860).
    """

    def __init__(self, url: str = "http://127.0.0.1:7860"):
        self._url = url
        self._client = None  # Lazy-initialized

    @property
    def backend_name(self) -> str:
        return "gradio"

    @property
    def url(self) -> str:
        return self._url

    def _get_client(self):
        """Lazy-initialize the Gradio client."""
        if self._client is None:
            try:
                from gradio_client import Client

                self._client = Client(self._url)
            except Exception as e:
                raise ConnectionError(
                    f"Cannot connect to Ace-Step Gradio UI at {self._url}. "
                    f"Is Ace-Step running? Start with: uv run acestep"
                ) from e
        return self._client

    def health_check(self) -> bool:
        """Check if the Gradio UI is reachable."""
        try:
            self._get_client()
            return True
        except (ConnectionError, Exception):
            return False

    def ensure_lora_state(self, lora_path: str | None, lora_strength: float) -> None:
        """Ensure ACE-Step's LoRA state matches the desired configuration.

        Checks current LoRA status via /get_lora_status, then makes the minimum
        necessary calls to reach the desired state. The engine is stateless —
        this runs before every generation.

        Args:
            lora_path: Path to LoRA adapter directory, or None to disable.
            lora_strength: LoRA influence scale (0.0–1.0).

        Raises:
            RuntimeError: If LoRA load fails.
        """
        client = self._get_client()

        # Get current LoRA state from ACE-Step
        current = self._get_lora_status(client)

        if lora_path:
            # User wants LoRA active
            if current.get("path") != lora_path or not current.get("loaded"):
                load_result = client.predict(lora_path, api_name="/load_lora")
                load_str = str(load_result)
                if load_str.startswith("\u274c"):
                    if "quantiz" in load_str.lower():
                        raise RuntimeError(
                            f"LoRA cannot be loaded on quantized models. "
                            f"Restart ACE-Step with quantization disabled. "
                            f"Detail: {load_str}"
                        )
                    raise RuntimeError(f"LoRA load failed: {load_str}")
                logger.info(f"Loaded LoRA from {lora_path}")

            if not current.get("active"):
                client.predict(True, api_name="/set_use_lora")
                logger.info("Enabled LoRA")

            current_scale = current.get("scale")
            if current_scale != lora_strength:
                client.predict(lora_strength, api_name="/set_lora_scale")
                logger.info(f"Set LoRA scale to {lora_strength}")
        else:
            # User wants no LoRA — just disable, don't unload
            if current.get("active"):
                client.predict(False, api_name="/set_use_lora")
                logger.info("Disabled LoRA")

    def _get_lora_status(self, client) -> dict:
        """Get current LoRA status from ACE-Step.

        The /get_lora_status endpoint outputs to a Textbox, so the return
        value may be a dict or a string representation of a dict.

        Returns:
            Dict with keys: loaded, active, scale, path.
            On parse failure, returns empty dict (safe fallback — triggers fresh load).
        """
        try:
            result = client.predict(api_name="/get_lora_status")
        except Exception as e:
            logger.warning(f"Failed to get LoRA status: {e}")
            return {}

        if isinstance(result, dict):
            return result

        # Try parsing string representation
        result_str = str(result).strip()
        try:
            return json.loads(result_str)
        except (json.JSONDecodeError, ValueError):
            pass
        try:
            return ast.literal_eval(result_str)
        except (ValueError, SyntaxError):
            pass

        logger.warning(f"Could not parse LoRA status: {result_str!r}, proceeding with fresh load")
        return {}

    def generate(self, params: AceStepParams) -> AceStepResponse:
        """Call Ace-Step via Gradio client.predict().

        WARNING: The parameter positions below are based on Ace-Step 1.5's
        /generation_wrapper endpoint. If Ace-Step updates its Gradio interface,
        these positions may shift. Verify against your running instance.

        Raises:
            ConnectionError: If Ace-Step is unreachable.
            RuntimeError: If generation fails.
        """
        # Step 0: Ensure LoRA state matches settings
        self.ensure_lora_state(
            lora_path=params.lora_path,
            lora_strength=params.lora_strength,
        )

        client = self._get_client()

        # Build positional arguments for the Gradio /generation_wrapper endpoint.
        # Mapped from Ace-Step 1.5 source: acestep/gradio_ui/events/__init__.py
        # The endpoint takes 45 positional params (param_0..param_45, skipping 36).
        # param_36 is a Gradio State component (is_format_caption_state) which is
        # excluded from the API but still counted in the numbering.
        #
        # FRAGILE: If Ace-Step updates its UI, re-run client.view_api() to verify.

        # Seed handling
        if isinstance(params.seed, list):
            seed_val = str(params.seed[0]) if params.seed else "-1"
            use_random_seed = False
        elif params.seed == -1:
            seed_val = "-1"
            use_random_seed = True
        else:
            seed_val = str(params.seed)
            use_random_seed = False

        logger.debug("Lyrics to ACE-Step (first 200): %s", params.lyrics[:200])

        try:
            result = client.predict(
                # --- Core generation params ---
                params.caption,                 # param_0:  captions (Textbox, required)
                params.lyrics,                  # param_1:  lyrics (Textbox, required)
                int(params.bpm or 0),            # param_2:  bpm (Number, required; 0=auto)
                "",                             # param_3:  key_scale (Textbox; empty=auto)
                "",                             # param_4:  time_signature (Dropdown; empty=auto)
                params.vocal_language,           # param_5:  vocal_language (Dropdown)
                int(params.inference_steps),      # param_6:  inference_steps (Slider; int internally)
                float(params.guidance_scale),    # param_7:  guidance_scale (Slider)
                use_random_seed,                 # param_8:  random_seed_checkbox (Checkbox)
                seed_val,                        # param_9:  seed (Textbox, as string)
                # --- Audio inputs (unused for text2music) ---
                None,                            # param_10: reference_audio (Audio; None for text2music)
                int(params.duration),             # param_11: audio_duration (Number; int internally)
                int(params.batch_size),           # param_12: batch_size_input (Number; int internally)
                None,                            # param_13: src_audio (Audio; None for text2music)
                "",                              # param_14: text2music_audio_code_string (Textbox)
                # --- Repainting params (unused for text2music) ---
                0.0,                             # param_15: repainting_start (Number)
                -1.0,                            # param_16: repainting_end (Number; -1=full)
                "Fill the audio semantic mask based on the given conditions:",  # param_17: instruction_display_gen
                1.0,                             # param_18: audio_cover_strength (Slider)
                # --- DiT / inference config ---
                params.task_type,                # param_19: task_type (Dropdown)
                False,                           # param_20: use_adg (Checkbox)
                0.0,                             # param_21: cfg_interval_start (Slider)
                1.0,                             # param_22: cfg_interval_end (Slider)
                float(params.shift),             # param_23: shift (Slider)
                params.infer_method,             # param_24: infer_method (Dropdown)
                "",                              # param_25: custom_timesteps (Textbox; empty=default)
                params.audio_format,             # param_26: audio_format (Dropdown: 'mp3'|'flac')
                # --- LM config ---
                float(params.lm_temperature),    # param_27: lm_temperature (Slider)
                params.thinking,                 # param_28: think_checkbox (Checkbox)
                float(params.lm_cfg_scale),      # param_29: lm_cfg_scale (Slider)
                int(params.lm_top_k),             # param_30: lm_top_k (Slider; int internally)
                float(params.lm_top_p),          # param_31: lm_top_p (Slider)
                "NO USER INPUT",                 # param_32: lm_negative_prompt (Textbox)
                # --- CoT flags ---
                params.use_cot_metas,            # param_33: use_cot_metas (Checkbox)
                params.use_cot_caption,          # param_34: use_cot_caption (Checkbox)
                params.use_cot_language,          # param_35: use_cot_language (Checkbox)
                # (param_36 is a Gradio State — skipped in API)
                # --- Advanced / UI flags ---
                False,                           # param_37: constrained_decoding_debug (Checkbox)
                True,                            # param_38: allow_lm_batch (Checkbox)
                False,                           # param_39: auto_score (Checkbox)
                False,                           # param_40: auto_lrc (Checkbox)
                0.5,                             # param_41: score_scale (Slider)
                8,                               # param_42: lm_batch_chunk_size (Number; int internally)
                "vocals",                        # param_43: track_name (Dropdown, required)
                [],                              # param_44: complete_track_classes (Checkboxgroup)
                False,                           # param_45: autogen_checkbox (Checkbox)
                api_name="/generation_wrapper",
            )
        except Exception as e:
            error_str = str(e)
            if "connection" in error_str.lower() or "refused" in error_str.lower():
                raise ConnectionError(
                    f"Ace-Step Gradio connection failed at {self._url}: {error_str}"
                ) from e
            raise RuntimeError(f"Ace-Step Gradio generation failed: {error_str}") from e

        return self._parse_result(result)

    def _parse_result(self, result: Any) -> AceStepResponse:
        """Parse the Gradio predict() result into an AceStepResponse.

        /generation_wrapper returns a 37-element tuple:
          [0..7]  individual audio file paths (None if batch_size < 8)
          [8]     batch download: list of all audio file paths
          [9]     generation_details (markdown)
          [10]    generation_status (text)
          [11]    seed (text, e.g. "12345" or comma-separated)
          [12..19] quality scores
          [20..27] lm_codes
          [28..35] lyrics_timestamps
          [36]    current_batch
          [37]    next_batch_status
        """
        audio_paths: list[str] = []
        seeds: list[int] = []

        if isinstance(result, (tuple, list)) and len(result) >= 10:
            # Audio files are in the batch download list at index 8.
            # Indices 0-7 contain Gradio component update dicts, not file paths.
            # The batch list alternates: take1.flac, take1.json, take2.flac, ...
            # We filter to only audio files (matching the requested format).
            if len(result) > 8 and isinstance(result[8], (list, tuple)):
                for item in result[8]:
                    path = self._extract_path(item)
                    if path and path.lower().endswith((".flac", ".wav", ".mp3")):
                        audio_paths.append(path)

            # Extract seed from index 11
            if len(result) > 11 and result[11]:
                seed_str = str(result[11]).strip()
                for part in seed_str.replace(",", " ").split():
                    try:
                        seeds.append(int(part))
                    except (ValueError, TypeError):
                        pass

            raw = {
                "generation_status": str(result[10]) if len(result) > 10 else "",
                "generation_details": str(result[9])[:500] if len(result) > 9 else "",
                "seed_raw": str(result[11]) if len(result) > 11 else "",
            }
        elif isinstance(result, tuple) and len(result) == 2:
            # Legacy 2-tuple format (unlikely but defensive)
            audio_part, meta_part = result
            path = self._extract_path(audio_part)
            if path:
                audio_paths = [path]
            elif isinstance(audio_part, (list, tuple)):
                audio_paths = [str(p) for p in audio_part if p]
            if isinstance(meta_part, dict):
                seeds = meta_part.get("seeds", [])
            raw = {"gradio_result": str(result)[:500]}
        else:
            path = self._extract_path(result)
            audio_paths = [path] if path else []
            raw = {"gradio_result": str(result)[:500]}

        return AceStepResponse(
            audio_paths=audio_paths,
            seeds=seeds,
            raw_response=raw,
        )

    @staticmethod
    def _extract_path(item: Any) -> str | None:
        """Extract a file path string from various Gradio return formats."""
        if item is None:
            return None
        if isinstance(item, str) and item:
            return item
        if isinstance(item, dict):
            # gradio_client FileData: {"path": "...", "url": "...", ...}
            return item.get("path") or item.get("url")
        if hasattr(item, "path"):
            # gradio_client FileData object
            return str(item.path)
        return None

    def __del__(self):
        self._client = None
