import { NextResponse } from "next/server";
import { extractArticle } from "@/lib/server/article-extract";

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
    const article = extractArticle(html, parsed.hostname);
    if (!article) {
      return NextResponse.json({ error: "本文を抽出できませんでした" }, { status: 422 });
    }
    return NextResponse.json(article);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ページの解析に失敗しました" }, { status: 500 });
  }
}
