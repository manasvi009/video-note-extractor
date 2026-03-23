import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.services.job_service import JobService

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/jobs/{job_id}")
async def stream_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventSourceResponse:
    async def generator():
        while True:
            job = JobService(db).get_job(job_id, current_user.id)
            if not job:
                yield {"event": "error", "data": '{"message":"Job not found"}'}
                break
            yield {"event": "progress", "data": f'{{"status":"{job.status.value}","progress":{job.progress}}}'}
            if job.status.value in {"completed", "failed"}:
                break
            await asyncio.sleep(2)

    return EventSourceResponse(generator())
