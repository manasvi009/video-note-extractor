"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { JobWorkspace } from "@/components/workspace/job-workspace";
import { Card } from "@/components/ui/card";
import { getJob } from "@/lib/api";
import type { JobDetail } from "@/lib/types";

export default function JobDetailsPage({ params }: { params: { jobId: string } }) {
  const { status } = useSession();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const payload = await getJob(params.jobId);
        if (active) {
          setJob(payload);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load extraction.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = window.setInterval(load, 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [params.jobId, status]);

  if (status !== "authenticated") {
    return <Card className="p-8 text-sm text-muted">Sign in to open extraction workspaces.</Card>;
  }

  if (loading) {
    return <Card className="p-8 text-sm text-muted">Loading extraction workspace...</Card>;
  }

  if (!job) {
    return (
      <main className="mx-auto max-w-2xl">
        <Card className="p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-muted">Missing job</p>
          <h1 className="mt-3 text-3xl font-bold">Extraction not found</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{error || "This extraction could not be loaded."}</p>
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
