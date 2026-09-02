import { NextResponse } from "next/server";
import { importPage } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const { categoryId, title, body, user } = (await request.json()) as {
    categoryId: string;
    title: string;
    body: string;
    user: User;
  };

  const pageId = await importPage({ categoryId, title, body }, user);
  return NextResponse.json({ ok: true, pageId });
}
