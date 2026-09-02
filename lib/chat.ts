// AIチャットの暫定ロジック(Azure OpenAI連携前のプレースホルダー)。
// キーワード一致で全社公開ページを検索し、該当箇所を返す。非公開・アーカイブ済みページは対象外。
import { canView } from "./wiki";
import type { GlossaryEntry, Page, User } from "./types";

export interface ChatAnswer {
  text: string;
  denied: boolean;
  cites: { id: string; title: string }[];
}

function excerpt(body: string): string {
  const plain = body.replace(/```[\s\S]*?```/g, "").replace(/[#*`|]/g, "").trim();
  const firstPara = plain.split(/\n{2,}/)[0] || plain;
  return firstPara.length > 160 ? `${firstPara.slice(0, 160)}...` : firstPara;
}

export function answerQuestion(question: string, glossary: GlossaryEntry[], pages: Page[], user: User | null): ChatAnswer {
  const q = question.trim();

  const termHit = [...glossary].sort((a, b) => b.term.length - a.term.length).find((g) => q.includes(g.term));
  const page = termHit
    ? pages.find((p) => p.id === termHit.pageId)
    : pages.find((p) => p.title && q.includes(p.title)) ??
      pages.find((p) => p.tags.some((t) => q.includes(t)));

  if (!page) {
    return { text: "関連する情報が見つかりませんでした。別のキーワードで質問してみてください。", denied: false, cites: [] };
  }

  if (page.archived) {
    return { text: "該当するページは現在アーカイブされており、参照できません。", denied: false, cites: [] };
  }

  if (!canView(page, user) || page.private) {
    return {
      text: "該当する情報は非公開ページに含まれています。AIチャットは全社公開ページのみを対象としているため、この内容には回答できません。ページを直接ご確認ください。",
      denied: true,
      cites: [],
    };
  }

  return { text: excerpt(page.body), denied: false, cites: [{ id: page.id, title: page.title }] };
}

export const CHAT_SUGGESTIONS = ["経費精算のやり方を教えて", "有給休暇の申請ルールは？", "障害対応のフローを教えて"];
