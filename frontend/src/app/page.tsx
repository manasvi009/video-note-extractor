import Link from "next/link";
import { ArrowRight, AudioLines, BrainCircuit, DatabaseZap, FileSearch2, Sparkles, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  { title: "Three ingestion paths", description: "Bring in YouTube URLs, direct uploads, or recorded meeting audio with one workflow.", icon: AudioLines },
  { title: "Mode-aware note generation", description: "Lecture, meeting, creator, and podcast prompt templates produce outputs tuned to the source.", icon: BrainCircuit },
  { title: "Transcript-grounded answers", description: "Ask follow-up questions and get cited snippets with timestamps instead of generic summaries.", icon: FileSearch2 },
  { title: "Production-ready pipeline", description: "FastAPI, Celery, Postgres, Redis, Qdrant, and S3-compatible storage are already scaffolded.", icon: Workflow },
];

const workflow = [
  "Ingest source metadata and validate uploads or URLs.",
  "Extract audio, transcribe with timestamps, and preserve speakers where available.",
  "Chunk transcript for indexing, store embeddings metadata, and generate structured outputs.",
  "Search, chat, export, and share grounded notes in one workspace.",
];

export default function LandingPage() {
  return (
    <main className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="animate-rise overflow-hidden p-8 sm:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Structured intelligence for long-form media</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl">
            Turn every <span className="gradient-text">video, lecture, meeting, or podcast</span> into a searchable note workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Video Note Extractor turns long recordings into organized notes, key decisions, revision material, action items,
            transcript search, and grounded answers with source attribution.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/new">
              <Button className="gap-2">
                Start extraction
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-white text-slate-950 dark:bg-slate-900 dark:text-white">Open dashboard</Button>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Metric label="Job states" value="7" />
            <Metric label="Export formats" value="8" />
            <Metric label="Prompt modes" value="4" />
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accentWarm/20 p-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Premium workspace</p>
                <p className="text-sm text-muted">Sticky metadata header, timeline, transcript viewer, and one-click exports.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-border bg-white/55 p-4 dark:bg-slate-950/30">
                <p className="text-sm font-semibold">Summary stack</p>
                <p className="mt-3 text-sm leading-7 text-muted">Overview, bullet notes, questions, decisions, concepts, and exam or meeting-specific outputs.</p>
              </div>
              <div className="rounded-[22px] border border-border bg-white/55 p-4 dark:bg-slate-950/30">
                <p className="text-sm font-semibold">Ask AI</p>
                <p className="mt-3 text-sm leading-7 text-muted">Grounded answers reference cited transcript snippets and timestamps for fast verification.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accentWarm/20 p-3">
                <DatabaseZap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Pipeline overview</p>
                <p className="text-sm text-muted">From ingest to RAG-backed notes in a clean operational flow.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {workflow.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-[18px] border border-border bg-white/45 p-4 dark:bg-slate-950/30">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accentWarm/20 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-muted">{step}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} className="p-5">
            <feature.icon className="h-5 w-5" />
            <h2 className="mt-4 font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted">{feature.description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
