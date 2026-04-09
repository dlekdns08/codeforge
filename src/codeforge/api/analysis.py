"""Code analysis API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from ..models.schemas import AnalysisRunRequest, AnalysisResponse, RunInfo

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/run", response_model=RunInfo)
async def run_analysis(body: AnalysisRunRequest, request: Request):
    """Start a code analysis (async, returns run_id)."""
    db = request.app.state.db
    manager = request.app.state.run_manager

    project = await db.get_project(body.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    run_id = await db.create_run(body.project_id, "analysis")

    await manager.start_analysis(
        project_id=body.project_id,
        project_path=project["path"],
        run_id=run_id,
        agents=body.agents,
        max_files=body.max_files,
    )

    return RunInfo(
        run_id=run_id,
        project_id=body.project_id,
        run_type="analysis",
        status="running",
    )


@router.get("/{run_id}", response_model=AnalysisResponse)
async def get_analysis_result(run_id: str, request: Request):
    """Get analysis result."""
    db = request.app.state.db
    run = await db.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    result = run.get("result", {})
    return AnalysisResponse(
        run_id=run_id,
        status=run["status"],
        overall_score=result.get("overall_score", 0),
        total_files=result.get("total_files", 0),
        total_lines=result.get("total_lines", 0),
        language_breakdown=result.get("language_breakdown", {}),
        findings=result.get("findings", []),
        findings_count=result.get("findings_count", 0),
        duration_seconds=result.get("analysis_duration_seconds", 0),
    )


@router.get("/{run_id}/findings")
async def get_findings(
    run_id: str,
    request: Request,
    severity: str | None = None,
    category: str | None = None,
    offset: int = 0,
    limit: int = 50,
):
    """Get paginated findings with optional filters."""
    db = request.app.state.db
    run = await db.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")

    result = run.get("result", {})
    findings = result.get("findings", [])

    if severity:
        findings = [f for f in findings if f.get("severity") == severity]
    if category:
        findings = [f for f in findings if f.get("category") == category]

    total = len(findings)
    findings = findings[offset:offset + limit]

    return {"total": total, "offset": offset, "limit": limit, "findings": findings}


@router.get("/history/{project_id}")
async def analysis_history(project_id: str, request: Request, limit: int = 20):
    """Get analysis run history for a project."""
    db = request.app.state.db
    runs = await db.get_runs(project_id, "analysis", limit=limit)
    return runs
