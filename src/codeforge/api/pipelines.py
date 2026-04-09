"""Pipeline execution API endpoints."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..bridge.pipeforge_bridge import PipeforgeSession
from ..models.schemas import PipelineRunRequest, PipelineResponse, RunInfo

router = APIRouter(prefix="/api/pipelines", tags=["pipelines"])


@router.get("/detect/{project_id}")
async def detect_pipelines(project_id: str, request: Request):
    """Detect available pipeline configs in a project."""
    db = request.app.state.db
    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    session = PipeforgeSession(
        Path(project["path"]),
        broadcast=lambda _: None,
    )
    return session.detect_pipelines()


@router.post("/run", response_model=RunInfo)
async def run_pipeline(body: PipelineRunRequest, request: Request):
    """Start a pipeline execution (async, returns run_id)."""
    db = request.app.state.db
    manager = request.app.state.run_manager

    project = await db.get_project(body.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    run_id = await db.create_run(body.project_id, "pipeline")

    await manager.start_pipeline(
        project_id=body.project_id,
        project_path=project["path"],
        run_id=run_id,
        pipeline_file=body.pipeline_file,
        dry_run=body.dry_run,
        selected_jobs=body.selected_jobs,
        parallel_jobs=body.parallel_jobs,
        fail_fast=body.fail_fast,
    )

    return RunInfo(
        run_id=run_id,
        project_id=body.project_id,
        run_type="pipeline",
        status="running",
    )


@router.get("/{run_id}")
async def get_pipeline_result(run_id: str, request: Request):
    """Get pipeline execution result."""
    db = request.app.state.db
    run = await db.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    result = run.get("result", {})
    return {
        "run_id": run_id,
        "status": run["status"],
        **result,
    }


@router.get("/history/{project_id}")
async def pipeline_history(project_id: str, request: Request, limit: int = 20):
    """Get pipeline run history for a project."""
    db = request.app.state.db
    runs = await db.get_runs(project_id, "pipeline", limit=limit)
    return runs
