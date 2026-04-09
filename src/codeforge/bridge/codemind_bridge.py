"""Bridge: CodeMind coordinator -> WebSocket-friendly JSON events."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

from codemind.agents import (
    ComplexityAgent,
    DependencyAgent,
    GitHistoryAgent,
    PatternAgent,
    QualityAgent,
    SecurityAgent,
)
from codemind.config import AnalysisConfig
from codemind.core.coordinator import Coordinator
from codemind.core.message_bus import Message
from codemind.models.findings import AnalysisReport


BroadcastFn = Callable[[dict], None]

AGENT_MAP = {
    "security": SecurityAgent,
    "complexity": ComplexityAgent,
    "dependency": DependencyAgent,
    "pattern": PatternAgent,
    "quality": QualityAgent,
    "git": GitHistoryAgent,
}


class CodemindSession:
    """Wraps CodeMind Coordinator and translates events to JSON for WebSocket streaming."""

    def __init__(self, target_path: Path, broadcast: BroadcastFn, **kwargs) -> None:
        self.target_path = target_path.resolve()
        self._broadcast = broadcast

        self.config = AnalysisConfig(
            target_path=self.target_path,
            output_dir=self.target_path / "codemind_reports",
            max_files=kwargs.get("max_files", 5000),
            enable_git_analysis="git" in kwargs.get("agents", AGENT_MAP.keys()),
            enable_security_scan="security" in kwargs.get("agents", AGENT_MAP.keys()),
            enable_complexity_analysis="complexity" in kwargs.get("agents", AGENT_MAP.keys()),
            enable_dependency_analysis="dependency" in kwargs.get("agents", AGENT_MAP.keys()),
            enable_pattern_detection="pattern" in kwargs.get("agents", AGENT_MAP.keys()),
            enable_quality_scoring="quality" in kwargs.get("agents", AGENT_MAP.keys()),
        )

        self.coordinator = Coordinator(self.config)

        # Register enabled agents
        agents = kwargs.get("agents", list(AGENT_MAP.keys()))
        for agent_key in agents:
            if agent_key in AGENT_MAP:
                agent_cls = AGENT_MAP[agent_key]
                self.coordinator.register_agent(
                    agent_cls(self.config, self.coordinator.bus)
                )

        # Subscribe to message bus for granular events
        self.coordinator.bus.subscribe_all("web_bridge", self._on_bus_message)

    async def _on_bus_message(self, message: Message) -> None:
        self._broadcast({
            "type": "analysis_event",
            "msg_type": message.msg_type.value,
            "sender": message.sender,
            "payload": _safe_payload(message.payload),
        })

    def _progress_callback(self, phase: str, message: str, pct: float) -> None:
        self._broadcast({
            "type": "analysis_progress",
            "phase": phase,
            "message": message,
            "percent": pct,
        })

    async def run(self) -> AnalysisReport:
        """Run the analysis and return the report."""
        return await self.coordinator.run(progress_callback=self._progress_callback)


def _safe_payload(payload: dict) -> dict:
    """Make payload JSON-serializable."""
    result = {}
    for k, v in payload.items():
        if isinstance(v, Path):
            result[k] = str(v)
        elif isinstance(v, (str, int, float, bool, type(None))):
            result[k] = v
        elif isinstance(v, (list, tuple)):
            result[k] = [str(i) if isinstance(i, Path) else i for i in v]
        else:
            result[k] = str(v)
    return result


def analysis_report_to_dict(report: AnalysisReport) -> dict:
    """Convert an AnalysisReport dataclass to a JSON-serializable dict."""
    return {
        "overall_score": report.overall_score,
        "total_files": report.total_files,
        "total_lines": report.total_lines,
        "language_breakdown": report.language_breakdown,
        "analysis_duration_seconds": report.analysis_duration_seconds,
        "findings_count": len(report.findings),
        "findings": [
            {
                "title": f.title,
                "description": f.description,
                "category": f.category.value,
                "severity": f.severity.value,
                "file_path": str(f.location.file_path) if f.location else "",
                "line_start": f.location.line_start if f.location else 0,
                "line_end": f.location.line_end if f.location else None,
                "suggestion": f.suggestion,
                "code_snippet": f.code_snippet,
                "rule_id": f.rule_id,
                "tags": f.tags,
            }
            for f in report.findings
        ],
        "dependencies": [
            {
                "name": d.name,
                "file_path": str(d.file_path),
                "language": d.language,
                "imports": d.imports,
                "imported_by": d.imported_by,
            }
            for d in report.dependencies
        ],
        "patterns": [
            {
                "pattern_name": p.pattern_name,
                "description": p.description,
                "files": [str(f) for f in p.files],
                "confidence": p.confidence,
            }
            for p in report.patterns
        ],
        "git_stats": [
            {
                "file_path": str(g.file_path),
                "total_commits": g.total_commits,
                "unique_authors": g.unique_authors,
                "last_modified": g.last_modified,
                "churn_score": g.churn_score,
            }
            for g in report.git_stats
        ],
    }
