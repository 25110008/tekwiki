"use client";

import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageEditor } from "@/components/PageEditor";
import { useAppData } from "@/app/data-provider";

export default function NewPageEdit() {
  const searchParams = useSearchParams();
  const { data, loading } = useAppData();
  const cat = searchParams.get("cat") || "all";
  const parentId = searchParams.get("parent");
  const templateId = searchParams.get("template");
  const template = templateId ? data.templates.find((t) => t.id === templateId) : null;

  if (loading) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageEditor
        pageId={null}
        parentId={parentId}
        initialCategoryId={cat}
        initialTitle={template?.titleTemplate ?? ""}
        initialBody={template?.bodyTemplate ?? ""}
      />
    </AppShell>
  );
}
