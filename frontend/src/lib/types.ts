export type JobStatus =
  | "queued"
  | "processing"
  | "transcribing"
  | "indexing"
  | "summarizing"
  | "completed"
  | "failed";

export type OutputMode = "lecture" | "meeting" | "creator" | "podcast";
export type SourceType = "url" | "file" | "recording";

export interface JobListItem {
  id: string;
  title: string;
  source_type: SourceType;
  mode: OutputMode;
  status: JobStatus;
  progress: number;
  created_at: string;
  duration_seconds?: number | null;
  author?: string | null;
}

export interface TranscriptChunk {
  id: string;
  chunk_index: number;
  speaker: string | null;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface SummaryStructure {
  overview?: string;
  section_summary?: Array<{ title: string; summary: string }>;
  key_takeaways?: string[];
  questions_discussed?: string[];
  key_decisions?: string[];
  definitions?: Array<{ term: string; definition: string }>;
  exam_notes?: string[];
  meeting_minutes?: string[];
  bullet_summary_markdown?: string;
  mode?: OutputMode;
  qa_guidance?: string;
  [key: string]: unknown;
}

export interface SummarySection {
  id: string;
  section: string;
  content_markdown: string;
  structured_json: SummaryStructure;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  due_hint: string | null;
  completed: boolean;
}

export interface TimestampItem {
  id: string;
  label: string;
  description: string;
  start_seconds: number;
  end_seconds: number | null;
}

export interface Citation {
  chunk_id: string;
  snippet: string;
  start_seconds: number;
  end_seconds: number;
  label?: string | null;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  citations_json: Citation[];
  created_at: string;
}

export interface JobDetail {
  id: string;
  project_id: string;
  title: string;
  author: string | null;
  source_type: SourceType;
  source_url: string | null;
  filename: string | null;
  mode: OutputMode;
  status: JobStatus;
  progress: number;
  duration_seconds: number | null;
  language: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  transcript_chunks: TranscriptChunk[];
  summaries: SummarySection[];
  action_items: ActionItem[];
  timestamps: TimestampItem[];
  chat_history: ChatHistoryItem[];
}

export interface SearchResult {
  job_id: string;
  title: string;
  snippet: string;
  score: number;
  timestamp_seconds: number;
  speaker?: string | null;
  mode: OutputMode;
  source_type: SourceType;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  grounded: boolean;
}

export interface ExportResponse {
  file_name: string;
  media_type: string;
  content_base64: string;
  text_preview: string;
}
