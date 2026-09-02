// AIチャットの検索(retrieval)ロジック。クライアント・サーバーどちらからも使う純粋関数。
import type { GlossaryEntry, Page } from "./types";

export function excerpt(body: string, maxLen = 1500): string {
  const plain = body.replace(/```[\s\S]*?```/g, "").replace(/[#*`|]/g, "").trim();
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}...` : plain;
}

// 質問文に最も関連しそうなページを1件探す(全ページが対象。公開範囲の判定は呼び出し側で行う)。
export function findRelevantPage(question: string, pages: Page[], glossary: GlossaryEntry[]): Page | undefined {
  const q = question.trim();
  if (!q) return undefined;

  const termHit = [...glossary].sort((a, b) => b.term.length - a.term.length).find((g) => q.includes(g.term));
  if (termHit) {
    const page = pages.find((p) => p.id === termHit.pageId);
    if (page) return page;
  }

  const byTitle = pages.find((p) => p.title && q.includes(p.title));
  if (byTitle) return byTitle;

  const byTag = pages.find((p) => p.tags.some((t) => q.includes(t)));
  if (byTag) return byTag;

  return undefined;
}

export const CHAT_SUGGESTIONS = ["経費精算のやり方を教えて", "有給休暇の申請ルールは？", "障害対応のフローを教えて"];
