import { NextResponse } from "next/server";
import { excerpt, findRelevantPage } from "@/lib/chat";
import { getAllData, getPageEmbeddings } from "@/lib/server/repo";
import { cosineSimilarity, embedText } from "@/lib/server/embeddings";
import { runChatCompletion } from "@/lib/server/workers-ai";
import type { Page } from "@/lib/types";

const SIMILARITY_THRESHOLD = 0.45;

async function findBySemanticSearch(question: string, pages: Page[]): Promise<Page | undefined> {
  const embeddings = await getPageEmbeddings();
  if (embeddings.length === 0) return undefined;

  const questionVector = await embedText(question);
  let best: { pageId: string; score: number } | null = null;
  for (const e of embeddings) {
    const score = cosineSimilarity(questionVector, e.vector);
    if (!best || score > best.score) best = { pageId: e.pageId, score };
  }
  if (!best || best.score < SIMILARITY_THRESHOLD) return undefined;
  return pages.find((p) => p.id === best!.pageId && !p.private && !p.archived);
}

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question: string };
  const q = (question || "").trim();
  if (!q) {
    return NextResponse.json({ text: "質問を入力してください。", denied: false, cites: [] });
  }

  const { pages, glossary } = await getAllData();

  let match: Page | undefined;
  try {
    match = await findBySemanticSearch(q, pages);
  } catch (err) {
    console.error("意味検索に失敗しました。キーワード検索にフォールバックします", err);
  }

  // 意味検索でヒットしなかった場合、キーワード一致で探す(非公開ページの案内メッセージを
  // 出すためにも使う。非公開ページはそもそも埋め込みを持たないため意味検索ではヒットしない)。
  if (!match) {
    match = findRelevantPage(q, pages, glossary);
  }

  if (!match) {
    return NextResponse.json({ text: "関連する情報が見つかりませんでした。別のキーワードで質問してみてください。", denied: false, cites: [] });
  }

  if (match.archived) {
    return NextResponse.json({ text: "該当するページは現在アーカイブされており、参照できません。", denied: false, cites: [] });
  }

  if (match.private) {
    return NextResponse.json({
      text: "該当する情報は非公開ページに含まれています。AIチャットは全社公開ページのみを対象としているため、この内容には回答できません。ページを直接ご確認ください。",
      denied: true,
      cites: [],
    });
  }

  try {
    const answer = await runChatCompletion([
      {
        role: "system",
        content:
          "あなたは社内Wiki「テクWiki」のアシスタントです。以下に与えられた社内ページの内容だけを根拠にして、日本語で簡潔に(3文程度まで)質問に答えてください。与えられた内容に答えがない場合は、正直に「ページの内容からは分かりませんでした」と答えてください。憶測で答えを作らないでください。",
      },
      {
        role: "user",
        content: `# 参照ページ「${match.title}」の内容\n${excerpt(match.body)}\n\n# 質問\n${q}`,
      },
    ]);
    return NextResponse.json({ text: answer, denied: false, cites: [{ id: match.id, title: match.title }] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      text: `AIの応答生成に失敗しました。関連しそうなページ「${match.title}」を直接ご確認ください。`,
      denied: false,
      cites: [{ id: match.id, title: match.title }],
    });
  }
}
