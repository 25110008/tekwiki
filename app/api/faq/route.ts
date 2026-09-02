import { NextResponse } from "next/server";
import { createFaq } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const { question, answer, pageId, user } = (await request.json()) as {
    question: string;
    answer: string;
    pageId?: string | null;
    user: User;
  };

  if (user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "権限がありません" }, { status: 403 });
  }

  const faq = await createFaq({ question, answer, pageId });
  return NextResponse.json({ ok: true, faq });
}
