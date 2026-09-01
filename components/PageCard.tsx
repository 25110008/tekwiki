import Link from "next/link";
import type { Page } from "@/lib/types";

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint shrink-0">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function PageCard({ page, depth = 0 }: { page: Page; depth?: number }) {
  return (
    <Link
      href={`/pages/${page.id}`}
      className={`flex justify-between gap-4 p-4 border border-border rounded-m bg-surface hover:border-accent hover:shadow-sm transition-colors ${
        depth > 0 ? "border-l-2 bg-surface-2" : ""
      }`}
      style={depth > 0 ? { marginLeft: depth * 22 } : undefined}
    >
      <div>
        <h3 className="text-[1.02rem] flex items-center gap-1.5 font-heading font-semibold mb-1.5">
          {page.private && <LockIcon />}
          {page.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {page.tags.map((t) => (
            <span key={t} className="text-[0.74rem] px-2.5 py-0.5 rounded-full bg-surface-3 text-ink-muted border border-border">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="text-right shrink-0 text-[0.76rem] text-ink-faint">
        {page.updatedBy}
        <br />
        {page.updatedAt}
      </div>
    </Link>
  );
}
