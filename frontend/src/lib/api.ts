import type { AskResponse, ExportResponse, JobDetail, JobListItem, OutputMode, SearchResult, SourceType } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getJobs() {
  return request<JobListItem[]>("/api/v1/jobs");
}

export async function getJob(jobId: string) {
  return request<JobDetail>(`/api/v1/jobs/${jobId}`);
}

export async function createJob(payload: {
  project_id: string;
  title: string;
  source_type: SourceType;
  source_url?: string;
  filename?: string;
  mode: OutputMode;
}) {
  return request<JobDetail>("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadJob(payload: {
  project_id: string;
  title: string;
  source_type: Exclude<SourceType, "url">;
  file: File;
  mode: OutputMode;
}) {
  const formData = new FormData();
  formData.append("project_id", payload.project_id);
  formData.append("title", payload.title);
  formData.append("source_type", payload.source_type);
  formData.append("mode", payload.mode);
  formData.append("file", payload.file);

  return request<JobDetail>("/api/v1/jobs/upload", {
    method: "POST",
    body: formData,
  });
}

export async function searchJobs(query: string) {
  return request<SearchResult[]>(`/api/v1/search?query=${encodeURIComponent(query)}`);
}

export async function askJob(jobId: string, question: string) {
  return request<AskResponse>(`/api/v1/jobs/${jobId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function exportJob(jobId: string, kind: string) {
  return request<ExportResponse>(`/api/v1/jobs/${jobId}/export`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}
