import { NextResponse } from "next/server";
import { deleteAttachment, downloadAttachment, getAttachment } from "@/lib/server/repo";
import { canView } from "@/lib/wiki";
import type { User } from "@/lib/types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userRaw = searchParams.get("user");
  const user = userRaw ? (JSON.parse(userRaw) as User) : null;

  const attachment = await getAttachment(id);
  if (!attachment) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }
  if (attachment.page && !canView(attachment.page, user)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const { bytes, mimeType } = await downloadAttachment(attachment.driveFileId);
  return new NextResponse(bytes as BodyInit, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteAttachment(id);
  return NextResponse.json({ ok: true });
}
