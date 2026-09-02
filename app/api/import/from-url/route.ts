import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url: string };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URLの形式が正しくありません" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "http/https のURLのみ取り込めます" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TekWikiImportBot/1.0)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `ページの取得に失敗しました (${res.status})` }, { status: 502 });
    }
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "ページの取得に失敗しました。URLを確認してください" }, { status: 502 });
  }

  try {
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document).parse();

    if (!article || !article.textContent?.trim()) {
      return NextResponse.json({ error: "本文を抽出できませんでした" }, { status: 422 });
    }

    const title = article.title || parsed.hostname;
    const body = htmlToPlainText(article.content ?? article.textContent);

    return NextResponse.json({ title, body });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ページの解析に失敗しました" }, { status: 500 });
  }
}
