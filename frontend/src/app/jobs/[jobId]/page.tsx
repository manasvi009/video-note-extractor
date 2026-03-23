"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { JobWorkspace } from "@/components/workspace/job-workspace";
import { Card } from "@/components/ui/card";
import { getStoredJob, subscribeToStoredJobs } from "@/lib/demo-store";
import type { JobDetail } from "@/lib/types";

export default function JobDetailsPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setJob(getStoredJob(params.jobId));
      setReady(true);
    };
    sync();
    return subscribeToStoredJobs(sync);
  }, [params.jobId]);

  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      setJob(getStoredJob(params.jobId));
    }, 500);

    return () => window.clearInterval(timer);
  }, [job, params.jobId]);

  if (!ready) {
    return (
      <Card className="p-8 text-sm text-muted">
        Loading extraction workspace...
      </Card>
    );
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-2xl">
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Missing job</p>
          <h1 className="mt-3 text-3xl font-bold">Extraction not found</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            This job is not available in the current browser workspace. Create a new extraction or open one from the dashboard.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/new" className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              New extraction
            </Link>
            <Link href="/dashboard" className="rounded-full border border-border px-4 py-3 text-sm font-semibold">
              Back to dashboard
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return <JobWorkspace job={job} />;
}
