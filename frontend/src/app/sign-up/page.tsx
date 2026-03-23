"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-provider";
import { registerUser } from "@/lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await registerUser({ name, email, password });
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Account created, but sign-in failed. Please try signing in manually.");
      }

      pushToast({ tone: "success", title: "Account created", description: "You can start extracting immediately." });
      router.push("/dashboard");
    } catch (registrationError) {
      const message = registrationError instanceof Error ? registrationError.message : "Unable to create account.";
      setError(message);
      pushToast({ tone: "error", title: "Sign-up failed", description: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Create account</p>
        <h1 className="mt-3 text-4xl font-bold">Sign up</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Create a real account backed by the API so your jobs, search history, and extracted notes stay attached to your user.
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
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="w-full rounded-3xl border border-border bg-transparent px-4 py-3 outline-none"
            placeholder="Create a password"
          />
          {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={submitting || !name.trim() || !email.trim() || password.length < 8}>
            {submitting ? "Creating account..." : "Create workspace"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-accent">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
