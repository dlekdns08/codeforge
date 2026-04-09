"""Project management API endpoints."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..models.schemas import ProjectCreate, ProjectInfo
from pipeforge.parsers.detector import detect_source_type

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectInfo)
async def create_project(body: ProjectCreate, request: Request):
    db = request.app.state.db
    path = Path(body.path).resolve()

    if not path.exists() or not path.is_dir():
        raise HTTPException(400, f"Directory not found: {body.path}")

    name = body.name or path.name

    # Check for pipeline sources
    pipeline_sources = []
    source_type = detect_source_type(path)
    if source_type:
        pipeline_sources.append(source_type)

    try:
        project = await db.create_project(name, str(path))
    except Exception:
        raise HTTPException(409, "Project path already registered")

    return ProjectInfo(
        id=project["id"],
        name=name,
        path=str(path),
        pipeline_sources=pipeline_sources,
    )


@router.get("", response_model=list[ProjectInfo])
async def list_projects(request: Request):
    db = request.app.state.db
    projects = await db.get_projects()
    result = []
    for p in projects:
        # Get latest analysis score
        runs = await db.get_runs(p["id"], "analysis", limit=1)
        last_score = runs[0]["summary"].get("overall_score") if runs else None

        result.append(ProjectInfo(
            id=p["id"],
            name=p["name"],
            path=p["path"],
            last_score=last_score,
            created_at=str(p.get("created_at", "")),
        ))
    return result


@router.get("/{project_id}", response_model=ProjectInfo)
async def get_project(project_id: str, request: Request):
    db = request.app.state.db
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    runs = await db.get_runs(project_id, "analysis", limit=1)
    last_score = runs[0]["summary"].get("overall_score") if runs else None

    return ProjectInfo(
        id=project["id"],
        name=project["name"],
        path=project["path"],
        last_score=last_score,
        created_at=str(project.get("created_at", "")),
    )
