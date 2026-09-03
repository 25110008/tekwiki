// クライアントから各APIルートを呼び出すためのヘルパー。
import type { DraftInput } from "./store";
import type { FaqItem, GuidelineSection, Role, User } from "./types";

export async function signupApi(input: { name: string; email: string; password: string }): Promise<{ ok: boolean; error?: string; user?: User }> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateUserApi(userId: string, patch: { department?: string; role?: Role }, user: User): Promise<void> {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...patch, user }),
  });
  if (!res.ok) throw new Error("更新に失敗しました");
}

export async function resetUserPasswordApi(userId: string, user: User): Promise<void> {
  const res = await fetch(`/api/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("リセットに失敗しました");
}

export type SubmitResult = { status: "published"; pageId: string } | { status: "pending" } | { status: "rejected"; error: string };

export async function submitPageApi(input: DraftInput, user: User): Promise<SubmitResult> {
  const res = await fetch("/api/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  const json = (await res.json().catch(() => null)) as SubmitResult | null;
  if (!json) throw new Error("保存に失敗しました");
  return json;
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

export interface Attachment {
  id: string;
  name: string;
  size: string;
}

export async function uploadAttachmentApi(pageId: string, file: File): Promise<{ id: string; fileName: string; sizeBytes: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/pages/${pageId}/attachments`, { method: "POST", body: formData });
  const json = (await res.json()) as { attachment?: { id: string; fileName: string; sizeBytes: number }; error?: string };
  if (!res.ok || json.error || !json.attachment) throw new Error(json.error ?? "アップロードに失敗しました");
  return json.attachment;
}

export function attachmentDownloadUrl(attachmentId: string, user: User): string {
  return `/api/attachments/${attachmentId}?user=${encodeURIComponent(JSON.stringify(user))}`;
}

export async function deleteAttachmentApi(attachmentId: string, user: User): Promise<void> {
  const res = await fetch(`/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("削除に失敗しました");
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

export async function sendChatFeedbackApi(question: string, answer: string, rating: "up" | "down", user: User): Promise<void> {
  const res = await fetch("/api/chat/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer, rating, user }),
  });
  if (!res.ok) throw new Error("フィードバックの送信に失敗しました");
}

export interface ZipImportResult {
  created: { fileName: string; pageId: string; title: string; type: "page" | "folder" }[];
  failed: { fileName: string; error: string }[];
}

export async function importZipApi(file: File, categoryId: string, user: User): Promise<ZipImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("categoryId", categoryId);
  formData.append("user", JSON.stringify(user));
  const res = await fetch("/api/import/zip", { method: "POST", body: formData });
  const json = (await res.json()) as ZipImportResult & { error?: string };
  if (!res.ok || json.error) throw new Error(json.error ?? "ZIPの取り込みに失敗しました");
  return json;
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

export async function createFaqApi(input: { question: string; answer: string; pageId?: string | null }, user: User): Promise<FaqItem> {
  const res = await fetch("/api/faq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  const json = (await res.json()) as { faq?: FaqItem; error?: string };
  if (!res.ok || !json.faq) throw new Error(json.error ?? "作成に失敗しました");
  return json.faq;
}

export async function updateFaqApi(id: string, input: { question: string; answer: string; pageId?: string | null }, user: User): Promise<void> {
  const res = await fetch(`/api/faq/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  if (!res.ok) throw new Error("更新に失敗しました");
}

export async function deleteFaqApi(id: string, user: User): Promise<void> {
  const res = await fetch(`/api/faq/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("削除に失敗しました");
}

export async function createGuidelineApi(input: { title: string; body: string }, user: User): Promise<GuidelineSection> {
  const res = await fetch("/api/guidelines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  const json = (await res.json()) as { guideline?: GuidelineSection; error?: string };
  if (!res.ok || !json.guideline) throw new Error(json.error ?? "作成に失敗しました");
  return json.guideline;
}

export async function updateGuidelineApi(id: string, input: { title: string; body: string }, user: User): Promise<void> {
  const res = await fetch(`/api/guidelines/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, user }),
  });
  if (!res.ok) throw new Error("更新に失敗しました");
}

export async function deleteGuidelineApi(id: string, user: User): Promise<void> {
  const res = await fetch(`/api/guidelines/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user }),
  });
  if (!res.ok) throw new Error("削除に失敗しました");
}
