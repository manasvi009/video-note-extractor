from collections import defaultdict, deque
from collections.abc import Callable
from time import time

from fastapi import HTTPException, Request, status

from app.core.config import get_settings

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
