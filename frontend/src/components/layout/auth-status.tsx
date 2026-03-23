"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getStoredSession, setStoredSession, subscribeToStoredSession, type StoredSession } from "@/lib/demo-store";

export function AuthStatus() {
  const [session, setSession] = useState<StoredSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getStoredSession());
    sync();
    return subscribeToStoredSession(sync);
  }, []);

  if (!session) {
    return (
      <Link href="/sign-in" className="text-sm text-muted">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">{session.name}</p>
        <p className="text-xs text-muted">{session.email}</p>
      </div>
      <Button
        type="button"
        
        className="rounded-full"
        onClick={() => setStoredSession(null)}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
