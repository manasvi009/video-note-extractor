import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

import { SiteShell } from "@/components/layout/site-shell";

export const metadata: Metadata = {
  title: "Video Note Extractor",
  description: "Convert videos, lectures, webinars, podcasts, and meetings into structured notes with transcript-grounded AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
