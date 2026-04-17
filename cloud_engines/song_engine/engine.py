"""Song Engine — main entry point (Suno/cloud mode stub).

Historical note:
    This module previously drove the Ace-Step backend flow (HTTP + Gradio
    clients, batched audio takes, generation-meta.json writing). Cloud mode
    (MUSIC_MODE=suno, hardcoded in Dockerfile.cloud) short-circuits the song
    stage to a silent FLAC placeholder via
    src.cloud_dispatcher._create_song_placeholder(), so the Ace-Step backend
    files were removed. The `generate_song` signature below is preserved
    exclusively so that `src.cloud_dispatcher._engines["song"]` can still
    resolve a callable; in practice it is never reached because the
    MUSIC_MODE=="suno" short-circuit fires first.
"""

from __future__ import annotations

from .models import SongError, SongPayload, SongResult


def generate_song(payload: SongPayload) -> SongResult:
    """Deprecated engine contract entry point — returns a documented error.

    In cloud/Suno mode, src.cloud_dispatcher.call_engine_direct() short-circuits
    the song stage to _create_song_placeholder() before this function is ever
    called. If this function does get invoked, it means the short-circuit was
    bypassed (misconfiguration) — return a clear error rather than crashing.
    """
    return SongResult(
        status="failed",
        output_paths=[],
        error=SongError(
            message=(
                "ACE-Step backend removed; cloud uses Suno placeholder path via "
                "_create_song_placeholder(). If you see this error, MUSIC_MODE is "
                "not set to 'suno' and there is no real backend available."
            ),
            retryable=False,
            type="configuration_error",
        ),
    )
