"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-muted">Loading...</span>;
  }

  if (!session?.user) {
    return (
      <Link href="/sign-in" className="text-sm text-muted">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">{session.user.name}</p>
        <p className="text-xs text-muted">{session.user.email}</p>
      </div>
      <Button type="button" className="rounded-full" onClick={() => signOut({ callbackUrl: "/sign-in" })}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
