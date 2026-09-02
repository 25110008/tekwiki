import { NextResponse } from "next/server";
import { deleteFaq, updateFaq } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { question, answer, pageId, user } = (await request.json()) as {
    question: string;
    answer: string;
    pageId?: string | null;
    user: User;
  };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await updateFaq(id, { question, answer, pageId });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = (await request.json()) as { user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await deleteFaq(id);
  return NextResponse.json({ ok: true });
}
