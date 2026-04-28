"""Video provider adapters — Ken Burns, LTX, Kling, and self-hosted LTX."""

from .base import VideoProviderAdapter
from .ken_burns import KenBurnsAdapter
from .kling import KlingAdapter
from .ltx_runpod import LTXRunPodAdapter
from .ltx_selfhosted import LTXSelfHostedAdapter

__all__ = [
    "VideoProviderAdapter",
    "KenBurnsAdapter",
    "LTXRunPodAdapter",
    "LTXSelfHostedAdapter",
    "KlingAdapter",
]
