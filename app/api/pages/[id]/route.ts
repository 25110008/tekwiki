import { NextResponse } from "next/server";
import { deletePage, getPageById } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = (await request.json()) as { user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  const page = await getPageById(id);
  if (!page) {
    return NextResponse.json({ ok: false, error: "ページが見つかりません" }, { status: 404 });
  }
  if (!page.archived) {
    return NextResponse.json({ ok: false, error: "アーカイブされていないページは完全に削除できません" }, { status: 400 });
  }

  await deletePage(id);
  return NextResponse.json({ ok: true });
}
