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

## Production Flow

The current codebase is wired for a production-style flow:

- authentication via NextAuth credentials on the frontend
- authenticated FastAPI routes backed by JWT access tokens
- per-user job ownership in PostgreSQL
- URL and upload ingestion validation
- `yt-dlp` + FFmpeg media preparation
- OpenAI transcription, embeddings, summarization, and grounded Q&A when `OPENAI_API_KEY` is configured
- Qdrant transcript indexing for semantic retrieval
- Redis/Celery worker support, with background-task fallback when a worker is unavailable

When `ENABLE_DEMO_DATA=true`, the backend seeds a real demo user for local testing:

- email: `demo@videonote.app`
- password: `demo-password`

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

## Required Environment Variables

Backend:

- `SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `QDRANT_URL`
- `OPENAI_API_KEY`
- `OPENAI_API_BASE`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_CHAT_MODEL`
- `OPENAI_TRANSCRIPTION_MODEL`
- `LOCAL_STORAGE_PATH`
- `CORS_ORIGINS`

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_TRUST_HOST=true`

## Deployment Notes

Vercel frontend:

1. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed FastAPI origin.
2. Set `NEXTAUTH_URL` to your Vercel frontend URL.
3. Set `NEXTAUTH_SECRET` to a strong random value.

Render backend:

1. Apply [render.yaml](./render.yaml).
2. Fill `SECRET_KEY` and `OPENAI_API_KEY`.
3. Ensure `CORS_ORIGINS` includes your Vercel URL.
4. Run both the API and worker services.

## Additional Documentation

- [API schema](./docs/api-schema.yaml)
- [DB schema overview](./docs/db-schema.md)
- [Prompt examples](./docs/prompts.md)
