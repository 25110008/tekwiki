import { NextResponse } from "next/server";
import { deleteGuideline, updateGuideline } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, body, user } = (await request.json()) as { title: string; body: string; user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await updateGuideline(id, { title, body });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = (await request.json()) as { user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await deleteGuideline(id);
  return NextResponse.json({ ok: true });
}
