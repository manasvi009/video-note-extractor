import { notFound } from "next/navigation";

import { JobWorkspace } from "@/components/workspace/job-workspace";
import { getJob } from "@/lib/api";

export default async function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  try {
    const job = await getJob(jobId);
    return <JobWorkspace job={job} />;
  } catch {
    notFound();
  }
}

