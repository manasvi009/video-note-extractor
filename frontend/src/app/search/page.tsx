"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/card";
import { searchJobs } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { formatTimestamp, sentenceCase } from "@/lib/utils";

export default function SearchPage() {
  const { status } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSearch() {
    setLoading(true);
    setError("");
    try {
      setResults(await searchJobs(query));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Search history</p>
        <h1 className="mt-3 text-4xl font-bold">Search across extracted transcripts</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Run semantic-style lookup over transcript chunks, then jump into the job workspace with the most relevant timestamp.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-full border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="Search concepts, tasks, questions..."
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={loading || query.trim().length < 2 || status !== "authenticated"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            <Search className="h-4 w-4" />
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      </Card>

      {status !== "authenticated" ? (
        <Card className="p-8 text-sm text-muted">Sign in to search indexed transcript chunks.</Card>
      ) : (
        <div className="grid gap-4">
          {results.map((result) => (
            <Link key={`${result.job_id}-${result.timestamp_seconds}`} href={`/jobs/${result.job_id}`}>
              <Card className="p-5 transition hover:border-accent/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold">{result.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{result.snippet}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                      {sentenceCase(result.mode)} • {sentenceCase(result.source_type)} {result.speaker ? `• ${result.speaker}` : ""}
                    </p>
                  </div>
                  <div className="text-left text-sm text-muted lg:text-right">
                    <p>{formatTimestamp(result.timestamp_seconds)}</p>
                    <p>Score {result.score.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {!results.length ? (
            <Card className="p-8 text-sm leading-7 text-muted">
              Search results will appear here with title, supporting snippet, score, and timestamp once you index at least one completed job.
            </Card>
          ) : null}
        </div>
      )}
    </main>
  );
}
