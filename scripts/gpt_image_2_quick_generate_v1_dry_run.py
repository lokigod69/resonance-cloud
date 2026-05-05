from __future__ import annotations

import json
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.gpt_card_prompts import (
    build_gpt_image_2_card_metadata,
    build_gpt_image_2_prompt,
)


OUTPUT_PATH = Path("tmp/gpt_image_2_quick_generate_v1/Dry_Run_PROMPTS.md")

FORBIDDEN_LABELS = [
    "vocabulary-card image for learning",
    "Target word:",
    "Translation:",
    "Composition:",
    "Treatment:",
    "Creative mode:",
    "Text/embedding mode:",
    "Register note:",
]

SAMPLES = [
    {
        "word": "die Leiter",
        "language": "German",
        "translation": "ladder",
        "part_of_speech": "noun",
        "image_scene": "A silver ladder leans safely against a sunlit apple tree while one ripe apple hangs just above the top rung.",
        "mnemonic": "A ladder lets you climb to what is just out of reach.",
        "mnemonic_confidence": "helpful",
        "etymology": None,
        "usage_example": {"target": "Ich brauche die Leiter.", "l1": "I need the ladder."},
        "composition": "single",
        "treatment": "literal",
        "creative_mode": "clean_iconic",
        "text_embedding_mode": "none",
        "single_image_teachable": True,
        "dominant_emotional_reading": "practical upward reach",
        "register_note": None,
        "rationale_summary": "A ladder in use teaches the noun directly without needing text.",
    },
    {
        "word": "Heimweh",
        "language": "German",
        "translation": "homesickness",
        "part_of_speech": "noun",
        "image_scene": "A traveler sits on an unpacked suitcase in a dim apartment, holding a mug while warm morning light falls on a framed family photo.",
        "mnemonic": "Home weighs on you when you are away.",
        "mnemonic_confidence": "essential",
        "etymology": "Heim means home and Weh means pain or ache.",
        "usage_example": {"target": "Ich habe Heimweh.", "l1": "I am homesick."},
        "composition": "single",
        "treatment": "embodied",
        "creative_mode": "cinematic_microstory",
        "text_embedding_mode": "none",
        "single_image_teachable": True,
        "dominant_emotional_reading": "longing for home",
        "register_note": None,
        "rationale_summary": "Distance, stillness, and the family photo physicalize the ache.",
    },
    {
        "word": "coup de foudre",
        "language": "French",
        "translation": "love at first sight",
        "part_of_speech": "noun phrase",
        "image_scene": "Two adults lock eyes across a rain-bright train platform as a distant flash of lightning lights the space between them.",
        "mnemonic": "A lightning strike stands in for the instant feeling.",
        "mnemonic_confidence": "essential",
        "etymology": "Literally, it means a lightning strike.",
        "usage_example": {"target": "C'etait un coup de foudre.", "l1": "It was love at first sight."},
        "composition": "single",
        "treatment": "etymological",
        "creative_mode": "cinematic_microstory",
        "text_embedding_mode": "none",
        "single_image_teachable": True,
        "dominant_emotional_reading": "instant romantic recognition",
        "register_note": "romantic expression",
        "rationale_summary": "Adults, eye contact, and lightning make the metaphor distinct without explicitness.",
    },
]

RENDERER_PROFILES = ["simple_visual", "balanced_teaching", "cinematic_memory"]


def _target_appears(prompt: str, target: str) -> bool:
    return target.lower() in prompt.lower()


def _labels_leak(prompt: str) -> bool:
    lowered = prompt.lower()
    return any(label.lower() in lowered for label in FORBIDDEN_LABELS)


def main() -> int:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sections = [
        "# GPT Image-2 Quick Generate V1 Dry Run",
        "",
        "No provider calls, Supabase writes, Storage uploads, or production deck writes were performed.",
        "",
    ]
    for sample in SAMPLES:
        prompts: dict[str, str] = {}
        metadata_by_profile: dict[str, dict[str, object]] = {}
        for profile in RENDERER_PROFILES:
            prompt = build_gpt_image_2_prompt(
                word=sample["word"],
                translation=sample["translation"],
                language=sample["language"],
                pos=sample["part_of_speech"],
                image_scene=sample["image_scene"],
                mnemonic=sample["mnemonic"],
                mnemonic_confidence=sample["mnemonic_confidence"],
                dominant_emotional_reading=sample["dominant_emotional_reading"],
                composition_hint=sample["composition"],
                treatment_hint=sample["treatment"],
                renderer_profile=profile,
                renderer_profile_source="auto",
            )
            prompts[profile] = prompt
            metadata_by_profile[profile] = build_gpt_image_2_card_metadata(
                final_provider_prompt=prompt,
                renderer_profile=profile,
                renderer_profile_source="auto",
                image_scene=sample["image_scene"],
                mnemonic=sample["mnemonic"],
                mnemonic_confidence=sample["mnemonic_confidence"],
                etymology=sample["etymology"],
                usage_example=sample["usage_example"],
                composition=sample["composition"],
                treatment=sample["treatment"],
                creative_mode=sample["creative_mode"],
                text_embedding_mode=sample["text_embedding_mode"],
                single_image_teachable=sample["single_image_teachable"],
                dominant_emotional_reading=sample["dominant_emotional_reading"],
                register_note=sample["register_note"],
                rationale_summary=sample["rationale_summary"],
            )
        enrichment_json = {
            key: value
            for key, value in sample.items()
            if key not in {"part_of_speech"}
        }
        sections.extend(
            [
                f"## {sample['word']} - {sample['translation']}",
                "",
                "### Enrichment JSON",
                "```json",
                json.dumps(enrichment_json, ensure_ascii=False, indent=2),
                "```",
                "",
                f"image_scene: {sample['image_scene']}",
                "",
                f"mnemonic: {json.dumps(sample['mnemonic'], ensure_ascii=False)}",
                "",
                "### simple_visual Final Provider Prompt",
                "```text",
                prompts["simple_visual"],
                "```",
                "",
                "### balanced_teaching Final Provider Prompt",
                "```text",
                prompts["balanced_teaching"],
                "```",
                "",
                "### cinematic_memory Final Provider Prompt",
                "```text",
                prompts["cinematic_memory"],
                "```",
                "",
                "### Metadata",
                "```json",
                json.dumps(metadata_by_profile, ensure_ascii=False, indent=2),
                "```",
                "",
                f"target_word_appears_in_any_provider_prompt: {any(_target_appears(prompt, sample['word']) for prompt in prompts.values())}",
                "",
                f"metadata_labels_leak_into_any_provider_prompt: {any(_labels_leak(prompt) for prompt in prompts.values())}",
                "",
            ]
        )
    OUTPUT_PATH.write_text("\n".join(sections), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
