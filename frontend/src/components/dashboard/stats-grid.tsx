import { Clock3, ListTodo, Sparkles, Waves } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { JobListItem } from "@/lib/types";

export function StatsGrid({ jobs }: { jobs: JobListItem[] }) {
  const completed = jobs.filter((job) => job.status === "completed").length;
  const processing = jobs.filter((job) => !["completed", "failed"].includes(job.status)).length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const totalMinutes = Math.round(jobs.reduce((sum, job) => sum + (job.duration_seconds ?? 0) / 60, 0));

  const cards = [
    { label: "Completed jobs", value: completed, helper: "Ready for export and Q&A", icon: Sparkles },
    { label: "Active pipeline", value: processing, helper: failed ? `${failed} failed jobs need review` : "No current failures", icon: Waves },
    { label: "Minutes indexed", value: totalMinutes, helper: "Across uploaded and URL sources", icon: Clock3 },
    { label: "Jobs in workspace", value: jobs.length, helper: "All searchable from dashboard and history", icon: ListTodo },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">{card.label}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
              <p className="mt-2 text-sm text-muted">{card.helper}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-accentWarm/20 p-3">
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
