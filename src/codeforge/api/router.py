"""Main API router - mounts all sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from . import analysis, dashboard, pipelines, projects, ws

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(analysis.router)
api_router.include_router(pipelines.router)
api_router.include_router(dashboard.router)
api_router.include_router(ws.router)
