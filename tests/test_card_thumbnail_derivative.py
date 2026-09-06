from __future__ import annotations

import asyncio
from pathlib import Path

from PIL import Image

from src.orchestration import card_worker as card_worker_module
from src.orchestration.card_worker import (
    CARD_THUMBNAIL_SIZE,
    CardWorker,
    _card_thumbnail_storage_key,
    _create_card_thumbnail,
)


def test_card_thumbnail_is_exact_small_rgb_webp(tmp_path: Path) -> None:
    source_path = tmp_path / "card.png"
    Image.new("RGBA", (1920, 1080), (20, 40, 60, 120)).save(source_path)

    thumbnail_path = _create_card_thumbnail(source_path)

    assert source_path.exists(), "full study/detail image must be retained"
    assert thumbnail_path.name == "card.thumb.webp"
    with Image.open(thumbnail_path) as thumbnail:
        assert thumbnail.format == "WEBP"
        assert thumbnail.mode == "RGB"
        assert thumbnail.size == CARD_THUMBNAIL_SIZE == (640, 360)


def test_card_thumbnail_key_is_separate_and_stable() -> None:
    key = _card_thumbnail_storage_key(
        user_id="user_1",
        deck_id="deck-1",
        word_slug="guten-tag",
        word_id="word_1",
    )

    assert key == "user_1/deck-1/cards/guten-tag_word_1.thumb.webp"


class _Bucket:
    def __init__(self) -> None:
        self.uploads: list[tuple[str, bytes, dict[str, str]]] = []

    def upload(self, key: str, payload: bytes, *, file_options: dict[str, str]) -> None:
        self.uploads.append((key, payload, file_options))

    def get_public_url(self, key: str) -> str:
        return f"https://cdn.example/{key}"


class _Storage:
    def __init__(self, bucket: _Bucket) -> None:
        self.bucket = bucket

    def from_(self, name: str) -> _Bucket:
        assert name == "videos"
        return self.bucket


class _Supabase:
    def __init__(self, bucket: _Bucket) -> None:
        self.storage = _Storage(bucket)


def test_thumbnail_upload_uses_webp_and_removes_only_derivative(
    tmp_path: Path,
    monkeypatch,
) -> None:
    source_path = tmp_path / "card.png"
    Image.new("RGB", (1280, 720), "navy").save(source_path)
    bucket = _Bucket()
    worker = CardWorker(_Supabase(bucket), card_queue=asyncio.Queue())
    monkeypatch.setattr(card_worker_module, "write_event_row", lambda **_kwargs: None)

    public_url = asyncio.run(
        worker._upload_card_thumbnail(
            image_path=source_path,
            word={"id": "word_1", "deck_id": "deck-1", "user_id": "user_1"},
            user_id="user_1",
            deck_id="deck-1",
            word_slug="hallo",
        )
    )

    assert public_url == "https://cdn.example/user_1/deck-1/cards/hallo_word_1.thumb.webp"
    assert source_path.exists()
    assert not (tmp_path / "card.thumb.webp").exists()
    assert len(bucket.uploads) == 1
    key, payload, options = bucket.uploads[0]
    assert key.endswith(".thumb.webp")
    assert payload[:4] == b"RIFF"
    assert options == {"content-type": "image/webp", "upsert": "true"}


def test_thumbnail_failure_is_nonfatal_and_leaves_full_image(
    tmp_path: Path,
    monkeypatch,
) -> None:
    source_path = tmp_path / "card.png"
    source_path.write_bytes(b"not an image")
    bucket = _Bucket()
    worker = CardWorker(_Supabase(bucket), card_queue=asyncio.Queue())
    monkeypatch.setattr(card_worker_module, "write_event_row", lambda **_kwargs: None)

    public_url = asyncio.run(
        worker._upload_card_thumbnail(
            image_path=source_path,
            word={"id": "word_1", "deck_id": "deck-1", "user_id": "user_1"},
            user_id="user_1",
            deck_id="deck-1",
            word_slug="hallo",
        )
    )

    assert public_url is None
    assert source_path.read_bytes() == b"not an image"
    assert bucket.uploads == []
