import { getSession } from "next-auth/react";

import type { AskResponse, ExportResponse, JobDetail, JobListItem, OutputMode, SearchResult, SourceType } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "http://localhost:8000";

async function getAuthHeaders() {
  const session = await getSession();
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

async function request<T>(path: string, init?: RequestInit, requiresAuth = true): Promise<T> {
  const authHeaders = requiresAuth ? await getAuthHeaders() : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? "";
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function registerUser(payload: { name: string; email: string; password: string }) {
  return request<{ access_token: string; user: { id: string; email: string; name: string } }>(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    false,
  );
}

export async function getJobs() {
  return request<JobListItem[]>("/api/v1/jobs");
}

export async function getJob(jobId: string) {
  return request<JobDetail>(`/api/v1/jobs/${jobId}`);
}

export async function createJob(payload: {
  project_id?: string;
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
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("project_id", payload.project_id);
  formData.append("title", payload.title);
  formData.append("source_type", payload.source_type);
  formData.append("mode", payload.mode);
  formData.append("file", payload.file);

  const response = await fetch(`${API_BASE_URL}/api/v1/jobs/upload`, {
    method: "POST",
    body: formData,
    headers: authHeaders,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? "";
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || "Upload failed");
  }

  return response.json() as Promise<JobDetail>;
}

export async function retryJob(jobId: string) {
  return request<JobDetail>(`/api/v1/jobs/${jobId}/retry`, {
    method: "POST",
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
