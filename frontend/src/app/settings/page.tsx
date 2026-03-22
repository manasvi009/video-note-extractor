import { Card } from "@/components/ui/card";

const settingsGroups = [
  {
    title: "Application",
    items: [
      "Frontend: Next.js App Router with Tailwind CSS and typed API helpers.",
      "Authentication: NextAuth-ready scaffold with environment hooks for providers.",
      "Realtime: Server-sent events endpoint for progress updates.",
    ],
  },
  {
    title: "Processing stack",
    items: [
      "Backend: FastAPI with Celery workers for ingestion and summarization tasks.",
      "Speech-to-text: Whisper or WhisperX adapter layer can replace the demo content service.",
      "Retrieval: Postgres stores entities while Qdrant stores vector payloads for transcript search.",
    ],
  },
  {
    title: "Production checklist",
    items: [
      "Set DATABASE_URL, REDIS_URL, QDRANT_URL, and OPENAI_API_KEY before running outside demo mode.",
      "Install FFmpeg and yt-dlp in the worker image for real media acquisition and audio extraction.",
      "Switch STORAGE_MODE to s3 and configure bucket credentials for production deployments.",
    ],
  },
];

export default function SettingsPage() {
  return (
    <main className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {settingsGroups.map((group) => (
        <Card key={group.title} className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">{group.title}</p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-muted">
            {group.items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </Card>
      ))}
    </main>
  );
}
