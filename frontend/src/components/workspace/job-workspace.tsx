"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  FileSearch,
  ListTodo,
  MessageSquareText,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useJobStream } from "@/hooks/use-job-stream";
import { askJob, exportJob } from "@/lib/api";
import type { Citation, ExportResponse, JobDetail, SummaryStructure } from "@/lib/types";
import {
  downloadBase64File,
  formatRelativeDate,
  formatTimestamp,
  sentenceCase,
} from "@/lib/utils";

const tabs = [
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "notes", label: "Notes", icon: FileSearch },
  { id: "actions", label: "Action Items", icon: ListTodo },
  { id: "timestamps", label: "Timestamps", icon: Clock3 },
  { id: "transcript", label: "Transcript", icon: MessageSquareText },
  { id: "ask", label: "Ask AI", icon: Search },
] as const;

const exportOptions = [
  { kind: "markdown", label: "Markdown" },
  { kind: "pdf", label: "PDF" },
  { kind: "docx", label: "DOCX" },
  { kind: "json", label: "JSON" },
  { kind: "srt", label: "SRT" },
  { kind: "vtt", label: "VTT" },
  { kind: "txt", label: "TXT" },
  { kind: "csv", label: "CSV" },
] as const;

export function JobWorkspace({ job }: { job: JobDetail }) {
  const { status, progress } = useJobStream(job.id, job.status, job.progress);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("summary");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [asking, setAsking] = useState(false);
  const [exported, setExported] = useState<ExportResponse | null>(null);

  const summary = job.summaries[0]?.structured_json as SummaryStructure | undefined;

  const filteredTranscript = useMemo(() => {
    if (!workspaceSearch.trim()) {
      return job.transcript_chunks;
    }
    const needle = workspaceSearch.toLowerCase();
    return job.transcript_chunks.filter((chunk) => {
      return `${chunk.speaker ?? ""} ${chunk.text}`.toLowerCase().includes(needle);
    });
  }, [job.transcript_chunks, workspaceSearch]);

  const filteredActionItems = useMemo(() => {
    if (!workspaceSearch.trim()) {
      return job.action_items;
    }
    const needle = workspaceSearch.toLowerCase();
    return job.action_items.filter((item) => item.description.toLowerCase().includes(needle));
  }, [job.action_items, workspaceSearch]);

  async function onAsk() {
    if (!question.trim()) {
      return;
    }

    setAsking(true);
    try {
      const response = await askJob(job.id, question);
      setAnswer(response.answer);
      setCitations(response.citations);
    } finally {
      setAsking(false);
    }
  }

  async function onExport(kind: (typeof exportOptions)[number]["kind"]) {
    const result = await exportJob(job.id, kind);
    setExported(result);
    downloadBase64File(result.file_name, result.media_type, result.content_base64);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <section className="space-y-5">
        <div className="glass sticky top-24 z-20 rounded-[28px] border border-border p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.28em] text-muted">Workspace</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{job.title}</h1>
              <p className="mt-3 text-sm leading-7 text-muted">
                {job.author ?? "Unknown source"} - {sentenceCase(job.mode)} mode - {job.language ?? "en"} - Created {formatRelativeDate(job.created_at)}
              </p>
            </div>
            <div className="min-w-[260px] rounded-[22px] border border-border bg-white/50 p-4 dark:bg-slate-950/30">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accentWarm" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted">
                <div>
                  <p className="font-semibold text-foreground">{job.transcript_chunks.length}</p>
                  <p>Transcript chunks</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{job.timestamps.length}</p>
                  <p>Timeline markers</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{job.action_items.length}</p>
                  <p>Action items</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="rounded-full border border-border bg-white/45 px-4 py-3 dark:bg-slate-950/30">
              <input
                value={workspaceSearch}
                onChange={(event) => setWorkspaceSearch(event.target.value)}
                placeholder="Search inside transcript, notes, and action items"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                    activeTab === tab.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "border border-border text-muted"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "summary" && (
          <div className="grid gap-4">
            <SectionCard title="Overview" body={summary?.overview ?? job.summaries[0]?.content_markdown ?? "No overview available."} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ListCard title="Key Takeaways" items={summary?.key_takeaways ?? []} />
              <ListCard title="Questions Discussed" items={summary?.questions_discussed ?? []} />
              <ListCard title="Key Decisions" items={summary?.key_decisions ?? []} />
              <ListCard title={job.mode === "lecture" ? "Revision Notes" : "Mode Notes"} items={summary?.exam_notes ?? summary?.meeting_minutes ?? []} />
            </div>
            <div className="glass rounded-[24px] border border-border p-6">
              <h2 className="text-lg font-semibold">Section-wise Summary</h2>
              <div className="mt-4 space-y-4">
                {(summary?.section_summary ?? []).map((section) => (
                  <div key={section.title} className="rounded-[20px] border border-border bg-white/45 p-4 dark:bg-slate-950/30">
                    <p className="font-medium">{section.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{section.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="grid gap-4">
            {job.summaries.map((section) => (
              <div key={section.id} className="glass rounded-[24px] border border-border p-6">
                <h2 className="text-lg font-semibold">{section.section}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{section.content_markdown}</p>
              </div>
            ))}
            <div className="glass rounded-[24px] border border-border p-6">
              <h2 className="text-lg font-semibold">Definitions and Concepts</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(summary?.definitions ?? []).map((definition) => (
                  <div key={definition.term} className="rounded-[20px] border border-border bg-white/45 p-4 dark:bg-slate-950/30">
                    <p className="font-medium">{definition.term}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{definition.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "actions" && (
          <div className="grid gap-4">
            {filteredActionItems.map((item) => (
              <div key={item.id} className="glass rounded-[22px] border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="mt-2 text-sm text-muted">
                      Owner: {item.owner ?? "Unassigned"} - Due: {item.due_hint ?? "None"}
                    </p>
                  </div>
                  {item.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : null}
                </div>
              </div>
            ))}
            {!filteredActionItems.length ? <EmptyState label="No action items matched this search." /> : null}
          </div>
        )}

        {activeTab === "timestamps" && (
          <div className="grid gap-4">
            {job.timestamps.map((stamp) => (
              <button key={stamp.id} type="button" onClick={() => setActiveTab("transcript")} className="glass rounded-[22px] border border-border p-5 text-left transition hover:border-accent/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{stamp.label}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{stamp.description}</p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
                    {formatTimestamp(stamp.start_seconds)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "transcript" && (
          <div className="glass rounded-[24px] border border-border p-4">
            <div className="max-h-[780px] space-y-3 overflow-y-auto pr-2">
              {filteredTranscript.map((chunk) => (
                <div key={chunk.id} className="rounded-[20px] border border-border bg-white/50 p-4 dark:bg-slate-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{chunk.speaker ?? "Speaker"}</p>
                    <button type="button" className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {formatTimestamp(chunk.start_seconds)}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted">{chunk.text}</p>
                </div>
              ))}
              {!filteredTranscript.length ? <EmptyState label="No transcript chunks matched this search." /> : null}
            </div>
          </div>
        )}

        {activeTab === "ask" && (
          <div className="grid gap-4">
            <div className="glass rounded-[24px] border border-border p-6">
              <div className="flex gap-3">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a grounded question about the transcript"
                  className="w-full rounded-full border border-border bg-transparent px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={onAsk}
                  disabled={asking || !question.trim()}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  {asking ? "Asking..." : "Ask"}
                </button>
              </div>
              {answer ? (
                <div className="mt-6 space-y-4">
                  <p className="leading-7">{answer}</p>
                  {citations.map((citation, index) => (
                    <div key={`${citation.start_seconds}-${index}`} className="rounded-[20px] border border-border p-4 text-sm text-muted">
                      <p>{citation.snippet}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                        {citation.label ?? "Speaker"} - {formatTimestamp(citation.start_seconds)} - {formatTimestamp(citation.end_seconds)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="glass rounded-[24px] border border-border p-6">
              <h2 className="text-lg font-semibold">Chat history</h2>
              <div className="mt-4 space-y-4">
                {job.chat_history.map((entry) => (
                  <div key={entry.id} className="rounded-[20px] border border-border bg-white/45 p-4 dark:bg-slate-950/30">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">{formatRelativeDate(entry.created_at)}</p>
                    <p className="mt-2 font-medium">{entry.question}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{entry.answer}</p>
                  </div>
                ))}
                {!job.chat_history.length ? <EmptyState label="Questions you ask here will be stored with transcript citations." /> : null}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <div className="glass rounded-[28px] border border-border p-6">
          <h2 className="text-lg font-semibold">Source metadata</h2>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>Source type: {sentenceCase(job.source_type)}</p>
            <p>Source URL: {job.source_url ?? "Uploaded file"}</p>
            <p>Duration: {formatTimestamp(job.duration_seconds ?? 0)}</p>
            <p>Pipeline: {((job.metadata_json.ingest as { pipeline?: string[] } | undefined)?.pipeline ?? []).join(" -> ")}</p>
          </div>
        </div>

        <div className="glass rounded-[28px] border border-border p-6">
          <h2 className="text-lg font-semibold">Exports</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {exportOptions.map((option) => (
              <button
                key={option.kind}
                type="button"
                onClick={() => onExport(option.kind)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-medium transition hover:border-accent/50"
              >
                <Download className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
          {exported ? <p className="mt-4 text-xs text-muted">Last export: {exported.file_name}</p> : null}
        </div>

        <div className="glass rounded-[28px] border border-border p-6">
          <h2 className="text-lg font-semibold">Workspace intelligence</h2>
          <div className="mt-4 space-y-4 text-sm text-muted">
            <p>Semantic transcript search with citations and timestamps.</p>
            <p>Mode-aware prompts for lectures, meetings, creator videos, and podcasts.</p>
            <p>Structured notes ready for review, export, and downstream automation.</p>
          </div>
        </div>

        <div className="glass rounded-[28px] border border-border p-6">
          <h2 className="text-lg font-semibold">Important timeline</h2>
          <div className="mt-4 space-y-3">
            {job.timestamps.map((stamp) => (
              <div key={stamp.id} className="rounded-[18px] border border-border bg-white/45 p-4 dark:bg-slate-950/30">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{stamp.label}</p>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    {formatTimestamp(stamp.start_seconds)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{stamp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SectionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-[24px] border border-border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{body}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="glass rounded-[24px] border border-border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
        {items.length ? items.map((item) => <p key={item}>- {item}</p>) : <p>No items extracted yet.</p>}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[20px] border border-dashed border-border p-6 text-sm text-muted">{label}</div>;
}

