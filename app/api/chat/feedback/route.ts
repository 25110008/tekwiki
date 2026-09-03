import { NextResponse } from "next/server";
import { recordChatFeedback } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { question: string; answer: string; rating: "up" | "down"; user: User };

  if (!body.question?.trim() || !body.answer?.trim() || (body.rating !== "up" && body.rating !== "down") || !body.user?.id) {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }

  await recordChatFeedback({ question: body.question, answer: body.answer, rating: body.rating, userId: body.user.id });
  return NextResponse.json({ ok: true });
}
