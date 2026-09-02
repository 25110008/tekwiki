"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { catLabel } from "@/lib/wiki";
import { approveApprovalApi, rejectApprovalApi } from "@/lib/client-api";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function approve(id: string) {
    if (!user) return;
    setBusyId(id);
    await approveApprovalApi(id, user);
    await refresh();
    setBusyId(null);
  }

  async function reject(id: string) {
    setBusyId(id);
    await rejectApprovalApi(id);
    await refresh();
    setBusyId(null);
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-5">承認待ち一覧</h2>

      {data.approvals.length === 0 ? (
        <div className="text-ink-faint text-sm text-center py-8">現在、承認待ちの変更はありません</div>
      ) : (
        <div className="flex flex-col gap-4">
          {data.approvals.map((item) => (
            <div key={item.id} className="border border-border rounded-m p-4 bg-surface-1">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-ink-faint text-[0.78rem] mt-1">
                    {catLabel(item.categoryId, data.categories)} ・ {item.author} が編集 ・ {item.submittedAt}
                    {item.pageId && (
                      <>
                        {" "}
                        ・ <Link href={`/pages/${item.pageId}`} className="text-accent-strong hover:underline">現在の内容を見る</Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="bg-surface-2 border border-border rounded-s p-3 text-[0.82rem] text-ink-muted whitespace-pre-wrap max-h-40 overflow-y-auto">
                {item.newData.body.slice(0, 300)}
                {item.newData.body.length > 300 ? "..." : ""}
              </div>
              <div className="flex gap-2.5 mt-3">
                <button
                  onClick={() => approve(item.id)}
                  disabled={busyId === item.id}
                  className="bg-accent text-white rounded-s px-3.5 py-1.5 text-[0.82rem] font-medium hover:bg-accent-strong disabled:opacity-60"
                >
                  承認して公開
                </button>
                <button
                  onClick={() => reject(item.id)}
                  disabled={busyId === item.id}
                  className="border border-danger text-danger rounded-s px-3.5 py-1.5 text-[0.82rem] hover:bg-danger-soft disabled:opacity-60"
                >
                  差し戻す
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
