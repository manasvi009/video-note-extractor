from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, rate_limit
from app.core.config import get_settings
from app.db.session import SessionLocal, get_db
from app.models.entities import User
from app.schemas.job import (
    AskRequest,
    AskResponse,
    ChatHistoryResponse,
    CreateJobRequest,
    ExportRequest,
    ExportResponse,
    JobDetailResponse,
    JobListItem,
)
from app.services.exporters import build_export
from app.services.job_service import JobService
from app.services.validation import validate_source_url, validate_upload
from app.workers.tasks import process_video_job

router = APIRouter(prefix="/jobs", tags=["jobs"])
settings = get_settings()


@router.get("", response_model=list[JobListItem], dependencies=[Depends(rate_limit())])
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[JobListItem]:
    jobs = JobService(db).list_jobs(current_user.id)
    return [
        JobListItem(
            id=job.id,
            title=job.title,
            source_type=job.source_type,
            mode=job.mode,
            status=job.status,
            progress=job.progress,
            created_at=job.created_at,
            duration_seconds=job.duration_seconds,
            author=job.author,
        )
        for job in jobs
    ]


@router.post("", response_model=JobDetailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit())])
def create_job(
    payload: CreateJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobDetailResponse:
    if payload.source_url:
        validate_source_url(str(payload.source_url))

    service = JobService(db)
    job = service.create_job(payload, current_user)

    try:
        process_video_job.delay(job.id)
    except Exception:
        background_tasks.add_task(_process_job_background, job.id)

    hydrated = service.get_job(job.id, current_user.id)
    if hydrated is None:
        raise HTTPException(status_code=404, detail="Job not found after creation")
    return _serialize_detail(hydrated)


@router.post("/upload", response_model=JobDetailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit())])
async def upload_job(
    background_tasks: BackgroundTasks,
    project_id: str = Form(...),
    title: str = Form(...),
    mode: str = Form(...),
    source_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobDetailResponse:
    validate_upload(file)
    upload_dir = settings.storage_path / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    destination = upload_dir / Path(file.filename or "upload.bin").name
    destination.write_bytes(await file.read())

    payload = CreateJobRequest(
        project_id=project_id,
        title=title,
        source_type=source_type,
        filename=destination.name,
        mode=mode,
    )
    service = JobService(db)
    job = service.create_job(payload, current_user)
    try:
        process_video_job.delay(job.id)
    except Exception:
        background_tasks.add_task(_process_job_background, job.id)
    hydrated = service.get_job(job.id, current_user.id)
    return _serialize_detail(hydrated)


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> JobDetailResponse:
    job = JobService(db).get_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_detail(job)


@router.post("/{job_id}/retry", response_model=JobDetailResponse)
def retry_job(job_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> JobDetailResponse:
    service = JobService(db)
    try:
        job = service.process_job(job_id, current_user.id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return _serialize_detail(job)


@router.post("/{job_id}/chat", response_model=AskResponse)
def ask_job(job_id: str, payload: AskRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> AskResponse:
    try:
        return JobService(db).ask(job_id, payload.question, current_user.id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/{job_id}/export", response_model=ExportResponse)
def export_job(job_id: str, payload: ExportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ExportResponse:
    service = JobService(db)
    job = service.get_job(job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ExportResponse(**build_export(job, payload.kind))


def _process_job_background(job_id: str) -> None:
    db = SessionLocal()
    try:
        JobService(db).process_job(job_id)
    finally:
        db.close()


def _serialize_detail(job) -> JobDetailResponse:
    return JobDetailResponse(
        id=job.id,
        project_id=job.project_id,
        title=job.title,
        author=job.author,
        source_type=job.source_type,
        source_url=job.source_url,
        filename=job.filename,
        mode=job.mode,
        status=job.status,
        progress=job.progress,
        duration_seconds=job.duration_seconds,
        language=job.language,
        metadata_json=job.metadata_json,
        created_at=job.created_at,
        transcript_chunks=[
            {
                "id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "speaker": chunk.speaker,
                "start_seconds": chunk.start_seconds,
                "end_seconds": chunk.end_seconds,
                "text": chunk.text,
            }
            for chunk in sorted(job.transcript_chunks, key=lambda item: item.chunk_index)
        ],
        summaries=[
            {
                "id": summary.id,
                "section": summary.section,
                "content_markdown": summary.content_markdown,
                "structured_json": summary.structured_json,
            }
            for summary in job.summaries
        ],
        action_items=[
            {
                "id": item.id,
                "description": item.description,
                "owner": item.owner,
                "due_hint": item.due_hint,
                "completed": item.completed,
            }
            for item in job.action_items
        ],
        timestamps=[
            {
                "id": stamp.id,
                "label": stamp.label,
                "description": stamp.description,
                "start_seconds": stamp.start_seconds,
                "end_seconds": stamp.end_seconds,
            }
            for stamp in job.timestamps
        ],
        chat_history=[
            ChatHistoryResponse(
                id=entry.id,
                question=entry.question,
                answer=entry.answer,
                citations_json=entry.citations_json,
                created_at=entry.created_at,
            )
            for entry in sorted(job.chat_history, key=lambda item: item.created_at, reverse=True)
        ],
    )
