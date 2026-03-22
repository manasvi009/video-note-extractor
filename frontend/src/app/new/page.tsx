"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createJob, uploadJob } from "@/lib/api";
import type { OutputMode, SourceType } from "@/lib/types";

const modes: Array<{ value: OutputMode; label: string; description: string; promptFocus: string }> = [
  {
    value: "lecture",
    label: "Lecture mode",
    description: "Revision notes, concepts, definitions, and likely exam questions.",
    promptFocus: "Best for classes, tutorials, and technical explainers.",
  },
  {
    value: "meeting",
    label: "Meeting mode",
    description: "Minutes, decisions, blockers, owners, and follow-up tasks.",
    promptFocus: "Best for team syncs, webinars, and stakeholder calls.",
  },
  {
    value: "creator",
    label: "Creator mode",
    description: "Hook, storyline, examples, and viewer-ready takeaways.",
    promptFocus: "Best for YouTube videos, explainers, and content strategy review.",
  },
  {
    value: "podcast",
    label: "Podcast mode",
    description: "Themes, anecdotes, big ideas, and long-form listening notes.",
    promptFocus: "Best for interview podcasts and conversation-driven content.",
  },
];

const inputTypes: Array<{ value: SourceType; label: string; description: string }> = [
  { value: "url", label: "Video URL", description: "YouTube, Vimeo, Loom, or other supported URLs." },
  { value: "file", label: "File upload", description: "Upload mp4, mp3, wav, mov, or mkv from disk." },
  { value: "recording", label: "Meeting audio", description: "Bring in recorded lectures, meetings, or voice capture." },
];

const presets = [
  "System Design Lecture",
  "Quarterly Planning Meeting",
  "Founder Podcast Episode",
  "Deep-Dive Product Webinar",
];

export default function NewExtractionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mode, setMode] = useState<OutputMode>("lecture");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedMode = useMemo(() => modes.find((option) => option.value === mode) ?? modes[0], [mode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const job =
        sourceType === "url"
          ? await createJob({
              project_id: "demo-project",
              title,
              source_type: sourceType,
              source_url: sourceUrl,
              mode,
            })
          : await uploadJob({
              project_id: "demo-project",
              title,
              source_type: sourceType,
              file: file as File,
              mode,
            });
      router.push(`/jobs/${job.id}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create extraction job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Create job</p>
        <h1 className="mt-3 text-4xl font-bold">Start a new extraction</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          Submit a video URL, uploaded media file, or recorded lecture audio. The pipeline will validate the source, extract
          transcript chunks, index the content for search, and generate structured notes tuned to the selected mode.
        </p>

        <div className="mt-8 rounded-[24px] border border-border bg-white/50 p-5 dark:bg-slate-950/30">
          <p className="text-sm font-semibold">Selected output mode</p>
          <h2 className="mt-2 text-2xl font-bold">{selectedMode.label}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{selectedMode.description}</p>
          <p className="mt-2 text-sm leading-7 text-muted">{selectedMode.promptFocus}</p>
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-sm font-semibold">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTitle(preset)}
                className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-accent/50 hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-8">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
              placeholder="AI Lecture on Distributed Systems"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Input type</p>
            <div className="grid gap-3 md:grid-cols-3">
              {inputTypes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceType(option.value)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    sourceType === option.value ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <p className="font-medium">{option.label}</p>
                  <p className="mt-2 text-sm text-muted">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {sourceType === "url" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sourceUrl">
                YouTube or video URL
              </label>
              <input
                id="sourceUrl"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
                placeholder="https://youtube.com/watch?v=..."
              />
              <p className="text-sm text-muted">Supported in this scaffold: YouTube, Vimeo, Loom, or a direct HTTPS media URL.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="fileInput">
                Upload media
              </label>
              <input
                id="fileInput"
                type="file"
                accept=".mp4,.mp3,.wav,.mov,.mkv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
              />
              <p className="text-sm text-muted">Accepted: mp4, mp3, wav, mov, mkv</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Processing mode</p>
            <div className="grid gap-3 md:grid-cols-2">
              {modes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-[22px] border p-4 text-left transition ${
                    mode === option.value ? "border-accent bg-accent/10" : "border-border"
                  }`}
                >
                  <p className="font-medium">{option.label}</p>
                  <p className="mt-2 text-sm text-muted">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !title || (sourceType === "url" ? !sourceUrl : !file)}
          >
            {submitting ? "Creating extraction..." : "Create extraction"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
