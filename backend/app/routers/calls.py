import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.services.blocks import is_blocked
from app.services.call_signaling import call_manager
from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["calls"])

FORWARD_TYPES = frozenset(
    {"call-offer", "call-answer", "ice-candidate", "call-hangup", "call-reject"}
)


def _authenticate_ws(token: str) -> User | None:
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    db = SessionLocal()
    try:
        user = db.get(User, int(payload["sub"]))
        if not user or not user.is_active:
            return None
        return user
    finally:
        db.close()


async def _handle_signal(from_user: User, data: dict) -> None:
    msg_type = data.get("type")
    if not msg_type:
        return

    to_user_id = data.get("to_user_id")
    if to_user_id is not None:
        to_user_id = int(to_user_id)

    db = SessionLocal()
    try:
        if msg_type == "call-offer":
            if to_user_id is None:
                return
            if is_blocked(db, from_user.id, to_user_id):
                await call_manager.send_to(from_user.id, {"type": "call-failed", "reason": "blocked"})
                return
            if not call_manager.is_online(to_user_id):
                await call_manager.send_to(from_user.id, {"type": "call-failed", "reason": "offline"})
                return
            if call_manager.get_peer(to_user_id) is not None:
                await call_manager.send_to(from_user.id, {"type": "call-busy"})
                return
            call_manager.bind_call(from_user.id, to_user_id)
            await call_manager.send_to(
                to_user_id,
                {
                    "type": "call-incoming",
                    "from_user_id": from_user.id,
                    "from_username": from_user.username,
                    "from_avatar_url": from_user.avatar_url,
                    "from_full_name": from_user.full_name,
                    "call_type": data.get("call_type", "audio"),
                    "sdp": data.get("sdp"),
                },
            )
            return

        if msg_type == "call-answer":
            if to_user_id is None:
                return
            call_manager.bind_call(from_user.id, to_user_id)
            await call_manager.send_to(
                to_user_id,
                {
                    "type": "call-answer",
                    "from_user_id": from_user.id,
                    "sdp": data.get("sdp"),
                },
            )
            return

        if msg_type == "call-reject":
            peer = call_manager.clear_call(from_user.id)
            target = to_user_id or peer
            if target:
                await call_manager.send_to(
                    target,
                    {"type": "call-reject", "from_user_id": from_user.id},
                )
            return

        if msg_type == "call-hangup":
            peer = call_manager.clear_call(from_user.id)
            target = to_user_id or peer
            if target:
                await call_manager.send_to(
                    target,
                    {"type": "call-hangup", "from_user_id": from_user.id},
                )
            return

        if msg_type == "ice-candidate":
            if to_user_id is None:
                return
            await call_manager.send_to(
                to_user_id,
                {
                    "type": "ice-candidate",
                    "from_user_id": from_user.id,
                    "candidate": data.get("candidate"),
                },
            )
    finally:
        db.close()


@router.websocket("/ws/calls")
async def call_websocket(websocket: WebSocket, token: str = Query(...)):
    user = _authenticate_ws(token)
    if user is None:
        await websocket.close(code=4401)
        return

    await call_manager.connect(user.id, websocket)
    await call_manager.send_to(user.id, {"type": "connected", "user_id": user.id})

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") not in FORWARD_TYPES:
                continue
            await _handle_signal(user, data)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Call websocket error for user %s", user.id)
    finally:
        peer = call_manager.clear_call(user.id)
        if peer is not None:
            await call_manager.send_to(peer, {"type": "call-hangup", "from_user_id": user.id})
        call_manager.disconnect(user.id)
