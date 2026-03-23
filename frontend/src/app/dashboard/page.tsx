"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JobTable } from "@/components/dashboard/job-table";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { Card } from "@/components/ui/card";
import { listStoredJobs, subscribeToStoredJobs } from "@/lib/demo-store";
import type { JobListItem } from "@/lib/types";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  useEffect(() => {
    const sync = () => setJobs(listStoredJobs());
    sync();
    return subscribeToStoredJobs(sync);
  }, []);

  const latest = jobs[0];

  return (
    <main className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Dashboard</p>
          <h1 className="mt-3 text-4xl font-bold">All extractions in one clean workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Track ingestion, transcription, indexing, summarization, grounded Q&A, and export workflows from a single responsive dashboard.
          </p>
        </Card>
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Latest extraction</p>
          {latest ? (
            <>
              <h2 className="mt-3 text-2xl font-bold">{latest.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {latest.mode} mode • {latest.source_type} source • {latest.progress}% pipeline progress
              </p>
              <Link
                href={`/jobs/${latest.id}`}
                className="mt-6 inline-flex rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                Open workspace
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Create your first extraction to populate the dashboard.</p>
          )}
        </Card>
      </section>
      <StatsGrid jobs={jobs} />
      <JobTable jobs={jobs} />
    </main>
  );
}
