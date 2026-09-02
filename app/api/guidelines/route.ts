import { NextResponse } from "next/server";
import { createGuideline } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const { title, body, user } = (await request.json()) as { title: string; body: string; user: User };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  const guideline = await createGuideline({ title, body });
  return NextResponse.json({ ok: true, guideline });
}
