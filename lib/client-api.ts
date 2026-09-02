// クライアントから各APIルートを呼び出すためのヘルパー。
import type { DraftInput } from "./store";
import type { User } from "./types";

export type SubmitResult = { status: "published"; pageId: string } | { status: "pending" };

export async function submitPageApi(input: DraftInput, user: User): Promise<SubmitResult> {
  const res = await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  if (!res.ok) throw new Error("保存に失敗しました");
  return res.json();
}

export async function approveApprovalApi(id: string, reviewer: User): Promise<void> {
  const res = await fetch(`/api/approvals/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve", reviewer }),
  });
  if (!res.ok) throw new Error("承認に失敗しました");
}

export async function rejectApprovalApi(id: string): Promise<void> {
  const res = await fetch(`/api/approvals/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject" }),
  });
  if (!res.ok) throw new Error("差し戻しに失敗しました");
}
