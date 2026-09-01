"use client";

import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageCard } from "@/components/PageCard";
import { useAuth } from "./providers";
import { PAGES } from "@/lib/mock-data";
import { canView, catLabel } from "@/lib/wiki";
import type { Page, User } from "@/lib/types";

function renderTree(page: Page, currentUser: User | null, depth: number, out: { page: Page; depth: number }[]) {
  out.push({ page, depth });
  const kids = PAGES.filter((p) => p.parentId === page.id && !p.archived).filter((p) => canView(p, currentUser));
  for (const k of kids) renderTree(k, currentUser, depth + 1, out);
}

export default function HomePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("cat") ?? "all";
  const query = searchParams.get("q") ?? "";

  const filtering = query.trim().length > 0;
  let rows: { page: Page; depth: number }[] = [];
  let hiddenCount = 0;

  if (filtering) {
    const q = query.trim().toLowerCase();
    const pages = PAGES.filter((p) => p.categoryId === activeCat && !p.archived).filter(
      (p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))
    );
    const visible = pages.filter((p) => canView(p, user));
    hiddenCount = pages.length - visible.length;
    rows = visible.map((p) => ({ page: p, depth: 0 }));
  } else {
    const topPages = PAGES.filter((p) => p.categoryId === activeCat && !p.parentId && !p.archived);
    const visibleTop = topPages.filter((p) => canView(p, user));
    hiddenCount = topPages.length - visibleTop.length;
    for (const p of visibleTop) renderTree(p, user, 0, rows);
  }

  return (
    <AppShell>
      <div className="flex justify-between items-start gap-5 mb-6">
        <h2 className="text-[1.7rem]">{filtering ? `検索結果：「${query}」` : catLabel(activeCat)}</h2>
        <button className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2 shrink-0">+ 新規ページ</button>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.length === 0 ? (
          <div className="text-ink-faint text-sm text-center py-8">該当するページがありません</div>
        ) : (
          rows.map(({ page, depth }) => <PageCard key={page.id} page={page} depth={depth} />)
        )}
      </div>

      {hiddenCount > 0 && (
        <div className="text-ink-faint text-sm mt-4">閲覧権限のないページが{hiddenCount}件あります</div>
      )}
    </AppShell>
  );
}
