import type {
  AskResponse,
  ChatHistoryItem,
  Citation,
  ExportResponse,
  JobDetail,
  JobListItem,
  OutputMode,
  SearchResult,
  SourceType,
} from "@/lib/types";

const STORAGE_KEY = "vne-jobs";
const SESSION_KEY = "vne-session";
const JOBS_EVENT = "vne-jobs-updated";
const SESSION_EVENT = "vne-session-updated";

const modeLabels: Record<OutputMode, string> = {
  lecture: "lecture",
  meeting: "meeting",
  creator: "creator",
  podcast: "podcast",
};

const sourceAuthors: Record<SourceType, string> = {
  url: "Web Source",
  file: "Uploaded File",
  recording: "Meeting Recorder",
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function formatBullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function emitJobsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(JOBS_EVENT));
  }
}

function emitSessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

function generateTranscript(title: string, mode: OutputMode, sourceType: SourceType) {
  const sourceContext = {
    url: "an online long-form video",
    file: "an uploaded media file",
    recording: "a recorded meeting or lecture audio track",
  }[sourceType];

  const modeSegments: Record<OutputMode, string[]> = {
    lecture: [
      `This ${sourceContext} introduces ${title} with a clear teaching objective and structured explanation flow.`,
      "The speaker breaks the topic into concepts, definitions, examples, and revision-friendly summaries.",
      "Important contrasts are made between foundational ideas, tradeoffs, and practical applications.",
      "The closing portion highlights exam-style questions, review cues, and a compact recap.",
    ],
    meeting: [
      `This ${sourceContext} captures ${title} with agenda review, status updates, decisions, and ownership notes.`,
      "Participants discuss blockers, timing, dependencies, and the follow-up work required after the meeting.",
      "Action items are identified with owners, due hints, and decision rationale where possible.",
      "The conversation ends with a recap of commitments, unresolved questions, and next steps.",
    ],
    creator: [
      `This ${sourceContext} presents ${title} with a strong hook, narrative progression, and practical takeaways.`,
      "Examples and stories are used to keep the audience engaged while reinforcing core ideas.",
      "Key moments focus on audience value, content positioning, and memorable insights.",
      "The ending summarizes the strongest lessons and what viewers should do next.",
    ],
    podcast: [
      `This ${sourceContext} explores ${title} through a conversational format with stories, opinions, and big ideas.`,
      "Recurring themes include lessons learned, frameworks, anecdotes, and practical reflections.",
      "The middle sections surface the most interesting arguments, examples, and nuanced viewpoints.",
      "The wrap-up turns broad discussion points into concise takeaways and questions worth revisiting.",
    ],
  };

  const paragraphs = Array.from({ length: 12 }, (_, index) => modeSegments[mode][index % modeSegments[mode].length]);
  let cursor = 0;
  return paragraphs.map((text, chunkIndex) => {
    const duration = 70 + (chunkIndex % 3) * 18;
    const start = cursor;
    const end = cursor + duration;
    cursor = end;
    return {
      id: makeId("chunk"),
      chunk_index: chunkIndex,
      speaker: mode === "meeting" ? (chunkIndex % 2 === 0 ? "Speaker A" : "Speaker B") : "Speaker 1",
      start_seconds: start,
      end_seconds: end,
      text,
    };
  });
}

