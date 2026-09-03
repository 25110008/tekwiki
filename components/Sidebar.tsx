"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { canView } from "@/lib/wiki";
import { BrandMark } from "./BrandMark";
import type { Page } from "@/lib/types";

function ChevronToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={expanded ? "折りたたむ" : "展開する"}
      className="shrink-0 p-1 -m-1 rounded hover:bg-surface-1"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className={`shrink-0 text-ink-faint transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function OutlineNode({
  page,
  depth,
  pages,
  manualOpen,
  setManualOpen,
}: {
  page: Page;
  depth: number;
  pages: Page[];
  manualOpen: Record<string, boolean>;
  setManualOpen: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const kids = pages.filter((c) => c.parentId === page.id && !c.archived).filter((c) => canView(c, user));
  const active = pathname === `/pages/${page.id}`;
  // 子ページの表示/非表示はナビゲーションと切り離し、既定では常に開いた状態(従来通りの見え方)。
  // 手動で閉じた場合のみ、その状態を覚えておく。
  const expanded = manualOpen[page.id] ?? true;

  function toggle() {
    setManualOpen((prev) => ({ ...prev, [page.id]: !expanded }));
  }

  return (
    <>
      <div className="flex items-center gap-1" style={{ paddingLeft: 10 + depth * 18 }}>
        {kids.length > 0 && <ChevronToggle expanded={expanded} onToggle={toggle} />}
        <Link
          href={`/pages/${page.id}`}
          className={`flex items-center gap-1.5 text-left rounded-md text-[0.86rem] py-1.5 px-1.5 flex-1 min-w-0 hover:bg-surface-3 ${
            active ? "bg-accent-soft text-accent-strong font-medium shadow-[inset_3px_0_0_var(--color-accent)]" : "text-ink"
          } ${kids.length === 0 ? "ml-[18px]" : ""}`}
        >
          {depth > 0 && <span className="text-ink-faint text-[0.8rem]">└</span>}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-faint">
            <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
            <path d="M14 3v5h5" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{page.title}</span>
        </Link>
      </div>
      {expanded &&
        kids.map((k) => <OutlineNode key={k.id} page={k} depth={depth + 1} pages={pages} manualOpen={manualOpen} setManualOpen={setManualOpen} />)}
    </>
  );
}

// カテゴリ・ページの階層ツリー本体。デスクトップのサイドバーと、モバイル用の
// ページ下部ツリー(MobileOutline)の両方から共有して使う。
function CategoryTree() {
  const { user } = useAuth();
  const { data } = useAppData();
  const { categories, pages } = data;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("cat") ?? "all";
  // カテゴリ・ページどちらの開閉も、ナビゲーションで決まる既定の開閉状態への
  // 手動の上書きとして持つ(ここに無ければ既定の挙動に従う)。
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({});

  const currentPage = pathname.startsWith("/pages/") ? pages.find((p) => p.id === pathname.split("/")[2]) : null;
  // 新規ページ作成画面(/pages/new, /pages/new/edit)はページIDがまだ無く上のcurrentPage判定に
  // 引っかからないため、代わりにURLの?cat=から作成先カテゴリを読み取る(サイドバーの展開状態が
  // 崩れて無関係なカテゴリに戻って見えてしまうのを防ぐ)。
  const isNewPageRoute = pathname === "/pages/new" || pathname.startsWith("/pages/new/");
  const newPageCategoryId = isNewPageRoute ? searchParams.get("cat") : null;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[0.72rem] uppercase tracking-wide text-ink-faint px-2.5 mb-1.5">カテゴリ</div>
      {categories.map((c) => {
        const count = pages.filter((p) => p.categoryId === c.id && !p.archived && canView(p, user)).length;
        const isActiveCat = pathname === "/" && activeCat === c.id;
        const autoExpanded = isActiveCat || currentPage?.categoryId === c.id || newPageCategoryId === c.id;
        // 今どのカテゴリを見ているかに関わらず、クリックで開閉を上書きできるようにする。
        const expanded = manualOpen[c.id] ?? autoExpanded;
        const topPages = expanded
          ? pages.filter((p) => p.categoryId === c.id && !p.parentId && !p.archived).filter((p) => canView(p, user))
          : [];

        return (
          <div key={c.id} className={`flex flex-col rounded-m mb-1.5 ${expanded ? "bg-surface-3 p-0.5 pb-1.5" : ""}`}>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-s text-[0.88rem] hover:bg-surface-3 ${
                isActiveCat ? "bg-accent-soft text-accent-strong font-medium shadow-[inset_3px_0_0_var(--color-accent)]" : "text-ink-muted"
              }`}
            >
              <ChevronToggle expanded={expanded} onToggle={() => setManualOpen((prev) => ({ ...prev, [c.id]: !expanded }))} />
              <Link href={`/?cat=${c.id}`} className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className="flex-1 truncate">{c.label}</span>
                <span className="font-code text-[0.74rem] text-ink-faint">{count}</span>
              </Link>
            </div>
            {topPages.map((p) => (
              <OutlineNode key={p.id} page={p} depth={0} pages={pages} manualOpen={manualOpen} setManualOpen={setManualOpen} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function HelpLinks() {
  return (
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
  );
}

function AdminLinks() {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[0.72rem] uppercase tracking-wide text-ink-faint px-2.5 mb-1.5">管理</div>
      <Link href="/admin/approvals" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        承認待ち一覧
      </Link>
      <Link href="/admin/inquiries" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        お問い合わせ一覧
      </Link>
      <Link href="/admin/users" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        ユーザー管理
      </Link>
      <Link href="/admin/faq" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        よくある質問の編集
      </Link>
      <Link href="/admin/guidelines" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        編集ガイドラインの編集
      </Link>
      <Link href="/admin/archive" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        アーカイブ済み
      </Link>
      <Link href="/admin/import" className="px-2.5 py-2 rounded-s text-[0.88rem] text-ink-muted hover:bg-surface-3">
        データインポート
      </Link>
    </div>
  );
}

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="hidden md:flex flex-col gap-5 border-r border-border bg-surface-2 p-5 w-[260px] shrink-0">
      <Link href="/" className="flex items-center gap-2.5 px-1.5">
        <BrandMark size={30} />
        <span className="font-heading font-semibold text-[1.05rem]">テクWiki</span>
      </Link>

      <CategoryTree />
      <HelpLinks />
      {user?.role === "admin" && <AdminLinks />}
    </aside>
  );
}

// 画面幅が狭い場合、固定サイドバーの代わりにメインコンテンツの続きとして
// ページ下部に表示する階層ツリー。固定パネルにはせず、通常のスクロールで
// 到達する形にする(要件定義書2.7節)。
export function MobileOutline() {
  const { user } = useAuth();

  return (
    <div className="md:hidden border-t border-border bg-surface-2 -mx-7 mt-8 px-7 py-6 flex flex-col gap-6">
      <CategoryTree />
      <HelpLinks />
      {user?.role === "admin" && <AdminLinks />}
    </div>
  );
}
