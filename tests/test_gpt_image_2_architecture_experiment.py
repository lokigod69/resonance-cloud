from __future__ import annotations

import json
import sys
from pathlib import Path


ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from scripts.experiments import gpt_image_2_architecture_experiment as exp  # noqa: E402


V6_ARCHITECTURES = (
    "A3_thin_meaning_only_hidden_answer",
    "D2_unified_short_hidden_answer",
    "D4_unified_cinematic_short_hidden_answer",
)
ANSWER_HIDDEN_SENTENCE = "Do not write the target word or the direct answer/translation inside the image."
OLD_WORDS = {
    "die Taschenlampe",
    "sich ducken",
    "das Update",
    "Beklemmung",
    "Vorfreude",
    "der Ohrwurm",
    "den Faden verlieren",
    "to save face",
    "slow burn",
    "ghosting",
    "in the meantime",
    "nevertheless",
    "der Regenschirm",
    "stolpern",
    "peinlich",
    "Schwein haben",
    "to bite the bullet",
    "almost",
    "la ventana",
    "tener mariposas en el estomago",
    "tener mariposas en el estómago",
    "vergüenza",
    "la chiave",
    "prendere in giro",
    "la bibliothèque",
    "avoir le cafard",
    "나무",
    "눈치",
    "木漏れ日",
    "kilig",
    "deadpan",
    "Papagei",
    "links abbiegen",
    "Code",
    "Geborgenheit",
    "Sehnsucht",
    "Schadenfreude",
    "der Drahtseilakt",
    "to break the ice",
    "the spark",
    "to slide into someone's D.M.s",
    "eventually",
    "however",
}


def _sample_d_plan(**overrides: object) -> dict[str, object]:
    plan: dict[str, object] = {
        "word": "ausrutschen",
        "language": "German",
        "l1_language": "English",
        "translation": "to slip",
        "part_of_speech": "verb",
        "word_category": "action",
        "image_scene": "A boot skids on a glossy wet train-platform tile as the person's arms fly out for balance.",
        "mnemonic": "A sudden skid makes the meaning stick.",
        "mnemonic_confidence": "helpful",
        "etymology": None,
        "usage_example": {"target": "Ich rutsche aus.", "l1": "I slip."},
        "composition": "single",
        "treatment": "literal",
        "creative_mode": "embodied",
        "text_embedding_mode": "none",
        "single_image_teachable": True,
        "dominant_emotional_reading": "sudden loss of balance",
        "register_note": None,
        "rationale_summary": "Visible body motion teaches the physical action.",
    }
    plan.update(overrides)
    return plan


def _write_existing_prompt_source(root: Path, word: exp.WordSpec) -> None:
    slug = exp.slugify_word(word.word)
    for architecture in exp.MAIN_ARCHITECTURES:
        (root / architecture / "prompts").mkdir(parents=True)
        (root / architecture / "metadata").mkdir(parents=True)
        if architecture in {"D2_unified_short_hidden_answer", "D4_unified_cinematic_short_hidden_answer"}:
            for dirname in ["llm_prompts", "llm_raw", "validated", "prompts_before_sanitize"]:
                (root / architecture / dirname).mkdir(parents=True)
                (root / architecture / dirname / f"{slug}.txt").write_text("source artifact\n", encoding="utf-8")

        prompt = (
            f"{architecture} frozen prompt for {word.translation}. "
            "A small incidental platform number may appear. "
            f"{ANSWER_HIDDEN_SENTENCE}"
        )
        (root / architecture / "prompts" / f"{slug}.txt").write_text(prompt + "\n", encoding="utf-8")
        (root / architecture / "metadata" / f"{slug}.json").write_text(
            json.dumps(
                {
                    "experiment_id": "source_experiment",
                    "architecture": architecture,
                    "word": word.word,
                    "language": word.language,
                    "translation": word.translation,
                    "part_of_speech": word.part_of_speech,
                    "category": word.category,
                    "style": "Photorealistic",
                    "text_embedding_mode": "model_directed" if architecture.startswith("A3") else "none",
                    "creative_mode": "model_directed" if architecture.startswith("A3") else "clean_iconic",
                    "llm_called": not architecture.startswith("A3"),
                    "image_provider_called": False,
                    "llm_system_prompt_path": None,
                    "llm_user_prompt_path": None,
                    "llm_raw_output_path": None,
                    "visual_plan_json_path": None,
                    "raw_prompt_path": None,
                    "prompt_before_sanitize_path": None,
                    "final_provider_prompt_path": f"{architecture}/prompts/{slug}.txt",
                    "sanitization_applied": False,
                    "sanitization_notes": [],
                    "displayed_mnemonic": None,
                    "card_scene_displayed": None,
                    "composition_used": "model_directed" if architecture.startswith("A3") else "single",
                    "treatment_used": "model_directed" if architecture.startswith("A3") else "literal",
                    "mnemonic_confidence": None,
                    "fallback_used": False,
                    "compliance": exp.check_prompt_compliance(prompt),
                    "provider": exp.provider_not_called("not_called_dry_run"),
                }
            )
            + "\n",
            encoding="utf-8",
        )

    for filename in [
        "EXPERIMENT_INDEX.md",
        "ALL_PROMPTS.md",
        "RUN_SUMMARY.md",
        "SCORE_SHEET.csv",
        "CONTACT_SHEET.md",
        "PREFLIGHT_PROMPT_QUALITY.md",
    ]:
        (root / filename).write_text(f"source {filename}\n", encoding="utf-8")


