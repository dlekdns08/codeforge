"""SQLite database for persistence."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

import aiosqlite

DB_SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    run_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at REAL DEFAULT 0,
    finished_at REAL DEFAULT 0,
    summary_json TEXT DEFAULT '{}',
    result_json TEXT DEFAULT '{}',
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id, run_type);
"""


class Database:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row
        await self._db.executescript(DB_SCHEMA)
        await self._db.commit()

    async def close(self) -> None:
        if self._db:
            await self._db.close()

    @property
    def db(self) -> aiosqlite.Connection:
        assert self._db is not None, "Database not connected"
        return self._db

    # ── Projects ──

    async def create_project(self, name: str, path: str) -> dict:
        project_id = uuid.uuid4().hex[:12]
        await self.db.execute(
            "INSERT INTO projects (id, name, path) VALUES (?, ?, ?)",
            (project_id, name, path),
        )
        await self.db.commit()
        return {"id": project_id, "name": name, "path": path}

    async def get_projects(self) -> list[dict]:
        cursor = await self.db.execute(
            "SELECT id, name, path, created_at FROM projects ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_project(self, project_id: str) -> dict | None:
        cursor = await self.db.execute(
            "SELECT id, name, path, created_at FROM projects WHERE id = ?",
            (project_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    # ── Runs ──

    async def create_run(self, project_id: str, run_type: str) -> str:
        run_id = uuid.uuid4().hex[:12]
        await self.db.execute(
            "INSERT INTO runs (id, project_id, run_type, status) VALUES (?, ?, ?, 'pending')",
            (run_id, project_id, run_type),
        )
        await self.db.commit()
        return run_id

    async def update_run(
        self,
        run_id: str,
        status: str | None = None,
        started_at: float | None = None,
        finished_at: float | None = None,
        summary: dict | None = None,
        result: dict | None = None,
    ) -> None:
        updates = []
        params = []
        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if started_at is not None:
            updates.append("started_at = ?")
            params.append(started_at)
        if finished_at is not None:
            updates.append("finished_at = ?")
            params.append(finished_at)
        if summary is not None:
            updates.append("summary_json = ?")
            params.append(json.dumps(summary))
        if result is not None:
            updates.append("result_json = ?")
            params.append(json.dumps(result, default=str))

        if updates:
            params.append(run_id)
            await self.db.execute(
                f"UPDATE runs SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            await self.db.commit()

    async def get_run(self, run_id: str) -> dict | None:
        cursor = await self.db.execute(
            "SELECT * FROM runs WHERE id = ?", (run_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["summary"] = json.loads(d.pop("summary_json", "{}"))
        d["result"] = json.loads(d.pop("result_json", "{}"))
        return d

    async def get_runs(self, project_id: str, run_type: str | None = None, limit: int = 20) -> list[dict]:
        query = "SELECT id, project_id, run_type, status, started_at, finished_at, summary_json FROM runs WHERE project_id = ?"
        params: list = [project_id]
        if run_type:
            query += " AND run_type = ?"
            params.append(run_type)
        query += " ORDER BY started_at DESC LIMIT ?"
        params.append(limit)

        cursor = await self.db.execute(query, params)
        rows = await cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["summary"] = json.loads(d.pop("summary_json", "{}"))
            results.append(d)
        return results
