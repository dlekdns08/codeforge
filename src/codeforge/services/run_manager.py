"""Central run manager - tracks active runs and WebSocket broadcasts."""

from __future__ import annotations

import asyncio
import time
from pathlib import Path
from typing import Any

from ..bridge.codemind_bridge import CodemindSession, analysis_report_to_dict
from ..bridge.pipeforge_bridge import PipeforgeSession, pipeline_result_to_dict
from ..models.db import Database


class RunManager:
    """Manages active pipeline/analysis runs and their WebSocket subscribers."""

    def __init__(self, db: Database) -> None:
        self.db = db
        self._subscribers: dict[str, list[asyncio.Queue]] = {}
        self._active_tasks: dict[str, asyncio.Task] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.setdefault(run_id, []).append(queue)
        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue) -> None:
        if run_id in self._subscribers:
            self._subscribers[run_id] = [
                q for q in self._subscribers[run_id] if q is not queue
            ]

    def _broadcast(self, run_id: str, data: dict) -> None:
        for queue in self._subscribers.get(run_id, []):
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                pass

    # ── Pipeline ──

    async def start_pipeline(
        self, project_id: str, project_path: str, run_id: str, **kwargs
    ) -> None:
        """Start a pipeline run in the background."""

        async def _run():
            await self.db.update_run(run_id, status="running", started_at=time.time())
            self._broadcast(run_id, {"type": "status", "status": "running"})

            try:
                session = PipeforgeSession(
                    Path(project_path),
                    broadcast=lambda data: self._broadcast(run_id, data),
                    **kwargs,
                )
                result = await session.run(pipeline_file=kwargs.get("pipeline_file"))
                result_dict = pipeline_result_to_dict(result)

                await self.db.update_run(
                    run_id,
                    status=result.status.value,
                    finished_at=time.time(),
                    summary={
                        "pipeline_name": result.pipeline_name,
                        "total_jobs": result.total_jobs,
                        "passed_jobs": result.passed_jobs,
                        "failed_jobs": result.failed_jobs,
                        "duration": result.duration,
                    },
                    result=result_dict,
                )
                self._broadcast(run_id, {
                    "type": "status",
                    "status": result.status.value,
                    "result": result_dict,
                })
            except Exception as e:
                await self.db.update_run(
                    run_id, status="failure", finished_at=time.time(),
                    summary={"error": str(e)},
                )
                self._broadcast(run_id, {
                    "type": "error",
                    "message": str(e),
                })
            finally:
                self._broadcast(run_id, {"type": "done"})
                self._active_tasks.pop(run_id, None)

        task = asyncio.create_task(_run())
        self._active_tasks[run_id] = task

    # ── Analysis ──

    async def start_analysis(
        self, project_id: str, project_path: str, run_id: str, **kwargs
    ) -> None:
        """Start an analysis run in the background."""

        async def _run():
            await self.db.update_run(run_id, status="running", started_at=time.time())
            self._broadcast(run_id, {"type": "status", "status": "running"})

            try:
                session = CodemindSession(
                    Path(project_path),
                    broadcast=lambda data: self._broadcast(run_id, data),
                    **kwargs,
                )
                report = await session.run()
                report_dict = analysis_report_to_dict(report)

                await self.db.update_run(
                    run_id,
                    status="success",
                    finished_at=time.time(),
                    summary={
                        "overall_score": report.overall_score,
                        "total_files": report.total_files,
                        "findings_count": len(report.findings),
                        "duration": report.analysis_duration_seconds,
                    },
                    result=report_dict,
                )
                self._broadcast(run_id, {
                    "type": "status",
                    "status": "success",
                    "result": report_dict,
                })
            except Exception as e:
                await self.db.update_run(
                    run_id, status="failure", finished_at=time.time(),
                    summary={"error": str(e)},
                )
                self._broadcast(run_id, {
                    "type": "error",
                    "message": str(e),
                })
            finally:
                self._broadcast(run_id, {"type": "done"})
                self._active_tasks.pop(run_id, None)

        task = asyncio.create_task(_run())
        self._active_tasks[run_id] = task
