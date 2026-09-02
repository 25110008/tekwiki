"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { createGuidelineApi, deleteGuidelineApi, updateGuidelineApi } from "@/lib/client-api";
import type { GuidelineSection } from "@/lib/types";

const EMPTY_FORM = { title: "", body: "" };

export default function AdminGuidelinesPage() {
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

  function startEdit(g: GuidelineSection) {
    setEditingId(g.id);
    setForm({ title: g.title, body: g.body });
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
    if (!form.title.trim() || !form.body.trim()) {
      setError("見出しと本文の両方を入力してください");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = { title: form.title.trim(), body: form.body.trim() };
      if (editingId) {
        await updateGuidelineApi(editingId, input, user);
      } else {
        await createGuidelineApi(input, user);
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
    if (!confirm("この項目を削除しますか？")) return;
    setBusy(true);
    try {
      await deleteGuidelineApi(id, user);
      await refresh();
      if (editingId === id) cancelEdit();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-1.5">編集ガイドラインの編集</h2>
      <p className="text-ink-faint text-[0.85rem] mb-6 max-w-[60ch]">
        ここで追加・編集した内容は、すぐに「編集ガイドライン」ページに反映されます。
      </p>

      <form onSubmit={handleSubmit} className="border border-border rounded-m p-4 bg-surface-1 mb-6 max-w-[68ch] flex flex-col gap-3">
        <div className="font-medium text-[0.9rem]">{editingId ? "項目を編集" : "新しい項目を追加"}</div>

        {error && <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2 text-[0.82rem]">{error}</div>}

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8rem] text-ink-muted">見出し</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="px-3 py-2 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none text-sm"
            placeholder="例：タイトルの付け方"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.8rem] text-ink-muted">本文</span>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={6}
            className="px-3 py-2 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none text-sm resize-y"
            placeholder="本文を入力してください"
          />
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

      {data.guidelines.length === 0 ? (
        <div className="text-ink-faint text-sm text-center py-8">登録されている項目はありません</div>
      ) : (
        <div className="flex flex-col gap-3.5 max-w-[68ch]">
          {data.guidelines.map((g) => (
            <div key={g.id} className="border border-border rounded-m p-4 bg-surface-1">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="font-medium">{g.title}</div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(g)} className="text-[0.78rem] text-accent-strong hover:underline">
                    編集
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="text-[0.78rem] text-danger hover:underline">
                    削除
                  </button>
                </div>
              </div>
              <div className="text-[0.88rem] text-ink-muted whitespace-pre-wrap">{g.body}</div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
