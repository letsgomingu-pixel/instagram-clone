from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))


def to_iso(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def format_pickup_clock(ready_at: datetime) -> str:
    if ready_at.tzinfo is None:
        ready_at = ready_at.replace(tzinfo=timezone.utc)
    local = ready_at.astimezone(KST)
    period = "오전" if local.hour < 12 else "오후"
    hour12 = local.hour % 12 or 12
    return f"{period} {hour12}:{local.minute:02d}"
