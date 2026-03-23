from collections import defaultdict, deque
from collections.abc import Callable
from time import time

from fastapi import Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.entities import User
from app.services.auth_service import AuthService

settings = get_settings()
REQUEST_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def rate_limit() -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        now = time()
        bucket = REQUEST_BUCKETS[ip]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= settings.max_requests_per_minute:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
        bucket.append(now)

    return dependency


def get_current_user(
    authorization: str | None = Header(default=None),
    access_token: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> User:
    token: str | None = access_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user = AuthService(db).get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user
