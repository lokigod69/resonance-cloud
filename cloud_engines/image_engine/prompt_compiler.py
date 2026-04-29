"""Compile storyboard image prompts into Wan-friendly natural language."""

from __future__ import annotations

from typing import Optional


STYLE_VOCABULARY: dict[str, str] = {
    "photorealistic": (
        "documentary photography, available light, natural skin texture, subtle pores, "
        "unretouched candid quality, fine grain"
    ),
    "cinematic": (
        "cinematic film still, anamorphic lens, naturalistic color grading, practical "
        "lighting sources, fine grain, 35mm film aesthetic"
    ),
    "oil_painting": (
        "oil on canvas, visible brushwork, impasto highlights, layered glazes, "
        "palette knife texture"
    ),
    "watercolor": (
        "watercolor on textured paper, restrained pigment bloom, soft edges, paper grain "
        "visible, light pencil under-drawing"
    ),
    "surrealism": (
        "surrealist composition, deadpan absurd juxtaposition, dream-logic spatial "
        "relationships, painterly precision, naturalistic rendering of impossible subjects"
    ),
    "pop_art": (
        "pop art aesthetic, bold flat color blocks, halftone dot patterns, high contrast "
        "comic-book inking, saturated primaries"
    ),
    "chiaroscuro": (
        "high-contrast chiaroscuro lighting, deep shadow with selective illumination, "
        "baroque painting tradition, dramatic single light source"
    ),
    "art_nouveau": (
        "art nouveau illustration, flowing organic linework, decorative botanical motifs, "
        "muted jewel-tone palette, flat planar color"
    ),
    "ukiyo_e": (
        "Japanese ukiyo-e woodblock print, flat planar color, bold black outlines, "
        "traditional pigment palette, decorative pattern fields"
    ),
    "van_gogh": (
        "post-impressionist oil painting, bold visible brushstrokes, swirling impasto, "
        "vivid saturated colors, expressive distortion, hand-painted texture"
    ),
    "studio_ghibli": (
        "hand-painted Japanese animation aesthetic, soft watercolor backgrounds, warm "
        "naturalistic palette, gentle character design, painterly brushwork"
    ),
    "anime": (
        "hand-drawn 2D anime, soft cel-shading, expressive line quality, "
        "animation-cel rendering, warm pastel palette"
    ),
    "comic_book": (
        "comic book illustration, bold ink outlines, halftone shading, dynamic panel "
        "composition, saturated flat color fills"
    ),
    "disney_animation": (
        "polished 3D animation, expressive character animation, cinematic lighting, "
        "family-friendly aesthetic, soft material rendering"
    ),
    "one_piece_style": (
        "vibrant 2D anime, bold ink outlines, dynamic exaggerated proportions, saturated "
        "color blocks, action-manga energy"
    ),
    "rick_and_morty_style": (
        "loose hand-drawn 2D animation, simplified character shapes, flat color fills, "
        "irreverent visual humor"
    ),
    "pixel_art": (
        "pixel art rendering, limited palette, dithered shading, sprite-based composition, "
        "retro game aesthetic"
    ),
    "synthwave": (
        "synthwave aesthetic, neon magenta and cyan palette, sunset gradient sky, "
        "geometric grid horizon, 1980s digital nostalgia"
    ),
    "cyberpunk": (
        "cyberpunk cinematography, neon-drenched urban environments, holographic signage, "
        "rain-slick reflective surfaces, high-contrast color grading"
    ),
    "vaporwave": (
        "vaporwave aesthetic, pastel pink and teal palette, classical sculpture motifs, "
        "glitchy 1990s digital artifacts, dreamlike commercial imagery"
    ),
    "glitch_art": (
        "glitch art rendering, datamoshing artifacts, RGB channel separation, scan-line "
        "distortion, digital corruption aesthetic"
    ),
    "knitted": (
        "knitted textile rendering, visible yarn fiber and stitch structure, soft "
        "handcrafted texture, warm wool tones"
    ),
    "claymation": (
        "stop-motion clay animation, visible fingerprint texture on surfaces, slightly "
        "imperfect handcrafted forms, soft studio lighting, frame-captured quality"
    ),
    "origami": (
        "origami paper craft, crisp folded paper geometry, visible paper grain and creases, "
        "soft natural lighting, minimal background"
    ),
    "stained_glass": (
        "stained glass window, leaded panel divisions, jewel-tone translucent color, "
        "light shining through colored glass, medieval ecclesiastical aesthetic"
    ),
    "noir": (
        "black and white film noir cinematography, hard shadow contrast, venetian blind "
        "shadow patterns, smoke-filled atmosphere, 1940s film stock"
    ),
    "vintage_film": (
        "vintage film photography, faded color saturation, slight grain, "
        "period-appropriate clothing and setting, soft optical character"
    ),
    "double_exposure": (
        "double exposure photography, two superimposed images blending, silhouette filled "
        "with secondary scene, dreamlike layered composition"
    ),
    "pen_and_ink": (
        "pen and ink illustration, fine cross-hatched shading, bold linework, monochrome "
        "composition, traditional drawing aesthetic"
    ),
    "charcoal_sketch": (
        "charcoal sketch on textured paper, soft tonal gradients, smudged shading, "
        "expressive gestural marks, monochrome"
    ),
    "steampunk": (
        "steampunk aesthetic, brass gears and copper piping, Victorian fashion, leather "
        "and polished wood, anachronistic mechanical detail"
    ),
    "polaroid": (
        "Polaroid instant photography, thick white border, washed color, soft flash falloff, "
        "casual snapshot intimacy"
    ),
    "impressionism": (
        "impressionist painting, loose visible brushstrokes, broken color, natural outdoor "
        "light, atmospheric softness"
    ),
    "expressionism": (
        "expressionist painting, distorted forms, intense non-natural color, agitated "
        "brushwork, psychological intensity"
    ),
    "cubism": (
        "cubist composition, fragmented geometric planes, multiple perspectives, muted "
        "earth tones, flattened picture space"
    ),
    "renaissance": (
        "renaissance painting, balanced classical composition, sfumato shading, naturalistic "
        "anatomy, rich drapery detail"
    ),
    "art_deco": (
        "art deco design, geometric symmetry, metallic accents, stepped forms, luxurious "
        "streamlined surfaces"
    ),
    "chinese_ink_wash": (
        "Chinese ink wash painting, expressive monochrome brushwork, rice paper texture, "
        "misty atmospheric space, restrained composition"
    ),
    "pixar_3d": (
        "stylized 3D animation, appealing character design, cinematic lighting, rich "
        "materials, polished family-film rendering"
    ),
    "dragon_ball_style": (
        "high-energy 2D anime, muscular proportions, spiky silhouettes, bold outlines, "
        "dynamic martial arts composition"
    ),
    "south_park_style": (
        "construction-paper cutout animation, simple geometric characters, flat bold "
        "colors, intentionally crude handmade shapes"
    ),
    "blue_eyed_samurai": (
        "cinematic painterly animation, Edo-era detail, dramatic widescreen composition, "
        "muted earth palette with selective accents"
    ),
    "invincible": (
        "Western superhero animation, clean bold outlines, flat cel-shaded color, dramatic "
        "perspective, graphic-novel energy"
    ),
    "retro_90s": (
        "1990s graphic design aesthetic, neon color accents, Memphis patterns, bold "
        "typography, energetic commercial styling"
    ),
    "botanical_illustration": (
        "botanical illustration, scientifically precise plant detail, fine linework, "
        "delicate watercolor washes, neutral background"
    ),
    "storybook": (
        "storybook illustration, warm hand-painted quality, soft edges, gentle lighting, "
        "charming narrative composition"
    ),
    "banksy": (
        "stencil street art, sharp spray-painted silhouettes, rough urban wall texture, "
        "satirical graphic contrast"
    ),
    "escher": (
        "mathematical engraving aesthetic, impossible geometry, tessellated forms, precise "
        "black-and-white linework"
    ),
    "klimt": (
        "Vienna Secession decorative painting, gold ornamental pattern fields, mosaic-like "
        "surfaces, elegant figure rendering"
    ),
    "gerhard_richter": (
        "squeegee-dragged abstract painting, smeared layered color fields, scraped paint "
        "texture, luminous physical pigment"
    ),
    "fantasy_art": (
        "epic fantasy illustration, dramatic magical lighting, ornate costumes, heroic "
        "scale, richly detailed environment"
    ),
    "collage": (
        "mixed-media collage, torn paper edges, layered photographs and textures, visible "
        "overlap, handmade assemblage quality"
    ),
    "lego_voxel": (
        "building-brick voxel rendering, blocky stepped surfaces, visible studs, miniature "
        "constructive scale, primary-color accents"
    ),
}


