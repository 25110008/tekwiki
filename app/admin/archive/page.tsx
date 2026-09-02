"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { catLabel } from "@/lib/wiki";
import { deletePageApi, setPageArchivedApi } from "@/lib/client-api";

export default function ArchivePage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  if (user.role !== "admin") {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">この画面は管理者のみ閲覧できます</div>
      </AppShell>
    );
  }

  const archived = data.pages.filter((p) => p.archived);

  async function unarchive(id: string) {
    if (!user) return;
    setBusyId(id);
    await setPageArchivedApi(id, false, user);
    await refresh();
    setBusyId(null);
  }

  async function deleteForever(id: string) {
    if (!user) return;
    setBusyId(id);
    await deletePageApi(id, user);
    await refresh();
    setBusyId(null);
    setConfirmingId(null);
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-5">アーカイブ済みのページ</h2>

      {archived.length === 0 ? (
        <div className="text-ink-faint text-sm text-center py-8">アーカイブされているページはありません</div>
      ) : (
        <div className="flex flex-col gap-4">
          {archived.map((p) => (
            <div key={p.id} className="border border-border rounded-m p-4 bg-surface-1">
              <div className="mb-3">
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-ink-faint text-[0.78rem] mt-1">
                  {catLabel(p.categoryId, data.categories)} ・ {p.updatedBy}
                </p>
              </div>
              {confirmingId === p.id ? (
                <div className="flex flex-wrap items-center gap-2.5 bg-danger-soft border border-danger rounded-s px-3.5 py-2.5">
                  <span className="text-danger text-[0.82rem]">完全に削除すると元に戻せません。本当によろしいですか？</span>
                  <button
                    onClick={() => deleteForever(p.id)}
                    disabled={busyId === p.id}
                    className="bg-danger text-white rounded-s px-3 py-1.5 text-[0.8rem] font-medium disabled:opacity-60"
                  >
                    完全に削除する
                  </button>
                  <button onClick={() => setConfirmingId(null)} className="border border-border rounded-s px-3 py-1.5 text-[0.8rem] hover:bg-surface-2 bg-surface-1">
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => unarchive(p.id)}
                    disabled={busyId === p.id}
                    className="border border-border rounded-s px-3.5 py-1.5 text-[0.82rem] hover:bg-surface-2 disabled:opacity-60"
                  >
                    アーカイブを解除
                  </button>
                  <button
                    onClick={() => setConfirmingId(p.id)}
                    disabled={busyId === p.id}
                    className="border border-danger text-danger rounded-s px-3.5 py-1.5 text-[0.82rem] hover:bg-danger-soft disabled:opacity-60"
                  >
                    完全に削除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
