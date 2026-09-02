import { NextResponse } from "next/server";
import { resolveInquiry } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = (await request.json()) as { user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await resolveInquiry(id);
  return NextResponse.json({ ok: true });
}
