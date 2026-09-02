import { NextResponse } from "next/server";
import { approveApproval, rejectApproval } from "@/lib/server/repo";
import type { User } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, reviewer } = (await request.json()) as { action: "approve" | "reject"; reviewer: User };

  if (action === "approve") {
    await approveApproval(id, reviewer);
  } else {
    await rejectApproval(id);
  }

  return NextResponse.json({ ok: true });
}
