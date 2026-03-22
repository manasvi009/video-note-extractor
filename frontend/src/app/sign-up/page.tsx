import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Create account</p>
        <h1 className="mt-3 text-4xl font-bold">Sign up</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Create a workspace to organize videos, meetings, transcripts, summaries, and transcript-grounded Q&A.
        </p>
        <div className="mt-6 space-y-3">
          <Button className="w-full">Start with Google</Button>
          <Button className="w-full bg-white text-slate-950 dark:bg-slate-900 dark:text-white">Start with email</Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          Already have an account? <Link href="/sign-in" className="font-semibold text-accent">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}

