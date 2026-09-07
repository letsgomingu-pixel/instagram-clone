"""Cursor-based pagination helpers for stable feed ordering."""
import base64
import json
from datetime import datetime
from typing import Any


def encode_cursor(data: dict[str, Any]) -> str:
    payload = json.dumps(data, separators=(",", ":"), default=str)
    return base64.urlsafe_b64encode(payload.encode()).decode()


def decode_cursor(cursor: str) -> dict[str, Any]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode())
        return json.loads(raw)
    except (ValueError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid cursor") from exc


def cursor_from_post(*, priority: int, created_at: datetime, post_id: int) -> str:
    return encode_cursor({"p": priority, "t": created_at.isoformat(), "id": post_id})
