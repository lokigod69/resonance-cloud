from __future__ import annotations

from fastapi import APIRouter

from ..dispatcher import check_all_engines, check_engine_health

router = APIRouter()


@router.get("/api/engines/health")
async def engines_health():
    statuses = await check_all_engines()
    return [s.model_dump() for s in statuses]


@router.get("/api/engines/{engine}/health")
async def engine_health(engine: str):
    status = await check_engine_health(engine)
    return status.model_dump()
