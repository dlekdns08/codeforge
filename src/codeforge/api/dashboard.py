"""Dashboard API endpoint - unified project health view."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{project_id}")
async def get_dashboard(project_id: str, request: Request):
    """Get unified dashboard data for a project."""
    db = request.app.state.db

    project = await db.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Latest analysis
    analysis_runs = await db.get_runs(project_id, "analysis", limit=10)
    latest_analysis = None
    if analysis_runs:
        latest = analysis_runs[0]
        latest_analysis = {
            "run_id": latest["id"],
            "status": latest["status"],
            **latest.get("summary", {}),
        }

    # Latest pipeline
    pipeline_runs = await db.get_runs(project_id, "pipeline", limit=10)
    latest_pipeline = None
    if pipeline_runs:
        latest = pipeline_runs[0]
        latest_pipeline = {
            "run_id": latest["id"],
            "status": latest["status"],
            **latest.get("summary", {}),
        }

    # Score history (from analysis runs)
    score_history = []
    for run in reversed(analysis_runs):
        summary = run.get("summary", {})
        if "overall_score" in summary:
            score_history.append({
                "run_id": run["id"],
                "score": summary["overall_score"],
                "timestamp": run["started_at"],
                "findings_count": summary.get("findings_count", 0),
            })

    # Pipeline history
    pipeline_history = []
    for run in pipeline_runs:
        summary = run.get("summary", {})
        pipeline_history.append({
            "run_id": run["id"],
            "status": run["status"],
            "timestamp": run["started_at"],
            **summary,
        })

    return {
        "project": {
            "id": project["id"],
            "name": project["name"],
            "path": project["path"],
        },
        "latest_analysis": latest_analysis,
        "latest_pipeline": latest_pipeline,
        "score_history": score_history,
        "pipeline_history": pipeline_history,
    }