def test_prompt_quality_allows_deliberate_text_and_flags_provider_risk():
    text_forward = exp.check_prompt_compliance(
        "A phone chat shows the readable message 'bring the flashlight' in a speech bubble."
    )

    assert text_forward["prompt_quality_pass"] is True
    assert text_forward["provider_risk_request"] is False
    assert text_forward["brand_logo_trademark_request"] is False

    risky = exp.check_prompt_compliance(
        "A cinematic card with the Nike logo, Disney character, and a Shutterstock watermark."
    )

    assert risky["prompt_quality_pass"] is False
    assert risky["watermark_request"] is True
    assert risky["brand_logo_trademark_request"] is True


def test_fresh_v6_lockin_word_set_exists_and_excludes_previous_sets():
    words = exp.WORD_SETS["fresh_v6_lockin_8"]
    word_values = {word.word for word in words}

    assert len(words) == 8
    assert word_values == {
        "die Leiter",
        "ausrutschen",
        "Heimweh",
        "to spill the beans",
        "ojalá",
        "la sobremesa",
        "coup de foudre",
        "정",
    }
    assert not (word_values & OLD_WORDS)


def test_v6_uses_only_a3_d2_d4_architectures():
    assert exp.V6_ARCHITECTURES == V6_ARCHITECTURES
    assert exp.MAIN_ARCHITECTURES == V6_ARCHITECTURES
    forbidden = {"B_simple_llm_prompt_writer", "C_structured_scene_director_guard", "B0_current_production_baseline"}
    assert forbidden.isdisjoint(exp.MAIN_ARCHITECTURES)


def test_a3_prompt_is_meaning_only_hidden_answer_and_not_flashcard_language():
    word = exp.WordSpec("die Leiter", "German", "ladder", "noun", "concrete noun")
    prompt = exp.build_a3_prompt(word, "Photorealistic")
    lowered = prompt.lower()

    assert "die Leiter" not in prompt
    assert "vocabulary-card image" not in lowered
    assert "for learning the german" not in lowered
    assert "target word:" not in lowered
    assert "translation:" not in lowered
    assert "Depict this meaning clearly: ladder." in prompt
    assert ANSWER_HIDDEN_SENTENCE in prompt
    assert "No visible text" not in prompt
    assert "speech bubbles, thought bubbles" not in prompt


def test_d2_d4_prompts_are_short_hidden_answer_and_metadata_free():
    word = exp.WordSpec("ausrutschen", "German", "to slip", "verb", "physical action")
    plan = _sample_d_plan()

    prompts = [
        exp.build_d2_prompt(word, "Photorealistic", plan),
        exp.build_d4_prompt(word, "Photorealistic", plan),
    ]
    for prompt in prompts:
        assert len(prompt) <= 700
        assert "ausrutschen" not in prompt
        assert ANSWER_HIDDEN_SENTENCE in prompt
        assert "No visible text" not in prompt
        assert "Incidental text" not in prompt
        for forbidden in [
            "Composition:",
            "Treatment:",
            "Creative mode:",
            "Text/embedding mode:",
            "Register note:",
            "Target word:",
            "Translation:",
        ]:
            assert forbidden not in prompt
        assert "speech bubbles, thought bubbles" not in prompt
        assert "signs, chat, labels" not in prompt.lower()


def test_v6_text_embedding_modes_are_metadata_only_in_d2_d4_prompts():
    word = exp.WordSpec("정", "Korean", "deep emotional bond / affection built over time", "noun", "cultural")

    for mode in ["word_as_matter", "word_as_form", "chat_ui", "social_overlay", "speech_bubble", "thought_bubble"]:
        plan = _sample_d_plan(
            image_scene="Two elderly neighbors silently exchange repaired bowls across a sunlit apartment hallway.",
            text_embedding_mode=mode,
        )
        d2 = exp.build_d2_prompt(word, "Photorealistic", plan)
        d4 = exp.build_d4_prompt(word, "Photorealistic", plan)

        assert mode not in d2
        assert mode not in d4
        assert "target script" not in d2.lower()
        assert "target script" not in d4.lower()
        assert "chat interface" not in d2.lower()
        assert "speech bubble" not in d4.lower()


