"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";

export default function SignInPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("demo@videonote.app");
  const [password, setPassword] = useState("demo-password");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);
    if (result?.error) {
      setError("Invalid email or password.");
      pushToast({ tone: "error", title: "Sign-in failed", description: "Check your credentials and try again." });
      return;
    }

    pushToast({ tone: "success", title: "Signed in", description: "Your workspace is ready." });
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Authentication</p>
        <h1 className="mt-3 text-4xl font-bold">Sign in</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Sign in with your real account to access your jobs, transcript search, and extraction history from the backend API.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="you@example.com"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="Password"
          />
          {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={submitting || !email.trim() || !password.trim()}>
            {submitting ? "Signing in..." : "Continue to dashboard"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Need an account?{" "}
          <Link href="/sign-up" className="font-semibold text-accent">
            Sign up
          </Link>
        </p>
      </Card>
    </main>
  );
}
