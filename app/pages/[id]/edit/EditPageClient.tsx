"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageEditor } from "@/components/PageEditor";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { canView } from "@/lib/wiki";

export default function EditPageClient() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading } = useAppData();
  const page = data.pages.find((p) => p.id === id);

  return (
    <AppShell>
      {loading ? (
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      ) : !page || !canView(page, user) ? (
        <div className="text-ink-faint text-sm text-center py-10">このページを編集する権限がありません</div>
      ) : (
        <PageEditor
          pageId={page.id}
          parentId={page.parentId}
          initialCategoryId={page.categoryId}
          initialTitle={page.title}
          initialBody={page.body}
          initialTags={page.tags}
          initialPrivate={page.private}
          initialAttachments={page.attachments}
        />
      )}
    </AppShell>
  );
}
