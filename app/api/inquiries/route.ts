import { NextResponse } from "next/server";
import { createInquiry } from "@/lib/server/repo";

export async function POST(request: Request) {
  const body = (await request.json()) as { type: string; subject: string; body: string; authorId: string; authorName: string };
  await createInquiry(body);
  return NextResponse.json({ ok: true });
}
