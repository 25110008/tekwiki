import { NextResponse } from "next/server";
import { convertServerParsedFile } from "@/lib/server/import-convert";
import { fileExtension } from "@/lib/import-text";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  const ext = fileExtension(file.name);

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await convertServerParsedFile(file.name, ext, bytes);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "ファイルの解析に失敗しました";
    const status = message === "対応していないファイル形式です" ? 400 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
