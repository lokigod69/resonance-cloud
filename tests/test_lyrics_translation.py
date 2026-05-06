from __future__ import annotations

import json
import logging

import httpx

from src.services import lyrics_translation


def test_translate_song_lyrics_returns_ok_from_valid_json(monkeypatch):
    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {"message": {"content": json.dumps({"translation": "[Verse]\nHola mundo"})}}
                ]
            }

    class FakeClient:
        def __init__(self, **kwargs):
            captured["client_kwargs"] = kwargs

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, url, *, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            captured["body"] = json
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "[Verse]\nHello world",
        source_language="English",
        target_language="Spanish",
        word="hello",
        translation="hola",
    )

    assert result["status"] == "ok"
    assert result["lyrics"] == "[Verse]\nHola mundo"
    assert result["language"] == "Spanish"
    assert result["model"] == "anthropic/claude-haiku-4.5"
    assert captured["client_kwargs"]["timeout"] == 12.0
    assert captured["body"]["temperature"] == 0.3
    assert captured["body"]["response_format"] == {"type": "json_object"}
    assert "display/read-along only" in captured["body"]["messages"][0]["content"]


def test_translate_song_lyrics_skips_target_equals_base(monkeypatch):
    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = lyrics_translation.translate_song_lyrics(
        "[Verse]\nHello",
        source_language="English",
        target_language="english",
        word="hello",
        translation="hello",
    )

    assert result == {"status": "skipped", "reason": "target_equals_base"}


def test_translate_song_lyrics_skips_empty_lyrics(monkeypatch):
    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    result = lyrics_translation.translate_song_lyrics(
        "  ",
        source_language="French",
        target_language="English",
        word="bonjour",
        translation="hello",
    )

    assert result == {"status": "skipped", "reason": "empty_source"}


def test_translate_song_lyrics_skips_missing_api_key(monkeypatch):
    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    result = lyrics_translation.translate_song_lyrics(
        "lyrics",
        source_language="French",
        target_language="English",
        word="bonjour",
        translation="hello",
    )

    assert result == {"status": "skipped", "reason": "no_api_key"}


def test_translate_song_lyrics_handles_http_error_as_failed(monkeypatch):
    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            raise httpx.HTTPStatusError("500", request=None, response=None)

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "lyrics",
        source_language="French",
        target_language="English",
        word="bonjour",
        translation="hello",
    )

    assert result["status"] == "failed"
    assert result["language"] == "English"
    assert "500" in result["error"]
    assert result["attempted_at"]


def test_translate_song_lyrics_provider_400_returns_safe_diagnostic(monkeypatch, caplog):
    full_lyrics = "SECRET FIRST LINE\nSECRET SECOND LINE"
    captured: dict = {}

    class FakeResponse:
        status_code = 400
        text = (
            '{"error":{"message":"Provider rejected response_format for model. '
            'Echoed lyrics: SECRET FIRST LINE\\nSECRET SECOND LINE"}}'
        )

        def raise_for_status(self):
            request = httpx.Request("POST", lyrics_translation.OPENROUTER_URL)
            response = httpx.Response(400, request=request, text=self.text)
            raise httpx.HTTPStatusError("400 Bad Request", request=request, response=response)

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, _url, *, headers, json):
            captured["body"] = json
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_LYRICS_TRANSLATION_MODEL", "deepseek/deepseek-v4-flash")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)
    caplog.set_level(logging.WARNING, logger="src.services.lyrics_translation")

    result = lyrics_translation.translate_song_lyrics(
        full_lyrics,
        source_language="English",
        target_language="German",
        word="labyrinth",
        translation="Labyrinth",
    )

    assert result["status"] == "failed"
    assert result["model"] == "deepseek/deepseek-v4-flash"
    assert "OpenRouter HTTP 400" in result["error"]
    assert "deepseek/deepseek-v4-flash" in result["error"]
    assert "Provider rejected response_format" in result["error"]
    assert "[lyrics_redacted]" in result["error"]
    assert full_lyrics not in result["error"]
    assert "model=deepseek/deepseek-v4-flash" in caplog.text
    assert "status=400" in caplog.text
    assert "Provider rejected response_format" in caplog.text
    assert full_lyrics not in caplog.text
    assert captured["body"]["model"] == "deepseek/deepseek-v4-flash"


def test_translate_song_lyrics_strips_markdown_fences(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {"message": {"content": '```json\n{"translation":"[Chorus]\\nBonjour"}\n```'}}
                ]
            }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "[Chorus]\nHello",
        source_language="English",
        target_language="French",
        word="hello",
        translation="bonjour",
    )

    assert result["status"] == "ok"
    assert result["lyrics"] == "[Chorus]\nBonjour"


def test_translate_song_lyrics_accepts_section_tags(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {"message": {"content": json.dumps({"translation": "[Verse]\nHola\n\n[Chorus]\nHola"})}}
                ]
            }

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "[Verse]\nHello\n\n[Chorus]\nHello",
        source_language="English",
        target_language="Spanish",
        word="hello",
        translation="hola",
    )

    assert result["status"] == "ok"
    assert "[Verse]" in result["lyrics"]
    assert "[Chorus]" in result["lyrics"]


def test_translate_song_lyrics_disabled_by_default_skips_openrouter(monkeypatch):
    called = {"post": False}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            called["post"] = True
            raise AssertionError("OpenRouter should not be called when disabled")

    monkeypatch.delenv("ENABLE_LYRICS_TRANSLATION", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "lyrics",
        source_language="English",
        target_language="French",
        word="hello",
        translation="bonjour",
    )

    assert result == {"status": "skipped", "reason": "translation_disabled"}
    assert called["post"] is False


def test_translate_song_lyrics_uses_env_model_override(monkeypatch):
    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": json.dumps({"translation": "Bonjour"})}}]}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, _url, *, headers, json):
            captured["body"] = json
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setenv("OPENROUTER_LYRICS_TRANSLATION_MODEL", "provider/model")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "Hello",
        source_language="English",
        target_language="French",
        word="hello",
        translation="bonjour",
    )

    assert result["status"] == "ok"
    assert result["model"] == "provider/model"
    assert captured["body"]["model"] == "provider/model"


def test_lyrics_translation_timeout_default_is_at_most_15_seconds(monkeypatch):
    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": json.dumps({"translation": "Bonjour"})}}]}

    class FakeClient:
        def __init__(self, **kwargs):
            captured["timeout"] = kwargs["timeout"]

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.delenv("LYRICS_TRANSLATION_TIMEOUT_SECONDS", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    lyrics_translation.translate_song_lyrics(
        "Hello",
        source_language="English",
        target_language="French",
        word="hello",
        translation="bonjour",
    )

    assert captured["timeout"] <= 15.0


def test_translate_song_lyrics_french_target_does_not_skip_target_equals_base(monkeypatch):
    captured = {"called": False}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": json.dumps({"translation": "Bonjour"})}}]}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def post(self, *_args, **_kwargs):
            captured["called"] = True
            return FakeResponse()

    monkeypatch.setenv("ENABLE_LYRICS_TRANSLATION", "true")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(lyrics_translation.httpx, "Client", FakeClient)

    result = lyrics_translation.translate_song_lyrics(
        "Hello",
        source_language="English",
        target_language="French",
        word="hello",
        translation="bonjour",
    )

    assert result["status"] == "ok"
    assert captured["called"] is True
