"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAppData } from "@/app/data-provider";
import { linkify } from "@/lib/wiki";

export default function GuidelinesPage() {
  const { data, loading } = useAppData();
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-page-id]");
    if (target) router.push(`/pages/${target.getAttribute("data-page-id")}`);
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-1.5">編集ガイドライン</h2>
      <p className="text-ink-faint text-[0.85rem] mb-6 max-w-[60ch]">ページを作成・編集する前に、一度目を通してください。</p>

      {loading ? (
        <div className="text-ink-faint text-sm text-center py-8">読み込み中...</div>
      ) : (
        <div className="flex flex-col gap-3.5 max-w-[68ch]">
          {data.guidelines.map((g) => (
            <div key={g.id} className="border border-border rounded-m p-4 bg-surface-1">
              <div className="font-medium mb-2">{g.title}</div>
              <div
                onClick={handleClick}
                className="text-[0.92rem] text-ink-muted leading-relaxed [&_.auto-link]:text-accent-strong [&_.auto-link]:underline [&_.auto-link]:decoration-dotted [&_.auto-link]:cursor-pointer [&_code]:font-code [&_code]:bg-surface-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
                dangerouslySetInnerHTML={{ __html: linkify(g.body, null, data.glossary, data.pages) }}
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
