// HTML文字列から本文を抽出する共通処理。
// Webページ取り込み(URL指定)と、保存済みHTMLファイルのアップロード取り込みの両方から使う。
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractArticle(html: string, fallbackTitle: string): { title: string; body: string } | null {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();

  if (!article || !article.textContent?.trim()) return null;

  const title = article.title || fallbackTitle;
  const body = htmlToPlainText(article.content ?? article.textContent);
  return { title, body };
}