function createSummary(title: string, mode: OutputMode, transcriptChunks: JobDetail["transcript_chunks"]) {
  const overview = `${title} was processed in ${modeLabels[mode]} mode with structured notes, timeline markers, action items, and transcript-backed navigation.`;
  const keyTakeaways = [
    "The source has been converted into a readable note workspace rather than a raw transcript dump.",
    "Important moments are anchored to timestamps for quick review and navigation.",
    "Key questions, decisions, and next steps are separated into structured sections.",
  ];
  const questions = {
    lecture: ["Which concepts matter most for revision?", "What examples best explain the core ideas?"],
    meeting: ["What was decided, and who owns the follow-up work?", "Which blockers still need attention?"],
    creator: ["What are the clearest audience takeaways?", "Which examples best support the message?"],
    podcast: ["What themes repeated across the discussion?", "Which stories were most useful?"],
  }[mode];
  const decisions = {
    lecture: ["Focus on definitions, examples, and revision-ready notes.", "Group related explanations into short review sections."],
    meeting: ["Track action items separately from meeting context.", "Surface blockers and due hints clearly for follow-up."],
    creator: ["Highlight the strongest lessons and audience-facing hooks.", "Keep the note structure easy to reuse for content repurposing."],
    podcast: ["Separate broad themes from memorable anecdotes.", "Turn conversational detail into practical summaries."],
  }[mode];
  const definitions = [
    { term: "Transcript chunk", definition: "A timestamped section used for navigation, search, and grounded answers." },
    { term: "Grounded answer", definition: "A response that cites transcript evidence instead of making unsupported claims." },
  ];
  const sectionSummary = [
    { title: "Opening context", summary: transcriptChunks[0]?.text ?? overview },
    { title: "Core discussion", summary: transcriptChunks[4]?.text ?? overview },
    { title: "Closing recap", summary: transcriptChunks.at(-1)?.text ?? overview },
  ];

  const structured = {
    overview,
    section_summary: sectionSummary,
    key_takeaways: keyTakeaways,
    questions_discussed: questions,
    key_decisions: decisions,
    definitions,
    exam_notes: mode === "lecture" ? ["Review the definitions and examples first.", "Use timestamps to jump directly to the hardest sections."] : [],
    meeting_minutes: mode === "meeting" ? ["Agenda covered and decisions captured.", "Owners and due hints extracted from follow-up items."] : [],
    bullet_summary_markdown: formatBullets(keyTakeaways),
    qa_guidance: "Answer using the cited transcript spans and stay explicit about uncertainty.",
    mode,
  };

  return [
    {
      id: makeId("summary"),
      section: "Executive Summary",
      content_markdown: overview,
      structured_json: structured,
    },
    {
      id: makeId("summary"),
      section: "Bullet Summary",
      content_markdown: formatBullets(keyTakeaways),
      structured_json: structured,
    },
    {
      id: makeId("summary"),
      section: "Questions, Decisions, and Definitions",
      content_markdown: [
        "### Questions Discussed",
        ...questions.map((item) => `- ${item}`),
        "",
        "### Key Decisions",
        ...decisions.map((item) => `- ${item}`),
        "",
        "### Definitions",
        ...definitions.map((item) => `- ${item.term}: ${item.definition}`),
      ].join("\n"),
      structured_json: structured,
    },
  ];
}

function createActionItems(mode: OutputMode) {
  const base = [
    { id: makeId("action"), description: "Review the generated notes and confirm they match the source content.", owner: "You", due_hint: "Today", completed: false },
    { id: makeId("action"), description: "Export the transcript and share it with collaborators or learners.", owner: "Operations", due_hint: "This week", completed: false },
  ];
  const extra = {
    lecture: [{ id: makeId("action"), description: "Turn the strongest sections into revision flashcards.", owner: "Student", due_hint: "Before exam", completed: false }],
    meeting: [{ id: makeId("action"), description: "Send the meeting summary and owners to stakeholders.", owner: "Project lead", due_hint: "End of day", completed: false }],
    creator: [{ id: makeId("action"), description: "Repurpose the top takeaways into a short follow-up post.", owner: "Content team", due_hint: "This week", completed: false }],
    podcast: [{ id: makeId("action"), description: "Capture the strongest story beats for show notes or newsletter reuse.", owner: "Editorial", due_hint: "This week", completed: false }],
  }[mode];
  return [...base, ...extra];
}

function createTimestamps(transcriptChunks: JobDetail["transcript_chunks"]) {
  const positions = [0, 3, 7, transcriptChunks.length - 1].filter((value, index, array) => array.indexOf(value) === index);
  const labels = ["Opening context", "Core explanation", "Important examples", "Closing recap"];
  return positions.map((position, index) => ({
    id: makeId("timestamp"),
    label: labels[index] ?? `Moment ${index + 1}`,
    description: transcriptChunks[position]?.text ?? "Transcript highlight",
    start_seconds: transcriptChunks[position]?.start_seconds ?? 0,
    end_seconds: transcriptChunks[position]?.end_seconds ?? null,
  }));
}

function buildCompletedJob(base: JobDetail): JobDetail {
  const transcript_chunks = generateTranscript(base.title, base.mode, base.source_type);
  const summaries = createSummary(base.title, base.mode, transcript_chunks);
  const action_items = createActionItems(base.mode);
  const timestamps = createTimestamps(transcript_chunks);

  return {
    ...base,
    author:
      base.source_type === "url" && base.source_url
        ? new URL(base.source_url).hostname.replace("www.", "")
        : sourceAuthors[base.source_type],
    status: "completed",
    progress: 100,
    duration_seconds: transcript_chunks.at(-1)?.end_seconds ?? null,
    language: "en",
    metadata_json: {
      ingest: {
        deduplicated: false,
        source_label: base.source_url ?? base.filename ?? base.title,
        pipeline: ["queued", "processing", "transcribing", "indexing", "summarizing", "completed"],
      },
      summary_overview: summaries[0]?.content_markdown,
      ai: {
        provider: "browser-simulated",
        note: "This deployment runs a realistic client-side extraction workflow until a live backend API is configured.",
      },
    },
    transcript_chunks,
    summaries,
    action_items,
    timestamps,
  };
}

