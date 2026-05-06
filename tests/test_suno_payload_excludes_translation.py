from __future__ import annotations

import json

from src.suno import build_suno_payload


def test_build_suno_payload_does_not_read_translation_keys():
    concept_data = {
        "word": "viral",
        "translation": "viral",
        "lyrics": "[Verse]\nOriginal lyrics only",
        "music_caption": "upbeat pop, clear diction",
        "language": "Spanish",
        "vocal_gender": "female",
        "translated_lyrics": "DO NOT SEND THIS TO SUNO",
        "display_translation": "DO NOT SEND THIS EITHER",
    }

    payload = build_suno_payload(concept_data)

    assert payload["prompt"] == concept_data["lyrics"]
    assert "DO NOT SEND THIS TO SUNO" not in json.dumps(payload)
    assert "DO NOT SEND THIS EITHER" not in json.dumps(payload)
