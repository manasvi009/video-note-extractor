import type { AskResponse, ExportResponse, JobDetail, JobListItem, OutputMode, SearchResult, SourceType } from "@/lib/types";
import {
  askStoredJob,
  createStoredJob,
  exportStoredJob,
  getStoredJob,
  listStoredJobs,
  searchStoredJobs,
} from "@/lib/demo-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Remote API is not configured for this deployment.");
  }

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

function shouldUseLocalStore() {
  return !API_BASE_URL;
}

export async function getJobs() {
  if (shouldUseLocalStore()) {
    return listStoredJobs();
  }
  return request<JobListItem[]>("/api/v1/jobs");
}

export async function getJob(jobId: string) {
  if (shouldUseLocalStore()) {
    const job = getStoredJob(jobId);
    if (!job) {
      throw new Error("Job not found.");
    }
    return job;
  }
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
  if (shouldUseLocalStore()) {
    return createStoredJob(payload);
  }
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
  if (shouldUseLocalStore()) {
    return createStoredJob({
      title: payload.title,
      source_type: payload.source_type,
      filename: payload.file.name,
      mode: payload.mode,
    });
  }

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
  if (shouldUseLocalStore()) {
    return searchStoredJobs(query);
  }
  return request<SearchResult[]>(`/api/v1/search?query=${encodeURIComponent(query)}`);
}

export async function askJob(jobId: string, question: string) {
  if (shouldUseLocalStore()) {
    return askStoredJob(jobId, question);
  }
  return request<AskResponse>(`/api/v1/jobs/${jobId}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function exportJob(jobId: string, kind: string) {
  if (shouldUseLocalStore()) {
    return exportStoredJob(jobId, kind);
  }
  return request<ExportResponse>(`/api/v1/jobs/${jobId}/export`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}
