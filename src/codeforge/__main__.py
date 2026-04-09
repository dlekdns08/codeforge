"""CodeForge CLI entry point."""

from __future__ import annotations

import click
import uvicorn

from .config import ServerConfig


@click.group()
def cli() -> None:
    """CodeForge - Developer Dashboard for CI/CD + Code Intelligence."""


@cli.command()
@click.option("--host", default="0.0.0.0", help="Server host")
@click.option("--port", "-p", default=8430, type=int, help="Server port")
@click.option("--debug", is_flag=True, help="Enable debug mode")
def serve(host: str, port: int, debug: bool) -> None:
    """Start the CodeForge web server."""
    click.echo(f"  CodeForge v0.1.0")
    click.echo(f"  Starting server at http://{host}:{port}")
    click.echo()

    uvicorn.run(
        "codeforge.app:create_app",
        factory=True,
        host=host,
        port=port,
        reload=debug,
        log_level="info" if not debug else "debug",
    )


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
