from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl

from app.models.entities import JobStatus, OutputMode, SourceType


class CreateJobRequest(BaseModel):
    project_id: str | None = None
    title: str = Field(min_length=3, max_length=300)
    source_type: SourceType
    source_url: HttpUrl | None = None
    mode: OutputMode = OutputMode.lecture
    filename: str | None = None


class Citation(BaseModel):
    chunk_id: str
    snippet: str
    start_seconds: float
    end_seconds: float
    label: str | None = None


class TranscriptChunkResponse(BaseModel):
    id: str
    chunk_index: int
    speaker: str | None
    start_seconds: float
    end_seconds: float
    text: str


class ActionItemResponse(BaseModel):
    id: str
    description: str
    owner: str | None
    due_hint: str | None
    completed: bool


class TimestampResponse(BaseModel):
    id: str
    label: str
    description: str
    start_seconds: float
    end_seconds: float | None


class SummaryResponse(BaseModel):
    id: str
    section: str
    content_markdown: str
    structured_json: dict[str, Any]


class ChatHistoryResponse(BaseModel):
    id: str
    question: str
    answer: str
    citations_json: list[dict[str, Any]]
    created_at: datetime


class JobListItem(BaseModel):
    id: str
    title: str
    source_type: SourceType
    mode: OutputMode
    status: JobStatus
    progress: int
    created_at: datetime
    duration_seconds: int | None = None
    author: str | None = None


class JobDetailResponse(BaseModel):
    id: str
    project_id: str
    title: str
    author: str | None
    source_type: SourceType
    source_url: str | None
    filename: str | None
    mode: OutputMode
    status: JobStatus
    progress: int
    duration_seconds: int | None
    language: str | None
    metadata_json: dict[str, Any]
    created_at: datetime
    transcript_chunks: list[TranscriptChunkResponse]
    summaries: list[SummaryResponse]
    action_items: list[ActionItemResponse]
    timestamps: list[TimestampResponse]
    chat_history: list[ChatHistoryResponse] = []


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    grounded: bool = True


class ExportRequest(BaseModel):
    kind: str = Field(pattern="^(pdf|docx|markdown|json|srt|vtt|txt|csv)$")


class ExportResponse(BaseModel):
    file_name: str
    media_type: str
    content_base64: str
    text_preview: str


class SearchResponse(BaseModel):
    job_id: str
    title: str
    snippet: str
    score: float
    timestamp_seconds: float
    speaker: str | None = None
    mode: OutputMode
    source_type: SourceType
