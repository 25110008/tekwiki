import { NextResponse } from "next/server";
import { addAttachment } from "@/lib/server/repo";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pageId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "ファイルサイズは20MBまでです" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const attachment = await addAttachment(pageId, file.name, file.type || "application/octet-stream", bytes);
  return NextResponse.json({ attachment });
}
