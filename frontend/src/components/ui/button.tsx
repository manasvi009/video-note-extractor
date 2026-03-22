import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Button({
  children,
  className,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
        "bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:-translate-y-0.5",
        "dark:bg-white dark:text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

