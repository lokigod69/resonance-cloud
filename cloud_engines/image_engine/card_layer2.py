"""Layer 2 card customization resolver for GPT Image-2 cards."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import re
from typing import Any, Iterable, Mapping


IMAGE_BRIDGE_MAX_CHARS = 220


class MeaningStrategy(StrEnum):
    CLEAR_MEANING = "clear_meaning"
    EXAGGERATED_MEANING = "exaggerated_meaning"
    ABSURD_HOOK = "absurd_hook"
    SOUND_MNEMONIC = "sound_mnemonic"
    ETYMOLOGY_ORIGIN = "etymology_origin"
    EMBEDDED_WORD = "embedded_word"


class PresentationForm(StrEnum):
    SINGLE_SCENE = "single_scene"
    MINI_STORY = "mini_story"
    SPLIT_PANEL = "split_panel"
    WORD_OBJECT_DESIGN = "word_object_design"
    INFOGRAPHIC_CARD = "infographic_card"
    TEACHING_CARD = "teaching_card"
    SOCIAL_STREAM_SCENE = "social_stream_scene"
    DIALOGUE_BUBBLE_SCENE = "dialogue_bubble_scene"


class VisualIntensity(StrEnum):
    SIMPLE = "simple"
    BALANCED = "balanced"
    CINEMATIC = "cinematic"


EXPOSED_V1_MEANING_STRATEGIES = (
    MeaningStrategy.CLEAR_MEANING.value,
    MeaningStrategy.EXAGGERATED_MEANING.value,
    MeaningStrategy.ABSURD_HOOK.value,
    MeaningStrategy.SOUND_MNEMONIC.value,
)
EXPOSED_V1_PRESENTATION_FORMS = (
    PresentationForm.SINGLE_SCENE.value,
    PresentationForm.MINI_STORY.value,
    PresentationForm.SPLIT_PANEL.value,
    PresentationForm.WORD_OBJECT_DESIGN.value,
    PresentationForm.INFOGRAPHIC_CARD.value,
)

VISUAL_INTENSITY_RENDERER_PROFILE = {
    VisualIntensity.SIMPLE: "simple_visual",
    VisualIntensity.BALANCED: "balanced_teaching",
    VisualIntensity.CINEMATIC: "cinematic_memory",
}

ART_STYLE_DIRECTIVES: dict[str, str] = {
    "realistic": "Style: photo-real, believable natural scene.",
    "cinematic": "Style: film-still look, intentional light and depth.",
    "editorial": "Style: polished magazine image.",
    "illustration": "Style: clean high-end drawn image.",
    "anime": "Style: polished Japanese-animation look.",
    "studio_ghibli_inspired": "Style: warm hand-painted fantasy animation feel.",
    "disney_animation_inspired": "Style: expressive polished family-animation look.",
    "comic_book": "Style: dynamic comic-book illustration, bold framing.",
    "pixel_art": "Style: retro pixel-art composition, readable silhouettes.",
    "vintage_film": "Style: analog film look, grain and warm color.",
    "oil_painting": "Style: painterly oil texture, classical brushwork.",
    "surrealism": "Style: dreamlike surreal composition but still readable.",
    "fantasy_art": "Style: mythic fantasy illustration, dramatic atmosphere.",
    "pen_and_ink": "Style: monochrome ink linework, detailed but readable.",
    "charcoal_sketch": "Style: charcoal drawing, strong tonal contrast.",
    "claymation": "Style: tactile clay stop-motion look.",
    "ukiyo_e": "Style: Japanese woodblock-print inspired composition.",
    "chinese_ink_wash": "Style: ink-wash painting, restrained brushwork.",
    "art_deco": "Style: geometric luxury design, elegant symmetry.",
    "art_nouveau": "Style: flowing ornamental lines, organic forms.",
    "south_park_style": "Style: South-Park-inspired cutout-animation look.",
    "rick_and_morty_style": "Style: Rick-and-Morty-inspired animated sci-fi comedy look.",
    "pixar_3d": "Style: Pixar-like polished 3D animated look.",
}
ART_STYLE_ALIASES = {
    "photorealistic": "realistic",
    "surreal_dreamlike": "surrealism",
    "sketch_monochrome": "pen_and_ink",
    "studio_ghibli": "studio_ghibli_inspired",
    "disney_animation": "disney_animation_inspired",
    "random": "realistic",
}


@dataclass(frozen=True)
class Layer2Resolution:
    user_choices: dict[str, str]
    resolved: dict[str, str]
    snap_notes: list[str]
    image_bridge: str
    style_directive: str | None = None
    text_directive: str | None = None

    @property
    def allow_target_word_in_prompt(self) -> bool:
        return (
            self.resolved["meaning_strategy"] == MeaningStrategy.EMBEDDED_WORD.value
            or self.resolved["presentation_form"] == PresentationForm.INFOGRAPHIC_CARD.value
        )

    @property
    def allow_translation_in_prompt(self) -> bool:
        return self.resolved["presentation_form"] == PresentationForm.INFOGRAPHIC_CARD.value


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _enum_value(enum_cls: type[StrEnum], value: Any, default: StrEnum) -> StrEnum:
    try:
        return enum_cls(_clean(value).lower())
    except ValueError:
        return default


def _fact(word_facts: Mapping[str, Any], key: str) -> str:
    return _clean(word_facts.get(key))


def _sentence_trim(text: str, max_chars: int) -> str:
    text = _clean(text)
    if len(text) <= max_chars:
        return text
    clipped = text[:max_chars].rstrip()
    break_at = max(clipped.rfind(". "), clipped.rfind("; "), clipped.rfind(", "))
    if break_at > max_chars * 0.45:
        clipped = clipped[:break_at]
    else:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped.rstrip(" ,;:.") + "."


def _text_embedding_mode(form: PresentationForm) -> str:
    if form == PresentationForm.WORD_OBJECT_DESIGN:
        return "word_as_matter"
    if form == PresentationForm.INFOGRAPHIC_CARD:
        return "infographic_text"
    if form == PresentationForm.SOCIAL_STREAM_SCENE:
        return "social_overlay"
    if form == PresentationForm.DIALOGUE_BUBBLE_SCENE:
        return "speech_bubble"
    return "none"


def _resolve_composition(form: PresentationForm) -> str:
    if form == PresentationForm.MINI_STORY:
        return "multi_panel"
    if form == PresentationForm.SPLIT_PANEL:
        return "split"
    if form == PresentationForm.WORD_OBJECT_DESIGN:
        return "embodied"
    if form == PresentationForm.INFOGRAPHIC_CARD:
        return "infographic"
    return "single"


def _resolve_treatment(meaning: MeaningStrategy) -> str:
    return {
        MeaningStrategy.CLEAR_MEANING: "literal",
        MeaningStrategy.EXAGGERATED_MEANING: "embodied",
        MeaningStrategy.ABSURD_HOOK: "absurd",
        MeaningStrategy.SOUND_MNEMONIC: "mnemonic",
        MeaningStrategy.ETYMOLOGY_ORIGIN: "etymological",
        MeaningStrategy.EMBEDDED_WORD: "embodied",
    }[meaning]


def _resolve_creative_mode(meaning: MeaningStrategy, form: PresentationForm) -> str:
    if form == PresentationForm.MINI_STORY:
        return "multi_panel_sequence"
    if form == PresentationForm.SPLIT_PANEL:
        return "split_contrast"
    if form == PresentationForm.WORD_OBJECT_DESIGN:
        return "typographic_material"
    if form == PresentationForm.INFOGRAPHIC_CARD:
        return "educational_infographic"
    if form == PresentationForm.TEACHING_CARD:
        return "clean_iconic"
    if form == PresentationForm.SOCIAL_STREAM_SCENE:
        return "social_livestream"
    if form == PresentationForm.DIALOGUE_BUBBLE_SCENE:
        return "chat_interface"
    return {
        MeaningStrategy.CLEAR_MEANING: "clean_iconic",
        MeaningStrategy.EXAGGERATED_MEANING: "embodied",
        MeaningStrategy.ABSURD_HOOK: "absurd_surreal",
        MeaningStrategy.SOUND_MNEMONIC: "mnemonic_bridge",
        MeaningStrategy.ETYMOLOGY_ORIGIN: "etymological",
        MeaningStrategy.EMBEDDED_WORD: "typographic_material",
    }[meaning]


def _text_directive(text_mode: str, word: str) -> str | None:
    word_text = _clean(word) or "the target word"
    if text_mode == "word_as_matter":
        return (
            f'Make the target word "{word_text}" visibly readable as a large physical '
            "typographic object in the scene, constructed from material tied to the meaning. "
            "The word must be central to the composition, not a small label."
        )
    if text_mode == "word_as_form":
        return (
            f'Make the target word "{word_text}" visibly readable as a large constructed '
            "form shaping the scene or main object. The word must be central to the "
            "composition, not a small label."
        )
    if text_mode == "infographic_text":
        return (
            f'Design as an image-first educational infographic. The target word "{word_text}" '
            "and its translation may appear as short readable text. Use only compact labels "
            "or callouts; spell the target word and translation exactly."
        )
    return None


def resolve_style_directive(style: str | None) -> str | None:
    normalized = _clean(style).lower()
    normalized = ART_STYLE_ALIASES.get(normalized, normalized)
    return ART_STYLE_DIRECTIVES.get(normalized)


def _bridge(
    meaning: MeaningStrategy,
    form: PresentationForm,
    word_facts: Mapping[str, Any],
    snap_notes: list[str],
) -> str:
    word = _fact(word_facts, "word") or "the target word"
    translation = _fact(word_facts, "translation") or "the meaning"
    scene = _fact(word_facts, "image_scene") or f"a clear scene for {translation}"
    emotion = _fact(word_facts, "dominant_emotional_reading")
    bridge_mnemonic = _fact(word_facts, "bridge_mnemonic")
    mnemonic = _fact(word_facts, "mnemonic")
    etymology = _fact(word_facts, "etymology")

    if meaning == MeaningStrategy.SOUND_MNEMONIC and not bridge_mnemonic:
        bridge_mnemonic = mnemonic or f"a sound cue leading to {translation}"
        snap_notes.append("sound_mnemonic missing bridge_mnemonic; used mnemonic fallback")

    if form == PresentationForm.WORD_OBJECT_DESIGN:
        return _sentence_trim(
            f'Memory logic: make "{word}" the visual subject, formed from material or shapes tied to {translation}.',
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if form == PresentationForm.INFOGRAPHIC_CARD:
        return _sentence_trim(
            f"Memory logic: create an educational infographic about {word}, anchored by a central visual metaphor and short callouts that teach {translation}.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if meaning == MeaningStrategy.SOUND_MNEMONIC and form == PresentationForm.SPLIT_PANEL:
        return _sentence_trim(
            f"Memory logic: split the image between the sound bridge ({bridge_mnemonic}) and the meaning {translation}.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if meaning == MeaningStrategy.SOUND_MNEMONIC:
        return _sentence_trim(
            f"Memory logic: let the sound bridge ({bridge_mnemonic}) lead into a clear scene of {translation}.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if meaning == MeaningStrategy.ETYMOLOGY_ORIGIN:
        return _sentence_trim(
            f"Memory logic: show the origin idea from {etymology} as it becomes {translation}.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if form == PresentationForm.MINI_STORY:
        mode = "absurd escalation" if meaning == MeaningStrategy.ABSURD_HOOK else "clear 2-3 beat sequence"
        return _sentence_trim(
            f"Memory logic: use a {mode} to teach {translation}, anchored in {scene}.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if form == PresentationForm.SPLIT_PANEL:
        return _sentence_trim(
            f"Memory logic: split-panel contrast makes {translation} readable through two matching visual states.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if meaning == MeaningStrategy.EXAGGERATED_MEANING:
        suffix = f" Emotional cue: {emotion}." if emotion else ""
        return _sentence_trim(
            f"Memory logic: intensify body, action, or emotion so {translation} is obvious.{suffix}",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    if meaning == MeaningStrategy.ABSURD_HOOK:
        return _sentence_trim(
            f"Memory logic: add one elegant strange hook to the scene so {translation} is memorable, not random.",
            IMAGE_BRIDGE_MAX_CHARS,
        )
    return _sentence_trim(
        f"Memory logic: keep one direct visual moment focused on {translation}.",
        IMAGE_BRIDGE_MAX_CHARS,
    )


def resolve_layer2(
    card_layer2: Mapping[str, Any] | None,
    *,
    word_facts: Mapping[str, Any],
    art_style: str | None = None,
    explicit_user_choices: Iterable[str] | None = None,
) -> Layer2Resolution | None:
    if not isinstance(card_layer2, Mapping) or not card_layer2:
        return None

    explicit = set(explicit_user_choices or card_layer2.keys())
    user_meaning = _enum_value(
        MeaningStrategy,
        card_layer2.get("meaning_strategy"),
        MeaningStrategy.CLEAR_MEANING,
    )
    user_form = _enum_value(
        PresentationForm,
        card_layer2.get("presentation_form"),
        PresentationForm.SINGLE_SCENE,
    )
    visual = _enum_value(
        VisualIntensity,
        card_layer2.get("visual_intensity"),
        VisualIntensity.BALANCED,
    )
    snap_notes: list[str] = []

    meaning = user_meaning
    form = user_form

    if form == PresentationForm.WORD_OBJECT_DESIGN:
        if meaning == MeaningStrategy.CLEAR_MEANING and "presentation_form" not in explicit:
            form = PresentationForm.SINGLE_SCENE
            snap_notes.append(
                "clear_meaning + word_object_design snapped presentation_form to single_scene"
            )
        elif meaning != MeaningStrategy.EMBEDDED_WORD:
            meaning = MeaningStrategy.EMBEDDED_WORD
            snap_notes.append("word_object_design forced meaning_strategy to embedded_word")

    if meaning == MeaningStrategy.ETYMOLOGY_ORIGIN and not _fact(word_facts, "etymology"):
        meaning = MeaningStrategy.CLEAR_MEANING
        snap_notes.append("etymology_origin missing etymology; fell back to clear_meaning")

    text_mode = _text_embedding_mode(form)
    if visual == VisualIntensity.SIMPLE and text_mode != "none":
        visual = VisualIntensity.BALANCED
        snap_notes.append("simple visual_intensity snapped to balanced for text-heavy presentation")

    resolved = {
        "meaning_strategy": meaning.value,
        "presentation_form": form.value,
        "visual_intensity": visual.value,
        "renderer_profile": VISUAL_INTENSITY_RENDERER_PROFILE[visual],
        "renderer_profile_source": "user_override",
        "treatment": _resolve_treatment(meaning),
        "composition": _resolve_composition(form),
        "creative_mode": _resolve_creative_mode(meaning, form),
        "text_embedding_mode": text_mode,
        "effective_text_embedding_mode": text_mode,
        "answer_visibility": "teaching_text_allowed"
        if form == PresentationForm.INFOGRAPHIC_CARD
        else "target_word_embedded"
        if meaning == MeaningStrategy.EMBEDDED_WORD
        else "hidden",
    }
    user_choices = {
        "meaning_strategy": user_meaning.value,
        "presentation_form": user_form.value,
        "visual_intensity": _enum_value(
            VisualIntensity,
            card_layer2.get("visual_intensity"),
            VisualIntensity.BALANCED,
        ).value,
    }

    return Layer2Resolution(
        user_choices=user_choices,
        resolved=resolved,
        snap_notes=snap_notes,
        image_bridge=_bridge(meaning, form, word_facts, snap_notes),
        style_directive=resolve_style_directive(art_style),
        text_directive=_text_directive(text_mode, _fact(word_facts, "word")),
    )
