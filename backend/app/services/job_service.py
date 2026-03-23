from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.entities import (
    ActionItem,
    ChatHistory,
    EmbeddingMetadata,
    JobStatus,
    OutputMode,
    Project,
    Summary,
    TimestampMarker,
    TranscriptChunk,
    User,
    VideoJob,
)
from app.schemas.job import AskResponse, Citation, CreateJobRequest
from app.services.chunking import split_transcript
from app.services.demo_content import build_demo_summary, build_demo_transcript
from app.services.hashing import compute_content_hash
from app.services.media_pipeline import MediaPipelineService
from app.services.openai_service import OpenAIService
from app.services.vector_store import VectorStoreService


class JobService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.vector_store = VectorStoreService()
        self.media_pipeline = MediaPipelineService()
        self.openai = OpenAIService()

    def list_jobs(self, user_id: str) -> list[VideoJob]:
        result = self.db.execute(
            select(VideoJob)
            .where(VideoJob.user_id == user_id)
            .options(joinedload(VideoJob.transcript_chunks), joinedload(VideoJob.action_items))
            .order_by(VideoJob.created_at.desc())
        )
        return list(result.scalars().unique())

    def get_job(self, job_id: str, user_id: str) -> VideoJob | None:
        query = (
            select(VideoJob)
            .where(VideoJob.id == job_id, VideoJob.user_id == user_id)
            .options(
                joinedload(VideoJob.transcript_chunks),
                joinedload(VideoJob.summaries),
                joinedload(VideoJob.action_items),
                joinedload(VideoJob.timestamps),
                joinedload(VideoJob.chat_history),
            )
        )
        return self.db.execute(query).scalars().unique().first()

    def create_job(self, payload: CreateJobRequest, user: User) -> VideoJob:
        hash_source = f"{payload.title}:{payload.source_url or payload.filename or payload.project_id}:{payload.mode.value}"
        content_hash = compute_content_hash(hash_source)
        existing = self.db.execute(
            select(VideoJob).where(VideoJob.content_hash == content_hash, VideoJob.user_id == user.id)
        ).scalar_one_or_none()
        if existing:
            existing.metadata_json = existing.metadata_json | {"ingest": {"deduplicated": True}}
            self.db.commit()
            self.db.refresh(existing)
            return existing

        project = self._resolve_project(user.id, payload.project_id)
        source_label = str(payload.source_url) if payload.source_url else payload.filename or "uploaded media"
        job = VideoJob(
            project_id=project.id,
            user_id=user.id,
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
                "rag": {
                    "provider": "qdrant" if self.openai.is_configured() else "lexical-fallback",
                    "chunk_strategy": "timestamp-window",
                },
                "ai": {
                    "provider": "openai" if self.openai.is_configured() else "demo-fallback",
                },
            },
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def process_job(self, job_id: str, user_id: str | None = None) -> VideoJob:
        if self.openai.is_configured():
            try:
                return self._process_with_openai(job_id, user_id)
            except Exception as error:
                job = self.db.get(VideoJob, job_id)
                if job:
                    job.status = JobStatus.failed
                    job.error_message = str(error)
                    self.db.commit()
                raise
        return self._process_demo_job(job_id, user_id)

    def ask(self, job_id: str, question: str, user_id: str) -> AskResponse:
        job = self.get_job(job_id, user_id)
        if not job:
            raise ValueError("Job not found")

        ranked_chunks = self._retrieve_chunks(job, question)
        citations = [
            Citation(
                chunk_id=chunk.id,
                snippet=chunk.text[:220],
                start_seconds=chunk.start_seconds,
                end_seconds=chunk.end_seconds,
                label=chunk.speaker,
            )
            for chunk in ranked_chunks[:3]
        ]
        grounded = bool(citations)
        if grounded and self.openai.is_configured():
            answer = self.openai.answer_question(
                title=job.title,
                question=question,
                chunks=[
                    {
                        "speaker": citation.label,
                        "snippet": citation.snippet,
                        "start_seconds": citation.start_seconds,
                        "end_seconds": citation.end_seconds,
                    }
                    for citation in citations
                ],
            )
        elif grounded:
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

    def search(self, term: str, user_id: str) -> list[dict]:
        normalized = term.strip().lower()
        results: list[dict] = []
        for job in self.list_jobs(user_id):
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

    def _process_with_openai(self, job_id: str, user_id: str | None) -> VideoJob:
        job = self.db.get(VideoJob, job_id)
        if not job:
            raise ValueError("Job not found")
        if user_id and job.user_id != user_id:
            raise ValueError("Job not found")
        if job.status == JobStatus.completed:
            return self.get_job(job_id, job.user_id) or job

        self._clear_job_outputs(job_id)
        job.status = JobStatus.processing
        job.progress = 10
        self.db.flush()

        media = self.media_pipeline.prepare_media(job)
        job.title = media["title"]
        job.author = media["author"]
        if media.get("duration_seconds"):
            job.duration_seconds = int(media["duration_seconds"])
        job.metadata_json = job.metadata_json | {
            "source_metadata": {
                "title": job.title,
                "author": job.author,
                "duration_seconds": job.duration_seconds,
                "source_url": job.source_url,
                "filename": job.filename,
                "audio_path": str(media["audio_path"]),
            }
        }
        self.db.flush()

        job.status = JobStatus.transcribing
        job.progress = 35
        transcription = self.openai.transcribe(media["audio_path"])
        transcript_text = transcription.get("text", "")
        transcript_chunks = self._transcription_to_chunks(transcription, transcript_text)
        job.language = transcription.get("language") or "en"
        if transcript_chunks:
            job.duration_seconds = int(transcript_chunks[-1]["end_seconds"])
        self.db.flush()

        stored_chunks: list[TranscriptChunk] = []
        texts = [chunk["text"] for chunk in transcript_chunks]
        embedding_model = "not-configured"
        embeddings: list[list[float]] = []
        if texts:
            embedding_model, embeddings = self.openai.embed_texts(texts)

        for index, chunk in enumerate(transcript_chunks):
            record = TranscriptChunk(job_id=job.id, tokens_estimate=len(chunk["text"].split()), metadata_json={}, **chunk)
            self.db.add(record)
            self.db.flush()
            stored_chunks.append(record)
            vector_id = f"{job.id}-{record.chunk_index}"
            self.db.add(
                EmbeddingMetadata(
                    job_id=job.id,
                    chunk_id=record.id,
                    vector_id=vector_id,
                    collection_name=self.vector_store.collection_name,
                    embedding_model=embedding_model,
                    metadata_json={"speaker": record.speaker, "start_seconds": record.start_seconds},
                )
            )
            payload = {
                "job_id": job.id,
                "chunk_id": record.id,
                "text": record.text,
                "start_seconds": record.start_seconds,
                "end_seconds": record.end_seconds,
                "speaker": record.speaker,
            }
            if index < len(embeddings):
                payload["embedding"] = embeddings[index]
            self.vector_store.upsert_chunk(vector_id=vector_id, payload=payload)

        job.status = JobStatus.indexing
        job.progress = 64
        self.db.flush()

        structured = self.openai.summarize(
            title=job.title,
            mode=job.mode,
            transcript_chunks=[
                {
                    "speaker": chunk.speaker,
                    "start_seconds": chunk.start_seconds,
                    "end_seconds": chunk.end_seconds,
                    "text": chunk.text,
                }
                for chunk in stored_chunks
            ],
        )

        summary_sections = [
            Summary(job_id=job.id, section="Executive Summary", content_markdown=structured["overview"], structured_json=structured),
            Summary(
                job_id=job.id,
                section="Bullet Summary",
                content_markdown=structured.get("bullet_summary_markdown") or _format_bullets(structured.get("key_takeaways", [])),
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

        action_items = structured.get("action_items") or _action_items_for_mode(job.mode)
        for item in action_items:
            if isinstance(item, str):
                payload = {"description": item, "owner": None, "due_hint": None, "completed": False}
            else:
                payload = {
                    "description": item.get("description") or item.get("title") or "Follow up on transcript insights.",
                    "owner": item.get("owner"),
                    "due_hint": item.get("due_hint"),
                    "completed": bool(item.get("completed", False)),
                }
            self.db.add(ActionItem(job_id=job.id, **payload))

        timestamps = structured.get("important_timestamps") or _timestamps_for_job(job, stored_chunks)
        for stamp in timestamps:
            if isinstance(stamp, dict):
                payload = {
                    "label": stamp.get("label") or "Important moment",
                    "description": stamp.get("description") or "Transcript-backed highlight",
                    "start_seconds": float(stamp.get("start_seconds", 0.0)),
                    "end_seconds": float(stamp["end_seconds"]) if stamp.get("end_seconds") is not None else None,
                }
            else:
                continue
            self.db.add(TimestampMarker(job_id=job.id, **payload))

        job.status = JobStatus.summarizing
        job.progress = 88
        job.metadata_json = job.metadata_json | {
            "summary_overview": structured["overview"],
            "prompt_template": job.mode.value,
            "processing": {
                "transcript_chunks": len(stored_chunks),
                "action_items": len(action_items),
                "timestamps": len(timestamps),
                "speaker_aware": False,
                "vector_indexed": True,
                "ai_provider": "openai",
            },
        }
        self.db.flush()

        job.status = JobStatus.completed
        job.progress = 100
        job.error_message = None
        self.db.commit()
        self.db.refresh(job)
        return self.get_job(job.id, job.user_id) or job

    def _process_demo_job(self, job_id: str, user_id: str | None) -> VideoJob:
        job = self.db.get(VideoJob, job_id)
        if not job:
            raise ValueError("Job not found")
        if user_id and job.user_id != user_id:
            raise ValueError("Job not found")

        if job.status == JobStatus.completed:
            existing = self.get_job(job_id, job.user_id)
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
            Summary(job_id=job.id, section="Executive Summary", content_markdown=structured["overview"], structured_json=structured),
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
                "ai_provider": "demo-fallback",
            },
        }
        self.db.flush()

        job.status = JobStatus.completed
        job.progress = 100
        job.error_message = None
        self.db.commit()
        self.db.refresh(job)
        return self.get_job(job.id, job.user_id) or job

    def _resolve_project(self, user_id: str, project_id: str | None) -> Project:
        if project_id:
            project = self.db.execute(
                select(Project).where(Project.id == project_id, Project.user_id == user_id)
            ).scalar_one_or_none()
            if project:
                return project

        project = self.db.execute(select(Project).where(Project.user_id == user_id).order_by(Project.created_at.asc())).scalar_one_or_none()
        if project:
            return project

        project = Project(user_id=user_id, name="Default Workspace", description="Primary extraction workspace")
        self.db.add(project)
        self.db.flush()
        return project

    def _retrieve_chunks(self, job: VideoJob, question: str) -> list[TranscriptChunk]:
        if self.openai.is_configured() and job.transcript_chunks:
            try:
                _model, vectors = self.openai.embed_texts([question])
                if vectors:
                    payloads = self.vector_store.search(job_id=job.id, query_vector=vectors[0])
                    chunk_lookup = {chunk.id: chunk for chunk in job.transcript_chunks}
                    resolved = [chunk_lookup[item["chunk_id"]] for item in payloads if item.get("chunk_id") in chunk_lookup]
                    if resolved:
                        return resolved
            except Exception:
                pass
        return [chunk for chunk, _score in self._rank_chunks(job.transcript_chunks, question)]

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

    def _transcription_to_chunks(self, transcription: dict, transcript_text: str) -> list[dict]:
        segments = transcription.get("segments") or []
        if segments:
            return [
                {
                    "chunk_index": index,
                    "speaker": segment.get("speaker"),
                    "start_seconds": float(segment.get("start", 0.0)),
                    "end_seconds": float(segment.get("end", 0.0)),
                    "text": segment.get("text", "").strip(),
                }
                for index, segment in enumerate(segments)
                if segment.get("text")
            ]

        fallback_chunks = split_transcript(transcript_text)
        return [
            {
                "chunk_index": chunk["chunk_index"],
                "speaker": chunk.get("speaker"),
                "start_seconds": chunk["start_seconds"],
                "end_seconds": chunk["end_seconds"],
                "text": chunk["text"],
            }
            for chunk in fallback_chunks
        ]

    def _clear_job_outputs(self, job_id: str) -> None:
        for model in (EmbeddingMetadata, ChatHistory, TimestampMarker, ActionItem, Summary, TranscriptChunk):
            self.db.execute(delete(model).where(model.job_id == job_id))
        self.db.flush()


def _render_structured_markdown(structured: dict, mode: OutputMode) -> str:
    lines = ["### Key Takeaways", *[f"- {item}" for item in structured.get("key_takeaways", [])], "", "### Questions Discussed"]
    lines.extend(f"- {item}" for item in structured.get("questions_discussed", []))
    lines.extend(["", "### Key Decisions"])
    lines.extend(f"- {item}" for item in structured.get("key_decisions", []))
    lines.extend(["", "### Definitions"])
    lines.extend(f"- {item['term']}: {item['definition']}" for item in structured.get("definitions", []))
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


def _format_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)
