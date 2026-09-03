import { NextResponse } from "next/server";
import { submitPage } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    pageId: string | null;
    categoryId: string;
    parentId: string | null;
    title: string;
    tags: string[];
    private: boolean;
    body: string;
    user: User;
  };

  const result = await submitPage(
    {
      pageId: body.pageId,
      categoryId: body.categoryId,
      parentId: body.parentId,
      title: body.title,
      tags: body.tags,
      private: body.private,
      body: body.body,
    },
    body.user
  );

  if (result.status === "rejected") {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
