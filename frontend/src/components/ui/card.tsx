import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("glass rounded-[28px] border border-border shadow-panel", className)} {...props}>
      {children}
    </div>
  );
}

