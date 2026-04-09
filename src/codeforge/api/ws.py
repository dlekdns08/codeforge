"""WebSocket endpoints for real-time streaming."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{run_id}")
async def ws_run_stream(websocket: WebSocket, run_id: str):
    """Stream real-time events for a pipeline or analysis run."""
    manager = websocket.app.state.run_manager
    await websocket.accept()

    queue = manager.subscribe(run_id)

    try:
        while True:
            try:
                data = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_json(data)
                if data.get("type") == "done":
                    break
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        manager.unsubscribe(run_id, queue)