function createQueuedJob(input: {
  title: string;
  source_type: SourceType;
  mode: OutputMode;
  source_url?: string;
  filename?: string;
}): JobDetail {
  return {
    id: makeId("job"),
    project_id: "demo-project",
    title: input.title,
    author: input.source_type === "url" ? "Pending source analysis" : sourceAuthors[input.source_type],
    source_type: input.source_type,
    source_url: input.source_url ?? null,
    filename: input.filename ?? null,
    mode: input.mode,
    status: "queued",
    progress: 5,
    duration_seconds: null,
    language: null,
    metadata_json: {
      ingest: {
        deduplicated: false,
        source_label: input.source_url ?? input.filename ?? input.title,
        pipeline: ["queued", "processing", "transcribing", "indexing", "summarizing", "completed"],
      },
      runtime: {
        engine: input.source_type === "url" ? "URL acquisition" : "uploaded media ingestion",
        created_locally: true,
      },
    },
    created_at: nowIso(),
    transcript_chunks: [],
    summaries: [],
    action_items: [],
    timestamps: [],
    chat_history: [],
  };
}

const seedJobs: JobDetail[] = [
  buildCompletedJob(createQueuedJob({ title: "System Design Lecture", source_type: "url", source_url: "https://youtube.com/watch?v=system-design", mode: "lecture" })),
  buildCompletedJob(createQueuedJob({ title: "Weekly Product Sync", source_type: "recording", filename: "weekly-sync.mp3", mode: "meeting" })),
  buildCompletedJob(createQueuedJob({ title: "Founder Podcast Episode", source_type: "file", filename: "founder-podcast.mp4", mode: "podcast" })),
];

function readJobs(): JobDetail[] {
  if (typeof window === "undefined") {
    return seedJobs;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedJobs));
    return seedJobs;
  }
  try {
    return JSON.parse(raw) as JobDetail[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedJobs));
    return seedJobs;
  }
}

function writeJobs(jobs: JobDetail[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    emitJobsUpdated();
  }
}

function updateStoredJob(jobId: string, updater: (job: JobDetail) => JobDetail) {
  const jobs = readJobs();
  const updated = jobs.map((job) => (job.id === jobId ? updater(job) : job));
  writeJobs(updated);
}

function queueLocalProcessing(jobId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const stages = [
    { delay: 700, status: "processing", progress: 18 },
    { delay: 1500, status: "transcribing", progress: 42 },
    { delay: 2300, status: "indexing", progress: 68 },
    { delay: 3200, status: "summarizing", progress: 88 },
  ] as const;

  for (const stage of stages) {
    window.setTimeout(() => {
      updateStoredJob(jobId, (job) =>
        job.status === "completed"
          ? job
          : {
              ...job,
              status: stage.status,
              progress: stage.progress,
            },
      );
    }, stage.delay);
  }

  window.setTimeout(() => {
    updateStoredJob(jobId, (job) => buildCompletedJob(job));
  }, 4100);
}

