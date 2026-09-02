"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { createFaqApi, deleteFaqApi, updateFaqApi } from "@/lib/client-api";
import type { FaqItem } from "@/lib/types";

const EMPTY_FORM = { question: "", answer: "", pageId: "" };

export default function AdminFaqPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  function startEdit(faq: FaqItem) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer, pageId: faq.pageId ?? "" });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.question.trim() || !form.answer.trim()) {
      setError("質問と回答の両方を入力してください");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = { question: form.question.trim(), answer: form.answer.trim(), pageId: form.pageId || null };
      if (editingId) {
        await updateFaqApi(editingId, input, user);
      } else {
        await createFaqApi(input, user);
      }
      await refresh();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user) return;
    if (!confirm("この質問を削除しますか？")) return;
    setBusy(true);
    try {
      await deleteFaqApi(id, user);
      await refresh();
      if (editingId === id) cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-1.5">よくある質問の編集</h2>
      <p className="text-ink-faint text-[0.85rem] mb-6 max-w-[60ch]">
        ここで追加・編集した内容は、すぐに「よくある質問」ページに反映されます。
      </p>

      <form onSubmit={handleSubmit} className="border border-border rounded-m p-4 bg-surface-1 mb-6 max-w-[68ch] flex flex-col gap-3">
        <div className="font-medium text-[0.9rem]">{editingId ? "質問を編集" : "新しい質問を追加"}</div>

        {error && <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2 text-[0.82rem]">{error}</div>}

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8rem] text-ink-muted">質問</span>
          <input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            className="px-3 py-2 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none text-sm"
            placeholder="例：有給休暇はどうやって申請しますか？"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8rem] text-ink-muted">回答</span>
          <textarea
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            rows={4}
            className="px-3 py-2 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none text-sm resize-y"
            placeholder="回答内容を入力してください"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8rem] text-ink-muted">関連ページ（任意）</span>
          <select
            value={form.pageId}
            onChange={(e) => setForm((f) => ({ ...f, pageId: e.target.value }))}
            className="px-3 py-2 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none text-sm"
          >
            <option value="">なし</option>
            {data.pages
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </label>

        <div className="flex gap-2.5 mt-1">
          <button
            type="submit"
            disabled={busy}
            className="bg-accent text-white rounded-s px-3.5 py-1.5 text-[0.82rem] font-medium hover:bg-accent-strong disabled:opacity-60"
          >
            {editingId ? "更新する" : "追加する"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="border border-border rounded-s px-3.5 py-1.5 text-[0.82rem] hover:bg-surface-2"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>

      {data.faqs.length === 0 ? (
        <div className="text-ink-faint text-sm text-center py-8">登録されている質問はありません</div>
      ) : (
        <div className="flex flex-col gap-3.5 max-w-[68ch]">
          {data.faqs.map((f) => (
            <div key={f.id} className="border border-border rounded-m p-4 bg-surface-1">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="font-medium">Q. {f.question}</div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(f)} className="text-[0.78rem] text-accent-strong hover:underline">
                    編集
                  </button>
                  <button onClick={() => handleDelete(f.id)} className="text-[0.78rem] text-danger hover:underline">
                    削除
                  </button>
                </div>
              </div>
              <div className="text-[0.88rem] text-ink-muted whitespace-pre-wrap">{f.answer}</div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
