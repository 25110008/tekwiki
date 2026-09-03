import { NextResponse } from "next/server";
import { updateUser } from "@/lib/server/repo";
import type { Role, User } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { department, role, user } = (await request.json()) as { department?: string; role?: Role; user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  await updateUser(id, { department, role });
  return NextResponse.json({ ok: true });
}
