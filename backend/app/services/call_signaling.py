import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class CallSignalingManager:
    """In-memory WebSocket registry for 1:1 WebRTC call signaling."""

    def __init__(self) -> None:
        self.connections: dict[int, WebSocket] = {}
        # user_id -> peer user_id while a call is active or ringing
        self.active_calls: dict[int, int] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        existing = self.connections.get(user_id)
        if existing is not None and existing is not websocket:
            try:
                await existing.close(code=4000, reason="Replaced by new connection")
            except Exception:
                pass
        self.connections[user_id] = websocket

    def disconnect(self, user_id: int) -> None:
        self.connections.pop(user_id, None)
        peer = self.active_calls.pop(user_id, None)
        if peer is not None:
            self.active_calls.pop(peer, None)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.connections

    def get_peer(self, user_id: int) -> int | None:
        return self.active_calls.get(user_id)

    def bind_call(self, user_a: int, user_b: int) -> None:
        self.active_calls[user_a] = user_b
        self.active_calls[user_b] = user_a

    def clear_call(self, user_id: int) -> int | None:
        peer = self.active_calls.pop(user_id, None)
        if peer is not None:
            self.active_calls.pop(peer, None)
        return peer

    async def send_to(self, user_id: int, message: dict[str, Any]) -> bool:
        ws = self.connections.get(user_id)
        if ws is None:
            return False
        try:
            await ws.send_json(message)
            return True
        except Exception:
            logger.debug("Failed to send call signal to user %s", user_id)
            self.disconnect(user_id)
            return False


call_manager = CallSignalingManager()
