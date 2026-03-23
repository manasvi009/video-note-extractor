"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setStoredSession } from "@/lib/demo-store";

export default function SignInPage() {
  const router = useRouter();
  const [name, setName] = useState("Manasvi");
  const [email, setEmail] = useState("manasvi@example.com");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStoredSession({ name, email });
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Authentication</p>
        <h1 className="mt-3 text-4xl font-bold">Sign in</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          This deployment uses a local browser session so the rest of the product stays fully interactive without external auth wiring.
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
            Continue to dashboard
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Need an account? <Link href="/sign-up" className="font-semibold text-accent">Sign up</Link>
        </p>
      </Card>
    </main>
  );
}
