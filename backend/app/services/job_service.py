from __future__ import annotations



from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import (
    ActionItem,
    ChatHistory,
    EmbeddingMetadata,
    JobStatus,
    OutputMode,
    Summary,
    TimestampMarker,
    TranscriptChunk,
    VideoJob,
)
from app.schemas.job import AskResponse, Citation, CreateJobRequest
from app.services.chunking import split_transcript
from app.services.demo_content import build_demo_summary, build_demo_transcript
from app.services.hashing import compute_content_hash
from app.services.vector_store import VectorStoreService


class JobService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.vector_store = VectorStoreService()

    def list_jobs(self) -> list[VideoJob]:
        result = self.db.execute(
            select(VideoJob)
            .options(joinedload(VideoJob.transcript_chunks), joinedload(VideoJob.action_items))
            .order_by(VideoJob.created_at.desc())
        )
        return list(result.scalars().unique())

    def get_job(self, job_id: str) -> VideoJob | None:
        query = (
            select(VideoJob)
            .where(VideoJob.id == job_id)
            .options(
                joinedload(VideoJob.transcript_chunks),
                joinedload(VideoJob.summaries),
                joinedload(VideoJob.action_items),
                joinedload(VideoJob.timestamps),
                joinedload(VideoJob.chat_history),
            )
        )
        return self.db.execute(query).scalars().unique().first()

    def create_job(self, payload: CreateJobRequest) -> VideoJob:
        hash_source = f"{payload.title}:{payload.source_url or payload.filename or payload.project_id}:{payload.mode.value}"
        content_hash = compute_content_hash(hash_source)
        existing = self.db.execute(select(VideoJob).where(VideoJob.content_hash == content_hash)).scalar_one_or_none()
        if existing:
            existing.metadata_json = existing.metadata_json | {"ingest": {"deduplicated": True}}
            self.db.commit()
            self.db.refresh(existing)
            return existing

        source_label = str(payload.source_url) if payload.source_url else payload.filename or "uploaded media"
        job = VideoJob(
            project_id=payload.project_id,
            user_id="demo-user",
            title=payload.title,
            source_type=payload.source_type,
            source_url=str(payload.source_url) if payload.source_url else None,
            filename=payload.filename,
            mode=payload.mode,
            content_hash=content_hash,
            metadata_json={
                "ingest": {
                    "deduplicated": False,
                    "source_label": source_label,
                    "pipeline": ["queued", "processing", "transcribing", "indexing", "summarizing", "completed"],
                },
                "exports": ["pdf", "docx", "markdown", "json", "srt", "vtt", "txt", "csv"],
                "rag": {"provider": "qdrant", "chunk_strategy": "timestamp-window"},
            },
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def process_demo_job(self, job_id: str) -> VideoJob:
        job = self.db.get(VideoJob, job_id)
        if not job:
            raise ValueError("Job not found")

        if job.status == JobStatus.completed:
            existing = self.get_job(job_id)
            return existing or job

        self._clear_job_outputs(job_id)
        job.status = JobStatus.processing
        job.progress = 10
        self.db.flush()

        transcript = build_demo_transcript(job.title, job.mode)
        chunks = split_transcript(transcript)

        job.status = JobStatus.transcribing
        job.progress = 35
        job.duration_seconds = int(chunks[-1]["end_seconds"]) if chunks else 0
        job.language = "en"
        job.author = _author_for_mode(job.mode)
        job.metadata_json = job.metadata_json | {
            "source_metadata": {
                "title": job.title,
                "author": job.author,
                "duration_seconds": job.duration_seconds,
                "source_url": job.source_url,
                "filename": job.filename,
            }
        }
        self.db.flush()

        stored_chunks: list[TranscriptChunk] = []
        for chunk in chunks:
            record = TranscriptChunk(job_id=job.id, tokens_estimate=len(chunk["text"].split()), metadata_json={}, **chunk)
            self.db.add(record)
            self.db.flush()
            stored_chunks.append(record)
            self.db.add(
                EmbeddingMetadata(
                    job_id=job.id,
                    chunk_id=record.id,
                    vector_id=f"{job.id}-{record.chunk_index}",
                    collection_name=self.vector_store.collection_name,
                    embedding_model="demo-zero-vector",
                    metadata_json={"speaker": record.speaker, "start_seconds": record.start_seconds},
                )
            )
            self.vector_store.upsert_chunk(
                vector_id=f"{job.id}-{record.chunk_index}",
                payload={
                    "job_id": job.id,
                    "chunk_id": record.id,
                    "text": record.text,
                    "start_seconds": record.start_seconds,
                    "end_seconds": record.end_seconds,
                    "speaker": record.speaker,
                },
            )

        job.status = JobStatus.indexing
        job.progress = 62
        self.db.flush()

        structured = build_demo_summary(job.title, job.mode)
        summary_sections = [
            Summary(
                job_id=job.id,
                section="Executive Summary",
                content_markdown=structured["overview"],
                structured_json=structured,
            ),
            Summary(
                job_id=job.id,
                section="Bullet Summary",
                content_markdown=structured["bullet_summary_markdown"],
                structured_json=structured,
            ),
            Summary(
                job_id=job.id,
                section="Questions, Decisions, and Definitions",
                content_markdown=_render_structured_markdown(structured, job.mode),
                structured_json=structured,
            ),
        ]
        for summary in summary_sections:
            self.db.add(summary)

        for item in _action_items_for_mode(job.mode):
            self.db.add(ActionItem(job_id=job.id, **item))

        for stamp in _timestamps_for_job(job, stored_chunks):
            self.db.add(TimestampMarker(job_id=job.id, **stamp))

        job.status = JobStatus.summarizing
        job.progress = 86
        job.metadata_json = job.metadata_json | {
            "summary_overview": structured["overview"],
            "prompt_template": job.mode.value,
            "processing": {
                "transcript_chunks": len(stored_chunks),
                "action_items": len(_action_items_for_mode(job.mode)),
                "timestamps": 4,
                "speaker_aware": True,
                "vector_indexed": True,
            },
        }
        self.db.flush()

        job.status = JobStatus.completed
        job.progress = 100
        job.error_message = None
        self.db.commit()
        self.db.refresh(job)
        return self.get_job(job.id) or job

    def ask(self, job_id: str, question: str) -> AskResponse:
        job = self.get_job(job_id)
        if not job:
            raise ValueError("Job not found")

        ranked = self._rank_chunks(job.transcript_chunks, question)
        citations = [
            Citation(
                chunk_id=chunk.id,
                snippet=chunk.text[:220],
                start_seconds=chunk.start_seconds,
                end_seconds=chunk.end_seconds,
                label=chunk.speaker,
            )
            for chunk, _score in ranked[:3]
        ]
        grounded = bool(citations)
        if grounded:
            time_range = ", ".join(f"{citation.start_seconds:.0f}s-{citation.end_seconds:.0f}s" for citation in citations)
            answer = (
                f"The transcript suggests that '{question}' is addressed through the recording's main explanations, examples, and follow-up steps. "
                f"The strongest supporting evidence appears around {time_range}."
            )
        else:
            answer = "I could not find strong transcript evidence for that question. Try a more specific query using a topic, speaker, or timestamp."

        self.db.add(
            ChatHistory(
                job_id=job_id,
                question=question,
                answer=answer,
                citations_json=[item.model_dump() for item in citations],
            )
        )
        self.db.commit()
        return AskResponse(answer=answer, citations=citations, grounded=grounded)

    def search(self, term: str) -> list[dict]:
        normalized = term.strip().lower()
        results: list[dict] = []
        for job in self.list_jobs():
            for chunk, score in self._rank_chunks(job.transcript_chunks, normalized)[:6]:
                if score <= 0:
                    continue
                results.append(
                    {
                        "job_id": job.id,
                        "title": job.title,
                        "snippet": chunk.text[:220],
                        "score": round(min(score / 4, 0.99), 2),
                        "timestamp_seconds": chunk.start_seconds,
                        "speaker": chunk.speaker,
                        "mode": job.mode,
                        "source_type": job.source_type,
                    }
                )
        results.sort(key=lambda item: item["score"], reverse=True)
        return results[:10]

    def _rank_chunks(self, chunks: list[TranscriptChunk], query: str) -> list[tuple[TranscriptChunk, int]]:
        keywords = [word for word in _normalize_words(query) if len(word) > 2]
        if not keywords:
            return [(chunk, 1) for chunk in chunks[:3]]

        ranked: list[tuple[TranscriptChunk, int]] = []
        for chunk in chunks:
            haystack = f"{chunk.speaker or ''} {chunk.text}".lower()
            score = sum(haystack.count(keyword) for keyword in keywords)
            if score:
                ranked.append((chunk, score))
        ranked.sort(key=lambda item: (item[1], -item[0].chunk_index), reverse=True)
        return ranked

    def _clear_job_outputs(self, job_id: str) -> None:
        for model in (EmbeddingMetadata, ChatHistory, TimestampMarker, ActionItem, Summary, TranscriptChunk):
            self.db.execute(delete(model).where(model.job_id == job_id))
        self.db.flush()


def _render_structured_markdown(structured: dict, mode: OutputMode) -> str:
    lines = ["### Key Takeaways", *[f"- {item}" for item in structured["key_takeaways"]], "", "### Questions Discussed"]
    lines.extend(f"- {item}" for item in structured["questions_discussed"])
    lines.extend(["", "### Key Decisions"])
    lines.extend(f"- {item}" for item in structured["key_decisions"])
    lines.extend(["", "### Definitions"])
    lines.extend(f"- {item['term']}: {item['definition']}" for item in structured["definitions"])
    if mode == OutputMode.lecture and structured.get("exam_notes"):
        lines.extend(["", "### Revision Notes"])
        lines.extend(f"- {item}" for item in structured["exam_notes"])
    if mode == OutputMode.meeting and structured.get("meeting_minutes"):
        lines.extend(["", "### Meeting Minutes"])
        lines.extend(f"- {item}" for item in structured["meeting_minutes"])
    return "\n".join(lines)


def _action_items_for_mode(mode: OutputMode) -> list[dict[str, str | bool | None]]:
    base = [
        {"description": "Review the generated notes and confirm the summary matches the source.", "owner": "You", "due_hint": "Today", "completed": False},
        {"description": "Export the transcript and share it with collaborators or learners.", "owner": "Operations", "due_hint": "This week", "completed": False},
    ]
    mode_specific = {
        OutputMode.lecture: [
            {"description": "Turn the revision notes into flashcards or a study guide.", "owner": "Student", "due_hint": "Before exam", "completed": False},
        ],
        OutputMode.meeting: [
            {"description": "Send meeting minutes and action items to stakeholders.", "owner": "Project lead", "due_hint": "End of day", "completed": False},
            {"description": "Track blockers and confirm owners in the next sync.", "owner": "Program manager", "due_hint": "Next meeting", "completed": False},
        ],
        OutputMode.creator: [
            {"description": "Repurpose the key takeaways into a short post or highlight clip.", "owner": "Content team", "due_hint": "This week", "completed": False},
        ],
        OutputMode.podcast: [
            {"description": "Capture the best story beats for newsletter or show notes reuse.", "owner": "Editorial", "due_hint": "This week", "completed": False},
        ],
    }
    return base + mode_specific[mode]


def _timestamps_for_job(job: VideoJob, chunks: list[TranscriptChunk]) -> list[dict[str, str | float | None]]:
    if not chunks:
        return []
    quarter = max(len(chunks) // 4, 1)
    labels = [
        ("Opening context", "The session introduces the topic, framing, and expected outcome."),
        ("Core explanation", "The speaker expands on the main concepts and examples."),
        ("Practical applications", "Implementation details, tradeoffs, or examples are emphasized here."),
        ("Closing recap", "The source closes with next steps, recap material, and open questions."),
    ]
    stamps: list[dict[str, str | float | None]] = []
    for index, (label, description) in enumerate(labels):
        chunk = chunks[min(index * quarter, len(chunks) - 1)]
        end = chunks[min(((index + 1) * quarter), len(chunks) - 1)].end_seconds if index < len(labels) - 1 else job.duration_seconds
        stamps.append(
            {
                "label": label,
                "description": description,
                "start_seconds": chunk.start_seconds,
                "end_seconds": float(end) if end is not None else None,
            }
        )
    return stamps


def _author_for_mode(mode: OutputMode) -> str:
    return {
        OutputMode.lecture: "Lecture Channel",
        OutputMode.meeting: "Meeting Recorder",
        OutputMode.creator: "YouTube Creator",
        OutputMode.podcast: "Podcast Studio",
    }[mode]


def _normalize_words(value: str) -> list[str]:
    return [token.strip(".,!?()[]{}:;\"'") for token in value.lower().split() if token.strip()]
