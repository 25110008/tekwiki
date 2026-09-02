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

  // キーワード一致は常に確認する(非公開ページはそもそも埋め込みを持たないため意味検索では
  // ヒットしない。そのため、質問がキーワード的に非公開ページを指している場合は、意味検索が
  // 別の無関係な公開ページを拾っていたとしても、非公開である旨を優先して案内する)。
  const keywordMatch = findRelevantPage(q, pages, glossary);
  if ((keywordMatch?.private || keywordMatch?.archived) && keywordMatch.id !== match?.id) {
    match = keywordMatch;
  } else if (!match) {
    match = keywordMatch;
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
          "あなたは社内Wiki「テクWiki」のアシスタントです。以下に与えられた社内ページの内容を根拠にして、日本語で簡潔に(3文程度まで)質問に答えてください。" +
          "質問の言葉がページ内の表現と完全に一致していなくても、ページの内容から常識的に読み取れる範囲であれば、言い換えたり要点をまとめたりして積極的に回答してください。" +
          "例えば「休みながらお金が欲しい」という質問に対して、ページに有給休暇制度の説明があれば、それを根拠に案内して構いません。" +
          "一方で、ページのどこにも手がかりがなく無関係な質問である場合や、ページに書かれていない具体的な数値・条件・固有名詞を答えに使う必要がある場合は、正直に「ページの内容からは分かりませんでした」と答えてください。存在しない情報を作り上げないでください。",
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