def test_d_validator_stores_v6_metadata_and_layer2_candidate_flag():
    word = exp.WordSpec("정", "Korean", "deep emotional bond / affection built over time", "noun", "cultural")
    raw = _sample_d_plan(
        word="정",
        language="Korean",
        translation="deep emotional bond / affection built over time",
        part_of_speech="noun",
        word_category="cultural",
        text_embedding_mode="word_as_form",
    )

    validated, fallback = exp.validate_d_output(raw, word, "Photorealistic")

    assert fallback is False
    for key in [
        "word",
        "translation",
        "image_scene",
        "mnemonic",
        "mnemonic_confidence",
        "etymology",
        "usage_example",
        "composition",
        "treatment",
        "creative_mode",
        "text_embedding_mode",
    ]:
        assert key in validated
    assert validated["image_scene"] != validated["mnemonic"]
    assert validated["layer2_candidate_text_mode"] is True


def test_d_composition_helper_does_not_force_split_or_multi_panel():
    concrete = exp.WordSpec("die Leiter", "German", "ladder", "noun", "concrete noun")
    assert exp.normalize_v6_composition("split", concrete) == "single"
    assert exp.normalize_v6_composition("multi_panel", concrete) == "single"
    assert exp.normalize_v6_composition("split", concrete, strongly_selected=True) == "split"
    assert exp.normalize_v6_composition("multi_panel", concrete, strongly_selected=True) == "multi_panel"
    idiom = exp.WordSpec("to spill the beans", "English", "to reveal a secret", "idiom", "idiom")
    assert exp.normalize_v6_composition("split", idiom) == "split"


def test_dry_run_creates_v6_main_architecture_artifacts_without_calls(tmp_path, monkeypatch):
    monkeypatch.delenv("EXPERIMENT_LLM_RUN", raising=False)
    monkeypatch.delenv("EXPERIMENT_IMAGE_RUN", raising=False)
    output_root = tmp_path / "experiment"

    exit_code = exp.main(
        [
            "--dry-run",
            "--output-root",
            str(output_root),
            "--style",
            "Photorealistic",
            "--word-set",
            "fresh_v6_lockin_8",
            "--overwrite",
        ]
    )

    assert exit_code == 0
    for architecture in exp.MAIN_ARCHITECTURES:
        assert (output_root / architecture / "prompts").is_dir()
        assert (output_root / architecture / "metadata").is_dir()
    assert not (output_root / exp.CURRENT_BASELINE_ARCHITECTURE).exists()

    metadata_paths = sorted(output_root.glob("*/metadata/*.json"))
    assert len(metadata_paths) == 24

    sample_a = json.loads(
        (
            output_root
            / "A3_thin_meaning_only_hidden_answer"
            / "metadata"
            / "die_leiter.json"
        ).read_text(encoding="utf-8")
    )
    prompt_a = (
        output_root / "A3_thin_meaning_only_hidden_answer" / "prompts" / "die_leiter.txt"
    ).read_text(encoding="utf-8")
    assert sample_a["llm_called"] is False
    assert sample_a["displayed_mnemonic"] is None
    assert sample_a["card_scene_displayed"] is None
    assert sample_a["composition_used"] == "model_directed"
    assert sample_a["treatment_used"] == "model_directed"
    assert sample_a["text_embedding_mode"] == "model_directed"
    assert sample_a["creative_mode"] == "model_directed"
    assert sample_a["answer_visibility"] == "hidden"
    assert "die Leiter" not in prompt_a
    assert "vocabulary-card image" not in prompt_a.lower()

    sample_d2 = json.loads(
        (
            output_root
            / "D2_unified_short_hidden_answer"
            / "metadata"
            / "die_leiter.json"
        ).read_text(encoding="utf-8")
    )
    assert sample_d2["llm_called"] is False
    assert sample_d2["fallback_used"] is True
    assert sample_d2["provider"]["called"] is False
    for key in ["image_scene", "mnemonic", "etymology", "usage_example"]:
        assert key in sample_d2

    for top_level in [
        "EXPERIMENT_INDEX.md",
        "ALL_PROMPTS.md",
        "RUN_SUMMARY.md",
        "SCORE_SHEET.csv",
        "CONTACT_SHEET.md",
        "PREFLIGHT_PROMPT_QUALITY.md",
    ]:
        assert (output_root / top_level).is_file()


