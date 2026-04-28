"""Shared LTX prompt construction logic and validation helpers.

Both the fal.ai adapter (ltx.py) and self-hosted adapter (ltx_selfhosted.py)
import from here. Constants and helpers were moved here FROM ltx.py to avoid
circular imports and eliminate duplication.
"""

from __future__ import annotations

# ─── Prompt Constants (moved from ltx.py) ────────────────────────────

# Tier 1: Constraint prefix to prevent LTX hallucination / subject drift
_CONSTRAINT_PREFIX = (
    "Maintain the exact subject, species, and clothing shown in the image "
    "throughout. Do not introduce new characters, objects, or transform the subject. "
)

_TEXT_TO_VIDEO_PREFIX = (
    "Generate a high-quality cinematic scene with consistent visual style "
    "throughout. Maintain the subject's appearance, the environment, and "
    "all visual details exactly as described for the entire duration. "
)

_NEGATIVE_SUFFIX = (
    ", morphing, transformation, species change, subject replacement, sudden scene change"
)

# Tier 2: Camera motion → natural language for LTX prompt
_CAMERA_LANGUAGE: dict[str, str] = {
    # Basic Ken Burns types
    "slow_zoom_in": "Camera slowly pushes in closer to the subject",
    "slow_zoom_out": "Camera gradually pulls back to reveal the wider scene",
    "pan_left": "Camera pans smoothly from right to left across the scene",
    "pan_right": "Camera pans smoothly from left to right across the scene",
    "pan_up": "Camera tilts upward gradually",
    "pan_down": "Camera tilts downward gradually",
    "static": "",
    # Cinematic extended types
    "dolly_in": "The camera moves physically forward toward the subject, creating depth parallax",
    "dolly_out": "The camera pulls physically backward away from the subject, revealing the surroundings",
    "orbit_left": "The camera orbits around the subject in a clockwise arc, maintaining focus on center",
    "orbit_right": "The camera orbits around the subject in a counter-clockwise arc, maintaining focus on center",
    "tracking_left": "The camera tracks laterally to the left alongside the subject",
    "tracking_right": "The camera tracks laterally to the right alongside the subject",
    "crane_up": "The camera rises vertically upward in a crane movement, looking down as it ascends",
    "crane_down": "The camera descends vertically downward in a crane movement",
    "push_in": "The camera slowly and deliberately pushes in toward the subject with intent",
    "pull_out": "The camera slowly pulls away from the subject, creating emotional distance",
    "handheld": "The camera has subtle natural handheld movement with slight organic sway",
}

_SPEED_LANGUAGE: dict[str, str] = {
    "very_slow": "very slowly and subtly",
    "slow": "at a gentle, steady pace",
    "medium": "at a moderate, noticeable pace",
    "fast": "quickly and dynamically",
}

# ─── Duration Constants (moved from ltx.py) ──────────────────────────

# ─── Prompt Helper Functions ─────────────────────────────────────────


def build_ltx_prompt(
    video_prompt: str,
    camera_motion: dict | None,
    is_t2v: bool = False,
    text_to_video_prompt: str | None = None,
) -> str:
    """Build the final LTX prompt using the same assembly method as ltx.py.

    I2V: [CONSTRAINT_PREFIX] [video_prompt] [Camera movement: ... speed.]
    T2V: [TEXT_TO_VIDEO_PREFIX] [text_to_video_prompt or video_prompt]
         (no camera motion — T2V prompts have camera baked in by storyboard LLM)
    """
    prompt_parts: list[str] = []

    if is_t2v:
        base_prompt = text_to_video_prompt if text_to_video_prompt else video_prompt
        prompt_parts.append(_TEXT_TO_VIDEO_PREFIX)
        prompt_parts.append(base_prompt)
        # NO camera motion for T2V — storyboard LLM already includes it
    else:
        prompt_parts.append(_CONSTRAINT_PREFIX)
        prompt_parts.append(video_prompt)

        # Camera motion ONLY for I2V (matches original ltx.py:191 guard)
        if camera_motion:
            motion_type = camera_motion.get("type", "static")
            speed = camera_motion.get("speed", "slow")
            camera_instruction = _CAMERA_LANGUAGE.get(motion_type, "")
            if camera_instruction:
                speed_mod = _SPEED_LANGUAGE.get(speed, "at a gentle pace")
                prompt_parts.append(
                    f"Camera movement: {camera_instruction} {speed_mod}."
                )

    return " ".join(prompt_parts)


def build_ltx_negative(negative_prompt: str | None) -> str:
    """Enhance a negative prompt with the standard LTX suffix."""
    base = negative_prompt or "blur, distort, and low quality"
    return f"{base}{_NEGATIVE_SUFFIX}"
