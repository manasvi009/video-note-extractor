import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.db.session import get_db
from app.services.job_service import JobService

router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/jobs/{job_id}")
async def stream_job(job_id: str, db: Session = Depends(get_db)) -> EventSourceResponse:
    async def generator():
        while True:
            job = JobService(db).get_job(job_id)
            if not job:
                yield {"event": "error", "data": '{"message":"Job not found"}'}
                break
            yield {"event": "progress", "data": f'{{"status":"{job.status.value}","progress":{job.progress}}}'}
            if job.status.value in {"completed", "failed"}:
                break
            await asyncio.sleep(2)

    return EventSourceResponse(generator())

