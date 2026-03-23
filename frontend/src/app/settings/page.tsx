"use client";

import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/card";

const runtimeItems = [
  "Frontend uses authenticated API requests instead of browser-only mock storage.",
  "Jobs, transcript search, chat, and exports read from FastAPI endpoints.",
  "NextAuth credentials sessions manage user identity for the app shell and protected API access.",
  "Render deployment hosts API and worker, while Vercel hosts the frontend.",
];

export default function SettingsPage() {
  const { data: session, status } = useSession();

  return (
    <main className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Account</p>
        <h1 className="mt-3 text-4xl font-bold">Settings</h1>
        <div className="mt-6 space-y-3 text-sm leading-7 text-muted">
          {status === "authenticated" ? (
            <>
              <p>Name: {session?.user?.name}</p>
              <p>Email: {session?.user?.email}</p>
            </>
          ) : (
            <p>Sign in to view your account details.</p>
          )}
        </div>
      </Card>

      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Runtime</p>
        <div className="mt-6 space-y-3 text-sm leading-7 text-muted">
          {runtimeItems.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </Card>
    </main>
  );
}
