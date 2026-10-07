import { Clock } from "lucide-react";
import type { ReactNode } from "react";

/** Content-block placeholder (docs/ux/states-and-ctas.md): one sentence, muted, in the normal content slot. */
export function ComingSoonPanel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-line-control">
        {icon ?? <Clock aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />}
      </span>
      <p className="type-body text-fg-muted">{children}</p>
    </div>
  );
}
