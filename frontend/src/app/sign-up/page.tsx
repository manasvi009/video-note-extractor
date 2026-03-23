"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setStoredSession } from "@/lib/demo-store";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoredSession({ name, email });
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Create account</p>
        <h1 className="mt-3 text-4xl font-bold">Sign up</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Create a local workspace profile to organize videos, meetings, transcripts, summaries, and grounded Q&A in this deployment.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="Your name"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="you@example.com"
          />
          <Button className="w-full" type="submit" disabled={!name.trim() || !email.trim()}>
            Create workspace
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account? <Link href="/sign-in" className="font-semibold text-accent">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
