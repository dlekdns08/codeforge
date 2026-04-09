"""CodeForge server configuration."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ServerConfig:
    """Web server configuration."""

    host: str = "0.0.0.0"
    port: int = 8731
    db_path: Path = Path("codeforge.db")
    static_dir: Path | None = None
    cors_origins: list[str] = field(default_factory=lambda: [
        "http://localhost:7291",
        "http://forge.koala.ai.kr",
    ])
    debug: bool = False
