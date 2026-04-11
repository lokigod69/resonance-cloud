"""Engine HTTP dispatch: calls engines, handles responses."""

from __future__ import annotations
import os
from typing import Any

import httpx

from .models import EngineHealthStatus
from .manifest import now_iso


class EngineConfig:
    ENGINES = {
        'concept': {'port': 8080, 'timeout': 30, 'name': 'Concept Engine'},
        'song':    {'port': 8000, 'timeout': 300, 'name': 'Song Engine'},
        'images':  {'port': 8082, 'timeout': 900, 'name': 'Image Engine'},
        'video':   {'port': 8086, 'timeout': 600, 'name': 'Video Engine'},
        'assembly':{'port': 8085, 'timeout': 120, 'name': 'Assembly Engine'},
        'bookend': {'port': 8087, 'timeout': 120, 'name': 'Bookend Engine'},
    }

    @classmethod
    def url(cls, engine: str) -> str:
        env_map = {
            'concept': 'CONCEPT_ENGINE_URL',
            'song':    'SONG_ENGINE_URL',
            'images':  'IMAGE_ENGINE_URL',
            'video':   'VIDEO_ENGINE_URL',
            'assembly':'ASSEMBLY_ENGINE_URL',
            'bookend': 'BOOKEND_ENGINE_URL',
        }
        env_key = env_map.get(engine)
        if env_key:
            url = os.getenv(env_key)
            if url:
                return url
        port = cls.ENGINES[engine]['port']
        return f"http://localhost:{port}"

    @classmethod
    def timeout(cls, engine: str) -> int:
        return cls.ENGINES[engine].get('timeout', 120)


class PayloadError(Exception):
    pass


class EngineUnreachableError(Exception):
    pass


async def call_engine(engine: str, payload: dict[str, Any], endpoint: str = "/run") -> dict[str, Any]:
    """
    POST payload to engine endpoint (default /run).
    All engines return HTTP 200 for both success and failure.
    422 = bad payload (orchestrator bug).
    Pre-flight check verifies engine reachability before sending payload.
    """
    base_url = EngineConfig.url(engine)
    url = f"{base_url}{endpoint}"
    timeout = EngineConfig.timeout(engine)
    name = EngineConfig.ENGINES[engine]['name']

    # Pre-flight reachability check (spec §8.4)
    async with httpx.AsyncClient(timeout=5) as client:
        try:
            await client.get(f"{base_url}/health")
        except (httpx.ConnectError, httpx.TimeoutException):
            raise EngineUnreachableError(
                f"{name} is not reachable at {base_url}. Is it running?"
            )

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.post(url, json=payload)
        except httpx.ConnectError:
            raise EngineUnreachableError(
                f"{name} is not reachable at {url}. Is it running?"
            )
        except httpx.TimeoutException:
            raise TimeoutError(
                f"{EngineConfig.ENGINES[engine]['name']} timed out after {timeout}s."
            )

        if response.status_code == 422:
            raise PayloadError(
                f"Invalid payload for {engine}: {response.text[:500]}"
            )

        return response.json()


async def check_engine_health(engine: str) -> EngineHealthStatus:
    """Check if an engine is reachable."""
    url = EngineConfig.url(engine)
    cfg = EngineConfig.ENGINES[engine]
    reachable = False

    try:
        async with httpx.AsyncClient(timeout=3) as client:
            # Try /health first, then root
            for path in ['/health', '/']:
                try:
                    r = await client.get(f"{url}{path}")
                    if r.status_code < 500:
                        reachable = True
                        break
                except Exception:
                    pass
    except Exception:
        pass

    return EngineHealthStatus(
        name=cfg['name'],
        port=cfg['port'],
        url=url,
        reachable=reachable,
        last_checked=now_iso(),
    )


async def check_all_engines() -> list[EngineHealthStatus]:
    """Check health of all engines concurrently."""
    import asyncio
    tasks = [check_engine_health(e) for e in EngineConfig.ENGINES]
    return await asyncio.gather(*tasks)
