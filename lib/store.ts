// 編集中の下書きをブラウザに一時保存するためのヘルパー。
// ページ本体・承認の保存自体は lib/client-api.ts 経由でサーバーに送る。

export interface DraftInput {
  pageId: string | null;
  categoryId: string;
  parentId: string | null;
  title: string;
  tags: string[];
  private: boolean;
  body: string;
}

export function draftKey(pageId: string | null, categoryId: string, parentId: string | null): string {
  return `tekwiki:draft:${pageId ?? `new:${parentId || categoryId}`}`;
}

export function loadDraft(key: string): (DraftInput & { savedAt: string }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: DraftInput) {
  if (typeof window === "undefined") return;
  const savedAt = new Date().toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  window.localStorage.setItem(key, JSON.stringify({ ...draft, savedAt }));
}

export function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
