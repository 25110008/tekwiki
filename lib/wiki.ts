import { CATEGORIES, GLOSSARY, PAGES } from "./mock-data";
import type { Page, User } from "./types";

export function catLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function canView(page: Page, user: User | null): boolean {
  if (!page.private) return true;
  if (!user) return false;
  if (user.role === "admin") return true;
  return page.categoryId === user.department;
}

export function getChildren(pageId: string, user: User | null): Page[] {
  return PAGES.filter((p) => p.parentId === pageId && !p.archived && canView(p, user));
}

export function getBacklinks(pageId: string, user: User | null): Page[] {
  const seen = new Set<string>();
  const result: Page[] = [];
  for (const p of PAGES) {
    if (p.id === pageId || p.archived || !canView(p, user)) continue;
    const hit = GLOSSARY.some((g) => g.pageId === pageId && p.body.includes(g.term));
    if (hit && !seen.has(p.id)) {
      seen.add(p.id);
      result.push(p);
    }
  }
  return result;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function applyGlossaryLinks(escapedText: string, excludePageId: string | null): string {
  const terms = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length);
  let result = escapedText;
  for (const g of terms) {
    if (g.pageId === excludePageId) continue;
    if (!PAGES.some((p) => p.id === g.pageId)) continue;
    const re = new RegExp(g.term, "g");
    result = result.replace(re, `<span class="auto-link" data-page-id="${g.pageId}">${g.term}</span>`);
  }
  return result;
}

export function linkify(text: string, excludePageId: string | null): string {
  return applyGlossaryLinks(esc(text), excludePageId);
}

/**
 * 自前のMarkdownレンダラー。見出し/太字/箇条書き/インラインコード/コードブロック/表
 * ＋自動キーワードリンクに対応する(プロトタイプで検証済みのロジックを移植)。
 */
export function renderMarkdown(text: string, pageId: string | null): string {
  const BLK = "@@BLK";
  const INL = "@@INL";
  const blocks: string[] = [];
  const stash = (html: string) => {
    blocks.push(html);
    return `\n\n${BLK}${blocks.length - 1}@@\n\n`;
  };

  let src = esc(text);

  src = src.replace(/```([\s\S]*?)```/g, (_, code: string) =>
    stash(`<pre class="code-block"><code>${code.replace(/^\n/, "")}</code></pre>`)
  );

  const inline: string[] = [];
  src = src.replace(/`([^`\n]+)`/g, (_, code: string) => {
    inline.push(`<code>${code}</code>`);
    return `${INL}${inline.length - 1}@@`;
  });

  src = src.replace(
    /(^\|.+\|[ \t]*\n\|[ \t]*[-:]+[-| \t:]*\|[ \t]*\n(?:\|.*\|[ \t]*\n?)+)/gm,
    (block: string) => {
      const rows = block.trim().split("\n");
      const header = rows[0].split("|").slice(1, -1).map((c) => c.trim());
      const bodyRows = rows.slice(2).map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      const thead = `<tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr>`;
      const tbody = bodyRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      return stash(`<div class="md-table-wrap"><table class="md-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`);
    }
  );

  src = src.replace(/^### (.+)$/gm, (_, t: string) => stash(`<h4 class="md-h">${t}</h4>`));
  src = src.replace(/^## (.+)$/gm, (_, t: string) => stash(`<h3 class="md-h">${t}</h3>`));
  src = src.replace(/^# (.+)$/gm, (_, t: string) => stash(`<h2 class="md-h">${t}</h2>`));

  src = src.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

  src = src.replace(/(^[-*] .+(\n[-*] .+)*)/gm, (block: string) => {
    const items = block.split("\n").map((l) => l.replace(/^[-*] /, ""));
    return stash(`<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  });

  src = applyGlossaryLinks(src, pageId);

  const blkRe = new RegExp(`^${BLK}\\d+@@$`);
  let html = src
    .split(/\n{2,}/)
    .filter((c) => c.trim() !== "")
    .map((chunk) => {
      const lines = chunk.split("\n");
      const allBlocks = lines.every((l) => blkRe.test(l.trim()));
      if (allBlocks) return lines.join("");
      return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  html = html.replace(new RegExp(`${BLK}(\\d+)@@`, "g"), (_, i: string) => blocks[Number(i)]);
  html = html.replace(new RegExp(`${INL}(\\d+)@@`, "g"), (_, i: string) => inline[Number(i)]);

  return html;
}
