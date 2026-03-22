import Link from "next/link";
import type { PropsWithChildren } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New Extraction" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
];

export function SiteShell({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="sticky top-4 z-30 mb-6 rounded-[28px] border border-border bg-white/70 px-4 py-3 backdrop-blur dark:bg-slate-950/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-accentWarm" />
              <div>
                <p className="text-sm font-semibold tracking-[0.24em] text-muted">VIDEO NOTE EXTRACTOR</p>
                <p className="text-sm text-muted">Long-form content into grounded notes</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <Link href="/sign-in" className="text-sm text-muted">
                Sign in
              </Link>
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <nav className="flex flex-wrap items-center gap-3 text-sm text-muted">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="hidden items-center gap-3 lg:flex">
              <Link href="/sign-in" className="text-sm text-muted">
                Sign in
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