def test_image_only_mode_mirrors_existing_prompts_and_calls_kie_without_llm(tmp_path, monkeypatch):
    word = exp.WORD_SETS["fresh_v6_lockin_8"][0]
    source_root = tmp_path / "llm_v6"
    output_root = tmp_path / "images"
    _write_existing_prompt_source(source_root, word)
    calls = []

    def fake_render(prompt, output_path, aspect_ratio="16:9", resolution="1K"):
        calls.append((prompt, output_path, aspect_ratio, resolution))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"png")
        return {"success": True, "request_id": f"task-{len(calls)}", "response_body": "{}"}

    def fail_openrouter(*_args, **_kwargs):
        raise AssertionError("OpenRouter must not be called in image-only mode")

    monkeypatch.setattr(exp, "render_scene_gpt_image_2", fake_render)
    monkeypatch.setattr(exp, "call_openrouter_json", fail_openrouter)
    monkeypatch.setenv("EXPERIMENT_IMAGE_RUN", "true")
    monkeypatch.setenv("KIE_API_KEY", "test-key")
    monkeypatch.delenv("EXPERIMENT_LLM_RUN", raising=False)

    exit_code = exp.main(
        [
            "--run-images-from-existing-prompts",
            "--source-root",
            str(source_root),
            "--output-root",
            str(output_root),
            "--only-word",
            word.word,
            "--word-set",
            "fresh_v6_lockin_8",
            "--resolution",
            "1K",
            "--overwrite",
        ]
    )

    assert exit_code == 0
    assert len(calls) == 3
    assert all(call[3] == "1K" for call in calls)
    assert not (output_root / exp.CURRENT_BASELINE_ARCHITECTURE).exists()
    assert (output_root / "D2_unified_short_hidden_answer" / "llm_raw").is_dir()

    metadata = json.loads(
        (
            output_root
            / "D2_unified_short_hidden_answer"
            / "metadata"
            / f"{exp.slugify_word(word.word)}.json"
        ).read_text(encoding="utf-8")
    )
    assert metadata["provider"]["called"] is True
    assert metadata["provider"]["task_id"] == "task-2"
    assert metadata["provider"]["status"] == "succeeded"
    assert metadata["final_provider_prompt_sha256"]
    assert metadata["retry_count"] == 0
    assert metadata["provider_attempts"][0]["resolution"] == "1K"
    assert metadata["provider_attempts"][0]["aspect_ratio"] == "16:9"
    assert metadata["provider_run"]["llm_called"] is False

    summary = (output_root / "RUN_SUMMARY.md").read_text(encoding="utf-8")
    assert "Source prompt root:" in summary
    assert "LLM calls ran: no" in summary
    assert "OpenRouter calls ran: no" in summary
    assert "KIE calls ran: yes" in summary
    assert "Resolution used: 1K" in summary
    assert "Aspect ratio used: 16:9" in summary
    assert "Number of image rows expected: 3" in summary
    assert "Confirmation: no Supabase writes occurred." in summary
    assert "Confirmation: no Supabase Storage uploads occurred." in summary
    assert "Confirmation: no fallback provider was used." in summary


def test_image_provider_retries_provider_500_twice_with_diagnostics(tmp_path, monkeypatch):
    calls = []

    def fake_render(_prompt, output_path, aspect_ratio="16:9", resolution="1K"):
        calls.append((aspect_ratio, resolution))
        if len(calls) < 3:
            return {
                "success": False,
                "error_message": "generation failed: failCode=500 failMsg=Internal Error",
                "response_body": '{"failCode":500,"failMsg":"Internal Error"}',
                "request_id": f"task-{len(calls)}",
            }
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"png")
        return {"success": True, "request_id": "retry-task", "response_body": "{}"}

    monkeypatch.setattr(exp, "render_scene_gpt_image_2", fake_render)
    monkeypatch.setattr(exp.time, "sleep", lambda _seconds: None)

    provider = exp.call_image_provider(
        prompt="prompt",
        image_path=tmp_path / "out.png",
        overwrite=True,
        resolution="1K",
        aspect_ratio="16:9",
        retry_backoffs=[30, 120],
    )

    assert len(calls) == 3
    assert calls == [("16:9", "1K"), ("16:9", "1K"), ("16:9", "1K")]
    assert provider["status"] == "succeeded"
    assert provider["task_id"] == "retry-task"
    assert provider["retry_count"] == 2
    assert provider["retry_reasons"] == ["transient_provider_failcode_500", "transient_provider_failcode_500"]
    assert provider["attempts"][0]["resolution"] == "1K"
    assert provider["attempts"][0]["raw_failCode"] == 500


def test_command_for_run_records_interpreter_and_script(monkeypatch):
    monkeypatch.setattr(exp.sys, "executable", "C:/Python/python.exe")
    monkeypatch.setattr(
        exp.sys,
        "argv",
        [
            "scripts/experiments/gpt_image_2_architecture_experiment.py",
            "--dry-run",
            "--output-root",
            "tmp/out",
        ],
    )

    assert exp.command_for_run(None) == (
        "C:/Python/python.exe "
        "scripts/experiments/gpt_image_2_architecture_experiment.py "
        "--dry-run --output-root tmp/out"
    )
