"""Pydantic schemas for API request/response."""

from __future__ import annotations

from enum import Enum
from pydantic import BaseModel, Field


# ── Request schemas ──

class ProjectCreate(BaseModel):
    path: str
    name: str | None = None


class AnalysisRunRequest(BaseModel):
    project_id: str
    agents: list[str] = Field(default_factory=lambda: [
        "security", "complexity", "dependency", "pattern", "quality", "git",
    ])
    max_files: int = 5000


class PipelineRunRequest(BaseModel):
    project_id: str
    pipeline_file: str | None = None
    dry_run: bool = False
    selected_jobs: list[str] = Field(default_factory=list)
    parallel_jobs: int = 4
    fail_fast: bool = False


# ── Response schemas ──

class ProjectInfo(BaseModel):
    id: str
    name: str
    path: str
    pipeline_sources: list[str] = Field(default_factory=list)
    last_score: float | None = None
    created_at: str = ""


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"


class RunInfo(BaseModel):
    run_id: str
    project_id: str
    run_type: str  # "analysis" or "pipeline"
    status: str
    started_at: float = 0
    finished_at: float = 0
    summary: dict = Field(default_factory=dict)


# ── Analysis response ──

class FindingResponse(BaseModel):
    title: str
    description: str
    category: str
    severity: str
    file_path: str = ""
    line_start: int = 0
    line_end: int | None = None
    suggestion: str = ""
    code_snippet: str = ""
    rule_id: str = ""
    tags: list[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    run_id: str
    status: str
    overall_score: float = 0.0
    total_files: int = 0
    total_lines: int = 0
    language_breakdown: dict[str, int] = Field(default_factory=dict)
    findings: list[FindingResponse] = Field(default_factory=list)
    findings_count: int = 0
    duration_seconds: float = 0.0


# ── Pipeline response ──

class StepResultResponse(BaseModel):
    step_name: str
    status: str
    exit_code: int = 0
    duration: float = 0
    logs: list[dict] = Field(default_factory=list)


class JobResultResponse(BaseModel):
    job_name: str
    status: str
    duration: float = 0
    matrix_key: str = ""
    retry_count: int = 0
    steps: list[StepResultResponse] = Field(default_factory=list)


class StageResultResponse(BaseModel):
    stage_name: str
    status: str
    duration: float = 0
    jobs: list[JobResultResponse] = Field(default_factory=list)


class PipelineResponse(BaseModel):
    run_id: str
    pipeline_name: str
    source_type: str = ""
    status: str
    stages: list[StageResultResponse] = Field(default_factory=list)
    total_jobs: int = 0
    passed_jobs: int = 0
    failed_jobs: int = 0
    duration: float = 0


# ── Dashboard ──

class DashboardResponse(BaseModel):
    project: ProjectInfo
    latest_analysis: AnalysisResponse | None = None
    latest_pipeline: PipelineResponse | None = None
    score_history: list[dict] = Field(default_factory=list)
    pipeline_history: list[dict] = Field(default_factory=list)
