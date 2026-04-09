"""Bridge: PipeForge engine -> WebSocket-friendly JSON events."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Callable

from pipeforge.config import PipeForgeConfig
from pipeforge.core.engine import PipelineEngine
from pipeforge.models.pipeline import Pipeline
from pipeforge.models.result import PipelineResult
from pipeforge.parsers.detector import detect_and_parse


BroadcastFn = Callable[[dict], None]


class PipeforgeSession:
    """Wraps PipelineEngine and translates events to JSON for WebSocket streaming."""

    def __init__(self, project_dir: Path, broadcast: BroadcastFn, **kwargs) -> None:
        self.project_dir = project_dir.resolve()
        self._broadcast = broadcast

        config = PipeForgeConfig(
            project_dir=self.project_dir,
            output_dir=self.project_dir / ".pipeforge",
            dry_run=kwargs.get("dry_run", False),
            fail_fast=kwargs.get("fail_fast", False),
            parallel_jobs=kwargs.get("parallel_jobs", 4),
            selected_jobs=kwargs.get("selected_jobs", []),
            html_report=False,
        )
        self.engine = PipelineEngine(config)
        self.engine.on_event(self._on_event)
        self.engine.on_log(self._on_log)

    def _on_event(self, event: str, target: str, data: dict) -> None:
        self._broadcast({
            "type": "pipeline_event",
            "event": event,
            "target": target,
            **data,
        })

    def _on_log(self, step_name: str, stream: str, text: str) -> None:
        self._broadcast({
            "type": "pipeline_log",
            "step": step_name,
            "stream": stream,
            "text": text,
        })

    def detect_pipelines(self) -> list[dict]:
        """Detect available pipeline configs in the project directory."""
        pipelines = detect_and_parse(self.project_dir)
        return [
            {
                "name": p.name,
                "source_type": p.source_type,
                "source_file": p.source_file,
                "stages": len(p.stages),
                "total_jobs": p.total_jobs,
                "total_steps": p.total_steps,
            }
            for p in pipelines
        ]

    async def run(self, pipeline_file: str | None = None) -> PipelineResult:
        """Run a pipeline and return the result."""
        pipelines = detect_and_parse(self.project_dir)
        if not pipelines:
            raise ValueError(f"No pipeline configs found in {self.project_dir}")

        # Select specific pipeline or first detected
        pipeline: Pipeline | None = None
        if pipeline_file:
            for p in pipelines:
                if p.source_file == pipeline_file:
                    pipeline = p
                    break
            if not pipeline:
                raise ValueError(f"Pipeline file not found: {pipeline_file}")
        else:
            pipeline = pipelines[0]

        return await self.engine.run(pipeline)


def pipeline_result_to_dict(result: PipelineResult) -> dict:
    """Convert a PipelineResult dataclass to a JSON-serializable dict."""
    return {
        "pipeline_name": result.pipeline_name,
        "source_type": result.source_type,
        "source_file": result.source_file,
        "status": result.status.value,
        "started_at": result.started_at,
        "finished_at": result.finished_at,
        "duration": result.duration,
        "total_jobs": result.total_jobs,
        "passed_jobs": result.passed_jobs,
        "failed_jobs": result.failed_jobs,
        "stages": [
            {
                "stage_name": sr.stage_name,
                "status": sr.status.value,
                "duration": sr.duration,
                "jobs": [
                    {
                        "job_name": jr.job_name,
                        "status": jr.status.value,
                        "duration": jr.duration,
                        "matrix_key": jr.matrix_key,
                        "retry_count": jr.retry_count,
                        "steps": [
                            {
                                "step_name": step.step_name,
                                "status": step.status.value,
                                "exit_code": step.exit_code,
                                "duration": step.duration,
                                "logs": [
                                    {
                                        "timestamp": log.timestamp,
                                        "stream": log.stream,
                                        "text": log.text,
                                    }
                                    for log in step.logs
                                ],
                            }
                            for step in jr.step_results
                        ],
                    }
                    for jr in sr.job_results
                ],
            }
            for sr in result.stage_results
        ],
    }
