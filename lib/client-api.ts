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

export async function setPageArchivedApi(pageId: string, archived: boolean, user: User): Promise<void> {
  const res = await fetch(`/api/pages/${pageId}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived, user }),
  });
  if (!res.ok) throw new Error("操作に失敗しました");
}

export async function deletePageApi(pageId: string, user: User): Promise<void> {
  const res = await fetch(`/api/pages/${pageId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("削除に失敗しました");
}

export async function createInquiryApi(input: { type: string; subject: string; body: string; authorId: string; authorName: string }): Promise<void> {
  const res = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("送信に失敗しました");
}

export async function resolveInquiryApi(id: string, user: User): Promise<void> {
  const res = await fetch(`/api/inquiries/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("操作に失敗しました");
}

export interface ChatAnswer {
  text: string;
  denied: boolean;
  cites: { id: string; title: string }[];
}

export async function askChatApi(question: string): Promise<ChatAnswer> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("AIチャットの応答取得に失敗しました");
  return res.json();
}

export async function importPageApi(input: { categoryId: string; title: string; body: string }, user: User): Promise<{ pageId: string }> {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  if (!res.ok) throw new Error("インポートに失敗しました");
  return res.json();
}
