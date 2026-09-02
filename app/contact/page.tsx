"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { createInquiryApi } from "@/lib/client-api";
import type { InquiryType } from "@/lib/types";

const TYPE_LABEL: Record<InquiryType, string> = {
  question: "使い方の質問",
  bug: "不具合の報告",
  request: "機能の要望",
  other: "その他",
};

export default function ContactPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [type, setType] = useState<InquiryType>("question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  const mine = data.inquiries.filter((i) => i.authorId === user.id).slice().reverse();

  async function handleSend() {
    if (!user || !subject.trim() || !body.trim() || sending) return;
    setSending(true);
    await createInquiryApi({ type, subject: subject.trim(), body: body.trim(), authorId: user.id, authorName: user.name });
    await refresh();
    setSubject("");
    setBody("");
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-1.5">お問い合わせ</h2>
      <p className="text-ink-faint text-[0.85rem] mb-6 max-w-[60ch]">
        Wikiの使い方や不具合、機能の要望などを管理者に直接送ることができます。よくある質問で解決しない場合はこちらからどうぞ。
      </p>

      {sent && <div className="bg-accent-soft text-accent-strong border border-accent rounded-s px-4 py-2.5 text-sm mb-5 max-w-[560px]">送信しました</div>}

      <div className="flex flex-col gap-4 max-w-[560px] mb-8">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">種類</span>
          <select value={type} onChange={(e) => setType(e.target.value as InquiryType)} className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1">
            {Object.entries(TYPE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">件名</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例：タグの絞り込みがうまく動かない"
            className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">内容</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="状況をできるだけ詳しく教えてください"
            className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1"
          />
        </label>
        <div>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="bg-accent text-white rounded-s px-4 py-2 text-sm font-medium hover:bg-accent-strong disabled:opacity-60"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
        </div>
      </div>

      {mine.length > 0 && (
        <>
          <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-3">送信済みの問い合わせ</div>
          <div className="flex flex-col gap-2.5 max-w-[68ch]">
            {mine.map((i) => (
              <div key={i.id} className="flex justify-between gap-4 p-4 border border-border rounded-m bg-surface-1">
                <div>
                  <h3 className="text-[0.98rem] font-medium mb-1.5">{i.subject}</h3>
                  <span className="text-[0.74rem] px-2.5 py-0.5 rounded-full bg-surface-3 text-ink-muted border border-border">{TYPE_LABEL[i.type]}</span>
                </div>
                <div className="text-right shrink-0 text-[0.76rem] text-ink-faint">
                  {i.status === "resolved" ? <span className="text-accent-strong font-medium">対応済み</span> : <span>未対応</span>}
                  <br />
                  {i.createdAt}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
