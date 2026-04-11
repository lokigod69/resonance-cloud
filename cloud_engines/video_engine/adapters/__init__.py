"""Video provider adapters — Ken Burns, LTX, and Kling."""

from .base import VideoProviderAdapter
from .ken_burns import KenBurnsAdapter
from .kling import KlingAdapter
from .ltx import LTXAdapter

__all__ = [
    "VideoProviderAdapter",
    "KenBurnsAdapter",
    "LTXAdapter",
    "KlingAdapter",
]
