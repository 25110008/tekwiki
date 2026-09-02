import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

function splitTitleAndBody(fileName: string, content: string): { title: string; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    return { title: lines[0].slice(2).trim(), body: lines.slice(1).join("\n").trim() };
  }
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  return { title: nameWithoutExt, body: content.trim() };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();

  try {
    let text: string;
    if (ext === "pdf") {
      const pdf = await getDocumentProxy(buffer);
      const result = await extractText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      text = result.value;
    } else {
      return NextResponse.json({ error: "対応していないファイル形式です" }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "ファイルから文字を読み取れませんでした" }, { status: 422 });
    }

    return NextResponse.json(splitTitleAndBody(file.name, text));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ファイルの解析に失敗しました" }, { status: 500 });
  }
}