export function subscribeToStoredJobs(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => listener();
  window.addEventListener(JOBS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(JOBS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function subscribeToStoredSession(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => listener();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function validateSourceInput(input: { source_type: SourceType; source_url?: string; filename?: string }) {
  if (input.source_type === "url") {
    if (!input.source_url?.trim()) {
      throw new Error("Enter a valid YouTube or video URL.");
    }
    let parsed: URL;
    try {
      parsed = new URL(input.source_url);
    } catch {
      throw new Error("The video URL is not valid.");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }
    return;
  }

  if (!input.filename?.trim()) {
    throw new Error("Choose a supported media file.");
  }

  const extension = input.filename.split(".").pop()?.toLowerCase() ?? "";
  if (!["mp4", "mp3", "wav", "mov", "mkv"].includes(extension)) {
    throw new Error("Unsupported file type. Use mp4, mp3, wav, mov, or mkv.");
  }
}

export function getStoredJobs(): JobDetail[] {
  return readJobs().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export function listStoredJobs(): JobListItem[] {
  return getStoredJobs().map((job) => ({
    id: job.id,
    title: job.title,
    source_type: job.source_type,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    created_at: job.created_at,
    duration_seconds: job.duration_seconds,
    author: job.author,
  }));
}

export function getStoredJob(jobId: string): JobDetail | null {
  return getStoredJobs().find((job) => job.id === jobId) ?? null;
}

export function createStoredJob(input: {
  title: string;
  source_type: SourceType;
  mode: OutputMode;
  source_url?: string;
  filename?: string;
}): JobDetail {
  validateSourceInput(input);
  const jobs = getStoredJobs();
  const created = createQueuedJob(input);
  writeJobs([created, ...jobs]);
  queueLocalProcessing(created.id);
  return created;
}

export function searchStoredJobs(query: string): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const results: SearchResult[] = [];
  for (const job of getStoredJobs()) {
    for (const chunk of job.transcript_chunks) {
      const haystack = `${chunk.speaker ?? ""} ${chunk.text}`.toLowerCase();
      const score = haystack.includes(needle) ? Math.min(0.99, 0.65 + needle.length / 100) : 0;
      if (score > 0) {
        results.push({
          job_id: job.id,
          title: job.title,
          snippet: chunk.text,
          score,
          timestamp_seconds: chunk.start_seconds,
          speaker: chunk.speaker,
          mode: job.mode,
          source_type: job.source_type,
        });
      }
    }
  }
  return results.sort((left, right) => right.score - left.score).slice(0, 12);
}

export function askStoredJob(jobId: string, question: string): AskResponse {
  const jobs = getStoredJobs();
  const job = jobs.find((item) => item.id === jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  if (job.status !== "completed") {
    throw new Error("Wait for processing to finish before asking AI questions.");
  }

  const terms = question.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = job.transcript_chunks
    .filter((chunk) => terms.some((term) => chunk.text.toLowerCase().includes(term)))
    .slice(0, 3);
  const citations: Citation[] = (matches.length ? matches : job.transcript_chunks.slice(0, 3)).map((chunk) => ({
    chunk_id: chunk.id,
    snippet: chunk.text,
    start_seconds: chunk.start_seconds,
    end_seconds: chunk.end_seconds,
    label: chunk.speaker,
  }));
  const answer = `Based on ${job.title}, the transcript supports this answer: ${question}. Review the cited moments for the clearest explanation, examples, and follow-up context.`;
  const chatItem: ChatHistoryItem = {
    id: makeId("chat"),
    question,
    answer,
    citations_json: citations,
    created_at: nowIso(),
  };
  const updated = jobs.map((item) => (item.id === jobId ? { ...item, chat_history: [chatItem, ...item.chat_history] } : item));
  writeJobs(updated);
  return { answer, citations, grounded: true };
}

export function exportStoredJob(jobId: string, kind: string): ExportResponse {
  const job = getStoredJob(jobId);
  if (!job) {
    throw new Error("Job not found.");
  }
  if (job.status !== "completed") {
    throw new Error("Exports are available after processing completes.");
  }

  const transcript = job.transcript_chunks
    .map((chunk) => `[${chunk.start_seconds}s - ${chunk.end_seconds}s] ${chunk.speaker ?? "Speaker"}: ${chunk.text}`)
    .join("\n");
  const notes = [job.title, "", ...job.summaries.map((section) => `${section.section}\n${section.content_markdown}`)].join("\n\n");
  const actionCsv = ["description,owner,due_hint,completed", ...job.action_items.map((item) => `${safeCsv(item.description)},${safeCsv(item.owner)},${safeCsv(item.due_hint)},${item.completed}`)].join("\n");
  const json = JSON.stringify(job, null, 2);
  const payloads: Record<string, { name: string; type: string; content: string }> = {
    markdown: { name: "notes.md", type: "text/markdown", content: notes },
    pdf: { name: "notes.pdf", type: "application/pdf", content: notes },
    docx: { name: "notes.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", content: notes },
    json: { name: "notes.json", type: "application/json", content: json },
    txt: { name: "transcript.txt", type: "text/plain", content: transcript },
    srt: { name: "transcript.srt", type: "application/x-subrip", content: transcript },
    vtt: { name: "transcript.vtt", type: "text/vtt", content: transcript },
    csv: { name: "action-items.csv", type: "text/csv", content: actionCsv },
  };
  const target = payloads[kind] ?? payloads.markdown;
  return {
    file_name: target.name,
    media_type: target.type,
    content_base64: btoa(unescape(encodeURIComponent(target.content))),
    text_preview: target.content.slice(0, 1200),
  };
}

function safeCsv(value: string | null) {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

export interface StoredSession {
  name: string;
  email: string;
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function setStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    emitSessionUpdated();
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitSessionUpdated();
}
