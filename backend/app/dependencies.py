from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LoginSession, User
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    # A token carries the LoginSession id it was issued for (the `sid` claim).
    # If that session was revoked (e.g. "로그아웃" from the security settings page),
    # the token must stop working immediately instead of staying valid until it
    # naturally expires — otherwise revoking a session from another device does
    # nothing for up to ACCESS_TOKEN_EXPIRE_MINUTES.
    sid = payload.get("sid")
    if sid is not None:
        try:
            session_id = int(sid)
        except (TypeError, ValueError):
            session_id = None
        if session_id is not None and db.get(LoginSession, session_id) is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        return None
    sid = payload.get("sid")
    if sid is not None:
        try:
            session_id = int(sid)
        except (TypeError, ValueError):
            session_id = None
        if session_id is not None and db.get(LoginSession, session_id) is None:
            return None
    return user


def get_current_session_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> int | None:
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    sid = payload.get("sid")
    if not sid:
        return None
    try:
        return int(sid)
    except (TypeError, ValueError):
        return None


def get_admin_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
CurrentSessionId = Annotated[int | None, Depends(get_current_session_id)]
DbSession = Annotated[Session, Depends(get_db)]
