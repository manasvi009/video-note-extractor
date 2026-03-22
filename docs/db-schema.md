# Database Schema Overview

## Core entities

- `users`: authenticated users of the application
- `projects`: logical workspaces grouping extraction jobs
- `video_jobs`: ingestion state, metadata, content hash, output mode, and processing status
- `transcript_chunks`: timestamped transcript segments used for transcript viewing and retrieval
- `summaries`: markdown sections plus structured JSON output from summarization
- `action_items`: extracted tasks from meetings and long-form content
- `timestamps`: labeled moments for quick navigation and citations
- `chat_history`: saved transcript-grounded Q&A sessions with citation payloads
- `embeddings_metadata`: vector store references, embedding model info, and search metadata

## Job lifecycle

1. A `video_job` is created from a URL, file upload, or recorded audio source.
2. The ingestion pipeline stores metadata, computes a content hash, and prevents duplicate processing.
3. Transcript segments are written to `transcript_chunks` with speaker and timestamp metadata.
4. Embedding/vector references are recorded in `embeddings_metadata` for RAG and semantic search.
5. Structured output artifacts are stored in `summaries`, `action_items`, and `timestamps`.
6. Follow-up transcript Q&A sessions are written to `chat_history`.

## Important fields

- `video_jobs.content_hash`: deduplication key for avoiding repeated work
- `video_jobs.metadata_json`: pipeline, source metadata, export capability, and summarization metadata
- `transcript_chunks.chunk_index`: preserves chunk ordering for timeline rendering and exports
- `summaries.structured_json`: machine-consumable output for notes, questions, decisions, and definitions
- `embeddings_metadata.vector_id`: linkage between Postgres entities and Qdrant payloads

## Production considerations

- Add Alembic migrations before production rollout
- Store media artifacts and export files outside the database, keeping only metadata and object keys in relational tables
- Add per-user authorization checks to all job and project queries
- Consider pgvector as a fallback or secondary search index if Qdrant is unavailable
