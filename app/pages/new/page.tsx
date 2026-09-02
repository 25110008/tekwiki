"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAppData } from "@/app/data-provider";
import { catLabel } from "@/lib/wiki";

export default function TemplatePick() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading } = useAppData();
  const cat = searchParams.get("cat") || "all";
  const parentId = searchParams.get("parent");
  const parent = parentId ? data.pages.find((p) => p.id === parentId) : null;

  function pick(templateId: string) {
    const params = new URLSearchParams({ cat, template: templateId });
    if (parentId) params.set("parent", parentId);
    router.push(`/pages/new/edit?${params.toString()}`);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[1.7rem] mb-1.5">テンプレートを選択</h2>
          <p className="text-ink-faint text-[0.82rem]">
            {parent ? `「${parent.title}」の子ページとして作成します` : `${catLabel(cat, data.categories)} に新規ページを作成します`}
          </p>
        </div>
        <button onClick={() => router.back()} className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2 shrink-0">
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {data.templates.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className="text-left border border-border rounded-m p-4 bg-surface-1 hover:border-accent hover:shadow-sm transition-colors"
          >
            <h3 className="font-medium mb-1">{t.label}</h3>
            <p className="text-ink-faint text-[0.82rem]">{t.hint}</p>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
