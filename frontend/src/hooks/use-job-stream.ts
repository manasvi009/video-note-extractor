"use client";

import { useEffect, useState } from "react";

export function useJobStream(jobId: string, initialStatus: string, initialProgress: number) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const source = new EventSource(`${baseUrl}/api/v1/stream/jobs/${jobId}`);

    source.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { status: string; progress: number };
      setStatus(payload.status);
      setProgress(payload.progress);
    });

    source.addEventListener("error", () => {
      source.close();
    });

    return () => source.close();
  }, [jobId]);

  return { status, progress };
}

