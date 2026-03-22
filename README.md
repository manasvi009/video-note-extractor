# Video Note Extractor

Video Note Extractor is a production-shaped full-stack application that turns long-form videos, meetings, lectures, webinars, podcasts, and recordings into searchable notes, structured summaries, action items, and transcript-grounded answers.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn-inspired UI primitives
- Backend: FastAPI, SQLAlchemy, Pydantic, Celery
- Realtime: Server-sent events for job progress
- Queue: Redis + Celery worker
- Database: PostgreSQL
- Vector store: Qdrant
- File storage: local storage in development, S3-compatible storage in production
- Media toolchain: FFmpeg, `yt-dlp`, Whisper or WhisperX adapter layer
- LLM/RAG: prompt templates and retrieval-ready service boundaries for OpenAI embeddings or compatible models

## Features

- Ingest by URL, direct upload, or recorded meeting audio
- Preserve source metadata such as title, author, duration, and source URL
- Transcript chunking with timestamps and speaker labels
- Structured outputs for notes, takeaways, questions, decisions, definitions, and action items
- Specialized modes for lectures, meetings, creator videos, and podcasts
- Transcript-grounded Q&A with citations and timestamps
- Search page for transcript snippets across jobs
- Export support for PDF, DOCX, Markdown, JSON, SRT, VTT, TXT, and CSV
- Deduplication by content hash, upload validation, and retry support
- Docker Compose stack with Postgres, Redis, Qdrant, and MinIO
- Seeded demo data so the app is usable locally without external AI credentials

## Repository Layout

- `frontend/`: Next.js application
- `backend/`: FastAPI API, workers, schemas, models, and services
- `docs/`: OpenAPI sketch, DB schema notes, and prompt examples
- `docker-compose.yml`: local full-stack development environment
- `.env.example`: sample environment configuration

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start the full stack:

```bash
docker compose up --build
```

3. Open the applications:

- Frontend: `http://localhost:3000`
- Backend docs: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001`
- Qdrant: `http://localhost:6333/dashboard`

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Worker

```bash
cd backend
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

## Demo Mode vs Production Integrations

The repository includes a seeded demo pipeline so the product works immediately in local development. The current demo path simulates media ingestion, transcript generation, chunking, and summarization.

To move to real production processing, replace the demo adapters in `backend/app/services` with:

- `yt-dlp` acquisition for URL-based jobs
- FFmpeg extraction for audio normalization
- Whisper or WhisperX transcription with timestamps and diarization
- embedding generation for transcript chunks
- LLM summarization and grounded answering over retrieved transcript evidence
- S3-compatible blob storage for uploaded media and exported artifacts

## Core API Endpoints

- `GET /api/v1/health`
- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `POST /api/v1/jobs/upload`
- `GET /api/v1/jobs/{job_id}`
- `POST /api/v1/jobs/{job_id}/retry`
- `POST /api/v1/jobs/{job_id}/chat`
- `POST /api/v1/jobs/{job_id}/export`
- `GET /api/v1/search?query=...`
- `GET /api/v1/stream/jobs/{job_id}`

## Deployment Targets

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or any Docker-capable host
- PostgreSQL: Neon or Supabase
- Vector database: Qdrant Cloud or self-hosted Docker
- Object storage: AWS S3, Cloudflare R2, MinIO, or another S3-compatible service

## Notes on Authentication

The frontend is scaffolded for NextAuth-based integration. Provider credentials and callbacks can be added through environment configuration without changing the workspace structure.

## Additional Documentation

- [API schema](./docs/api-schema.yaml)
- [DB schema overview](./docs/db-schema.md)
- [Prompt examples](./docs/prompts.md)