def _resolve_style_vocabulary(art_style: str, override: Optional[str]) -> str:
    """Return expanded style vocabulary for compilation."""
    if override:
        return override
    return STYLE_VOCABULARY.get(art_style, art_style)


def compile_scene_to_text(
    scene: dict,
    *,
    has_reference_image: bool,
    use_color_palette: bool = True,
) -> str:
    """Compile a storyboard scene into the Wan 2.7 API prompt string."""
    ip = scene["image_prompt"]
    art_style = scene.get("art_style") or "photorealistic"
    style_vocab = _resolve_style_vocabulary(
        art_style,
        ip.get("style_medium_override"),
    )

    parts: list[str] = []

    if has_reference_image:
        parts.append(
            f"Use image 1 as the identity anchor for {ip['subject_identity']}."
        )
        if ip.get("continuity_anchor"):
            parts.append(f"Keep the same {ip['continuity_anchor']}.")
        if ip.get("change_request"):
            parts.append(f"Change: {ip['change_request']}.")

    if has_reference_image:
        action_state = ip["action_state"]
        sentence_action = action_state[:1].upper() + action_state[1:]
        parts.append(f"{sentence_action} in {ip['environment']}.")
    else:
        parts.append(
            f"{ip['subject_identity']} {ip['action_state']} in {ip['environment']}."
        )
    parts.append(f"Composition: {ip['composition']}.")
    parts.append(f"Lighting: {ip['lighting']}.")
    parts.append(f"Materials: {ip['material_detail']}.")

    if use_color_palette:
        parts.append(f"Mood: {ip['mood_palette']}.")
    else:
        mood_only = ip["mood_palette"].split(",")[0].strip()
        parts.append(f"Mood: {mood_only}.")

    parts.append(f"{style_vocab}.")

    return " ".join(parts)
