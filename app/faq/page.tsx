"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { canView, linkify } from "@/lib/wiki";

export default function FaqPage() {
  const { user } = useAuth();
  const { data, loading } = useAppData();
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-page-id]");
    if (target) router.push(`/pages/${target.getAttribute("data-page-id")}`);
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-5">よくある質問</h2>

      {loading ? (
        <div className="text-ink-faint text-sm text-center py-8">読み込み中...</div>
      ) : (
        <div className="flex flex-col gap-3.5 max-w-[68ch]">
          {data.faqs.map((f) => {
            const page = f.pageId ? data.pages.find((p) => p.id === f.pageId) : null;
            const visible = page && canView(page, user);
            return (
              <div key={f.id} className="border border-border rounded-m p-4 bg-surface-1">
                <div className="font-medium mb-2">Q. {f.question}</div>
                <div
                  onClick={handleClick}
                  className="text-[0.92rem] text-ink-muted leading-relaxed [&_.auto-link]:text-accent-strong [&_.auto-link]:underline [&_.auto-link]:decoration-dotted [&_.auto-link]:cursor-pointer"
                  dangerouslySetInnerHTML={{ __html: linkify(f.answer, null, data.glossary, data.pages) }}
                />
                {visible && page && (
                  <Link href={`/pages/${page.id}`} className="inline-flex items-center gap-1.5 text-[0.8rem] text-accent-strong hover:underline mt-2.5">
                    {page.title}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
