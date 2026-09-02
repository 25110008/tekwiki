import { NextResponse } from "next/server";
import { excerpt, findRelevantPage } from "@/lib/chat";
import { getAllData } from "@/lib/server/repo";
import { runChatCompletion } from "@/lib/server/workers-ai";

export async function POST(request: Request) {
  const { question } = (await request.json()) as { question: string };
  const q = (question || "").trim();
  if (!q) {
    return NextResponse.json({ text: "質問を入力してください。", denied: false, cites: [] });
  }

  const { pages, glossary } = await getAllData();
  const match = findRelevantPage(q, pages, glossary);

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
