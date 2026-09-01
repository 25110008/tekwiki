"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { CATEGORIES, PAGES } from "@/lib/mock-data";
import { canView } from "@/lib/wiki";
import { BrandMark } from "./BrandMark";
import type { Page } from "@/lib/types";

function OutlineNode({ page, depth }: { page: Page; depth: number }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const kids = PAGES.filter((c) => c.parentId === page.id && !c.archived).filter((c) => canView(c, user));
  const active = pathname === `/pages/${page.id}`;

  return (
    <>
      <Link
        href={`/pages/${page.id}`}
        className={`flex items-center gap-1.5 text-left rounded-md text-[0.86rem] py-1.5 px-1.5 hover:bg-surface-3 ${
          active ? "bg-accent-soft text-accent-strong font-medium shadow-[inset_3px_0_0_var(--color-accent)]" : "text-ink"
        }`}
        style={{ paddingLeft: 10 + depth * 18 }}
      >
        {depth > 0 && <span className="text-ink-faint text-[0.8rem]">└</span>}
        {page.title}
      </Link>
      {kids.map((k) => (
        <OutlineNode key={k.id} page={k} depth={depth + 1} />
      ))}
    </>
  );
}

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("cat") ?? "all";

  const currentPage = pathname.startsWith("/pages/") ? PAGES.find((p) => p.id === pathname.split("/")[2]) : null;

  return (
    <aside className="hidden md:flex flex-col gap-5 border-r border-border bg-surface-2 p-5 w-[260px] shrink-0">
      <Link href="/" className="flex items-center gap-2.5 px-1.5">
        <BrandMark size={30} />
        <span className="font-heading font-semibold text-[1.05rem]">テクWiki</span>
      </Link>

      <div className="flex flex-col gap-0.5">
        <div className="text-[0.72rem] uppercase tracking-wide text-ink-faint px-2.5 mb-1.5">カテゴリ</div>
        {CATEGORIES.map((c) => {
          const count = PAGES.filter((p) => p.categoryId === c.id && !p.archived && canView(p, user)).length;
          const isActiveCat = pathname === "/" && activeCat === c.id;
          const expanded = isActiveCat || currentPage?.categoryId === c.id;
          const topPages = expanded
            ? PAGES.filter((p) => p.categoryId === c.id && !p.parentId && !p.archived).filter((p) => canView(p, user))
            : [];

          return (
            <div key={c.id} className={`flex flex-col rounded-m mb-1.5 ${expanded ? "bg-surface-3 p-0.5 pb-1.5" : ""}`}>
              <Link
                href={`/?cat=${c.id}`}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-s text-[0.88rem] hover:bg-surface-3 ${
                  isActiveCat ? "bg-accent-soft text-accent-strong font-medium shadow-[inset_3px_0_0_var(--color-accent)]" : "text-ink-muted"
                }`}
              >
                <span>{c.label}</span>
                <span className="font-code text-[0.74rem] text-ink-faint">{count}</span>
              </Link>
              {topPages.map((p) => (
                <OutlineNode key={p.id} page={p} depth={0} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-[0.72rem] uppercase tracking-wide text-ink-faint px-2.5 mb-1.5">ヘルプ</div>
        <Link href="/faq" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
          よくある質問
        </Link>
        <Link href="/guidelines" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
          編集ガイドライン
        </Link>
        <Link href="/contact" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
          お問い合わせ
        </Link>
      </div>

      {user?.role === "admin" && (
        <div className="flex flex-col gap-0.5">
          <div className="text-[0.72rem] uppercase tracking-wide text-ink-faint px-2.5 mb-1.5">管理</div>
          <Link href="/admin/approvals" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
            承認待ち一覧
          </Link>
          <Link href="/admin/inquiries" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
            お問い合わせ一覧
          </Link>
          <Link href="/admin/archive" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
            アーカイブ済み
          </Link>
          <Link href="/admin/import" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
            データインポート
          </Link>
        </div>
      )}
    </aside>
  );
}
