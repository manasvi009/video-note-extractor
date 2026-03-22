import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { JobListItem } from "@/lib/types";
import { formatDuration, formatRelativeDate } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  queued: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  processing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100",
  transcribing: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  indexing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-100",
  summarizing: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-100",
  completed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  failed: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
};

export function JobTable({ jobs }: { jobs: JobListItem[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold">Recent jobs</h2>
        <p className="text-sm text-muted">Review progress, jump into workspaces, and reopen finished extractions quickly.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Mode</th>
              <th className="px-6 py-4 font-medium">Source</th>
              <th className="px-6 py-4 font-medium">Created</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-border">
                <td className="px-6 py-4">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:text-accent">
                    {job.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">{job.author ?? "Unknown source"}</p>
                </td>
                <td className="px-6 py-4 capitalize">{job.mode}</td>
                <td className="px-6 py-4 capitalize">{job.source_type}</td>
                <td className="px-6 py-4">
                  <p>{formatRelativeDate(job.created_at)}</p>
                  <p className="text-xs text-muted">{formatDuration(job.duration_seconds)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[job.status]}`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accentWarm" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span>{job.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
