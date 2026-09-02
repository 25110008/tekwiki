"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { resolveInquiryApi } from "@/lib/client-api";
import type { InquiryType } from "@/lib/types";

const TYPE_LABEL: Record<InquiryType, string> = {
  question: "使い方の質問",
  bug: "不具合の報告",
  request: "機能の要望",
  other: "その他",
};

export default function AdminInquiriesPage() {
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

  async function resolve(id: string) {
    if (!user) return;
    setBusyId(id);
    await resolveInquiryApi(id, user);
    await refresh();
    setBusyId(null);
  }

  const open = data.inquiries.filter((i) => i.status !== "resolved");
  const resolved = data.inquiries.filter((i) => i.status === "resolved");

  function Card({ i }: { i: (typeof data.inquiries)[number] }) {
    return (
      <div className="border border-border rounded-m p-4 bg-surface-1">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div>
            <h3 className="font-medium">{i.subject}</h3>
            <p className="text-ink-faint text-[0.78rem] mt-1">
              {TYPE_LABEL[i.type]} ・ {i.authorName} ・ {i.createdAt}
            </p>
          </div>
        </div>
        <div className="bg-surface-2 border border-border rounded-s p-3 text-[0.82rem] text-ink-muted whitespace-pre-wrap">{i.body}</div>
        {i.status !== "resolved" && (
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => resolve(i.id)}
              disabled={busyId === i.id}
              className="bg-accent text-white rounded-s px-3.5 py-1.5 text-[0.82rem] font-medium hover:bg-accent-strong disabled:opacity-60"
            >
              対応済みにする
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-5">お問い合わせ一覧</h2>

      {data.inquiries.length === 0 ? (
        <div className="text-ink-faint text-sm text-center py-8">現在、問い合わせはありません</div>
      ) : (
        <div className="flex flex-col gap-4">
          {open.length === 0 ? (
            <div className="text-ink-faint text-sm">未対応の問い合わせはありません</div>
          ) : (
            open.map((i) => <Card key={i.id} i={i} />)
          )}

          {resolved.length > 0 && (
            <>
              <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mt-4">対応済み</div>
              {resolved.map((i) => (
                <Card key={i.id} i={i} />
              ))}
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
