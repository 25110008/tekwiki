"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageCard } from "@/components/PageCard";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { canView, catLabel, getBacklinks, getChildren, renderMarkdown } from "@/lib/wiki";
import { setPageArchivedApi } from "@/lib/client-api";
import type { Category, GlossaryEntry, Page } from "@/lib/types";

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block align-[-2px]">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function PageDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [tab, setTab] = useState<"body" | "history">("body");

  const page = data.pages.find((p) => p.id === id);

  return (
    <AppShell>
      {loading ? (
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      ) : !page || !canView(page, user) ? (
        <div className="text-ink-faint text-sm text-center py-10">このページを表示する権限がありません</div>
      ) : (
        <PageBody
          page={page}
          tab={tab}
          setTab={setTab}
          pages={data.pages}
          categories={data.categories}
          glossary={data.glossary}
          refresh={refresh}
        />
      )}
    </AppShell>
  );
}

function buildCrumb(page: Page, pages: Page[]): Page[] {
  const chain: Page[] = [];
  let cur: Page | undefined = page;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? pages.find((p) => p.id === cur!.parentId) : undefined;
  }
  return chain;
}

function PageBody({
  page,
  tab,
  setTab,
  pages,
  categories,
  glossary,
  refresh,
}: {
  page: Page;
  tab: "body" | "history";
  setTab: (t: "body" | "history") => void;
  pages: Page[];
  categories: Category[];
  glossary: GlossaryEntry[];
  refresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const crumb = buildCrumb(page, pages);
  const depth = crumb.length - 1;
  const atMaxDepth = depth >= 2;
  const children = getChildren(page.id, user, pages);
  const backlinks = getBacklinks(page.id, user, pages, glossary);

  async function toggleArchive() {
    if (!user || archiving) return;
    setArchiving(true);
    await setPageArchivedApi(page.id, !page.archived, user);
    await refresh();
    setArchiving(false);
    setConfirmingArchive(false);
  }

  function handleProseClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-page-id]");
    if (target) router.push(`/pages/${target.getAttribute("data-page-id")}`);
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-ink-faint text-[0.8rem] mb-3.5">
        <Link href={`/?cat=${page.categoryId}`} className="hover:text-accent hover:underline">
          {catLabel(page.categoryId, categories)}
        </Link>
        {crumb.map((c, i) => {
          const isLast = i === crumb.length - 1;
          return (
            <span key={c.id} className="flex items-center gap-1.5">
              <span>/</span>
              {isLast ? <span>{c.title}</span> : <Link href={`/pages/${c.id}`} className="hover:text-accent hover:underline">{c.title}</Link>}
            </span>
          );
        })}
      </div>

      <div className="flex justify-between items-start gap-5 mb-5">
        <div>
          <h2 className="text-[1.7rem] flex items-center gap-2">
            {page.private && <LockIcon />}
            {page.title}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {page.tags.map((t) => (
              <span key={t} className="text-[0.74rem] px-2.5 py-0.5 rounded-full bg-surface-3 text-ink-muted border border-border">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user?.role === "admin" &&
            (confirmingArchive ? (
              <div className="flex items-center gap-2 bg-warn-soft border border-warn rounded-s px-3 py-2">
                <span className="text-warn text-[0.8rem]">{page.archived ? "アーカイブを解除しますか？" : "アーカイブしますか？"}</span>
                <button
                  onClick={toggleArchive}
                  disabled={archiving}
                  className="bg-accent text-white rounded-s px-3 py-1 text-[0.8rem] font-medium disabled:opacity-60"
                >
                  実行する
                </button>
                <button onClick={() => setConfirmingArchive(false)} className="border border-border rounded-s px-3 py-1 text-[0.8rem] bg-surface-1 hover:bg-surface-2">
                  キャンセル
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmingArchive(true)} className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2">
                {page.archived ? "アーカイブを解除" : "アーカイブする"}
              </button>
            ))}
          <Link href={`/pages/${page.id}/edit`} className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2">
            編集する
          </Link>
        </div>
      </div>

      <div className="flex gap-4.5 border-b border-border mb-5">
        <button
          onClick={() => setTab("body")}
          className={`pb-2.5 mr-4.5 text-sm border-b-2 ${tab === "body" ? "border-accent text-accent-strong font-medium" : "border-transparent text-ink-muted"}`}
        >
          本文
        </button>
        <button
          onClick={() => setTab("history")}
          className={`pb-2.5 mr-4.5 text-sm border-b-2 ${tab === "history" ? "border-accent text-accent-strong font-medium" : "border-transparent text-ink-muted"}`}
        >
          変更履歴
        </button>
      </div>

      {tab === "body" ? (
        <>
          {page.archived && (
            <div className="bg-warn-soft text-warn border border-warn rounded-s px-4 py-3 text-sm mb-5">
              このページはアーカイブされています。一覧や検索、AIチャットの回答には表示されません。
            </div>
          )}

          <div
            onClick={handleProseClick}
            className="prose max-w-[68ch] [&_.auto-link]:text-accent-strong [&_.auto-link]:underline [&_.auto-link]:decoration-dotted [&_.auto-link]:cursor-pointer [&_h3]:font-heading [&_h3]:text-[1.1rem] [&_h3]:mt-5 [&_h3]:mb-2 [&_h4]:font-heading [&_h4]:text-base [&_h4]:mt-5 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3.5 [&_li]:mb-1 [&_p]:mb-3.5 [&_code]:font-code [&_code]:bg-surface-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.88em] [&_pre]:bg-surface-2 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-s [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-[0.88rem] [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body, page.id, glossary, pages) }}
          />

          {page.attachments.length > 0 && (
            <>
              <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mt-6 mb-3">添付ファイル</div>
              <div className="flex flex-col gap-2 max-w-[68ch]">
                {page.attachments.map((a) => (
                  <div key={a.name} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-s bg-surface-2 text-sm">
                    <span>{a.name}</span>
                    <span className="ml-auto text-ink-faint text-[0.76rem]">{a.size}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {children.length > 0 && (
            <>
              <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mt-6 mb-3">子ページ</div>
              <div className="flex flex-col gap-2.5">
                {children.map((c) => (
                  <PageCard key={c.id} page={c} />
                ))}
              </div>
            </>
          )}

          <div className="mt-4.5">
            {atMaxDepth ? (
              <p className="text-ink-faint text-[0.8rem]">推奨される階層(3階層)の上限に達しているため、これ以上の子ページは作成できません。</p>
            ) : (
              <Link
                href={`/pages/new?cat=${page.categoryId}&parent=${page.id}`}
                className="border border-border rounded-s px-3.5 py-1.5 text-[0.82rem] hover:bg-surface-2 inline-block"
              >
                + 子ページを追加
              </Link>
            )}
          </div>

          {backlinks.length > 0 && (
            <>
              <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mt-6 mb-3">このページを参照しているページ</div>
              <div className="flex flex-col gap-2.5">
                {backlinks.map((b) => (
                  <PageCard key={b.id} page={b} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div>
          {page.history.map((h, i) => (
            <div key={i} className="flex gap-3.5 py-3 border-b border-border last:border-none items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[0.88rem] font-medium">{h.who}</div>
                <div className="text-[0.76rem] text-ink-faint">{h.when}</div>
                <div className="text-[0.83rem] text-ink-muted mt-0.5">{h.what}</div>
              </div>
              <button className="border border-border rounded-s px-3 py-1.5 text-[0.82rem] hover:bg-surface-2 shrink-0">この版に戻す</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
