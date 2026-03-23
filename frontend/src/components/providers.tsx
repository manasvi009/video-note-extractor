"use client";

import { SessionProvider } from "next-auth/react";
import type { PropsWithChildren } from "react";

import { ToastProvider } from "@/components/ui/toast-provider";

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
