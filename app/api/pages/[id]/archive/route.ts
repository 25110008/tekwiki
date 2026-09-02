import { NextResponse } from "next/server";
import { setPageArchived } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { archived, user } = (await request.json()) as { archived: boolean; user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await setPageArchived(id, archived);
  return NextResponse.json({ ok: true });
}
