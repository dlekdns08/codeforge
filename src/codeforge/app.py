"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .models.db import Database
from .services.run_manager import RunManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db = Database(Path("codeforge.db"))
    await db.connect()
    app.state.db = db
    app.state.run_manager = RunManager(db)
    yield
    # Shutdown
    await db.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="CodeForge",
        description="Developer Dashboard - PipeForge + CodeMind",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS for Vite dev server
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes
    app.include_router(api_router)

    # Serve frontend static files (production)
    frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

    return app
