import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-xl">
      <Card className="p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">Authentication</p>
        <h1 className="mt-3 text-4xl font-bold">Sign in</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          The app is scaffolded for NextAuth. Connect Google, GitHub, or email magic links in the auth provider config.
        </p>
        <div className="mt-6 space-y-3">
          <Button className="w-full">Continue with Google</Button>
          <Button className="w-full bg-white text-slate-950 dark:bg-slate-900 dark:text-white">Continue with email</Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          Need an account? <Link href="/sign-up" className="font-semibold text-accent">Sign up</Link>
        </p>
      </Card>
    </main>
  );
}

