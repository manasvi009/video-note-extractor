from app.db.session import SessionLocal
from app.services.job_service import JobService
from app.workers.celery_app import celery_app


@celery_app.task(name="process_video_job")
def process_video_job(job_id: str) -> dict:
    db = SessionLocal()
    try:
        job = JobService(db).process_demo_job(job_id)
        return {"job_id": job.id, "status": job.status.value}
    finally:
        db.close()

