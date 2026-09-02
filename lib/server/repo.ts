// Googleスプレッドシートを実データとして扱うデータアクセス層。
// サーバー専用(APIルートからのみ呼び出すこと)。
import { appendRow, deleteRowById, deleteRowsWhere, readSheet, readSheetsBatch, updateRowById } from "./sheets";
import { deleteFile, downloadFile, uploadFile } from "./drive";
import { embedText } from "./embeddings";
import type {
  Approval,
  Category,
  FaqItem,
  GlossaryEntry,
  GuidelineSection,
  Inquiry,
  Page,
  Template,
  User,
} from "../types";

const bool = (v: string) => v.trim().toUpperCase() === "TRUE";
const nowIso = () => new Date().toISOString();

// 既存データ(スプレッドシート初期投入分)の日時表記と揃えるためのフォーマット。
// "YYYY-MM-DD HH:mm" で統一しておくことで、文字列比較のままでも新しい順に並び替えられる。
function jstLabel(): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

type Row = Record<string, string>;

function parseCategories(rows: Row[]): Category[] {
  return rows.map((r) => ({ id: r.id, label: r.label, requiresApproval: bool(r.requiresApproval) }));
}

function parseUsers(rows: Row[]): User[] {
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, department: r.department, role: r.role as User["role"] }));
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  if (n >= 1024) return `${Math.round(n / 1024)}KB`;
  return `${n}B`;
}

function parsePages(pageRows: Row[], attachmentRows: Row[], historyRows: Row[]): Page[] {
  return pageRows.map((r) => {
    const attachments = attachmentRows
      .filter((a) => a.pageId === r.id)
      .map((a) => ({ id: a.id, name: a.fileName, size: formatBytes(Number(a.sizeBytes) || 0) }));
    const history = historyRows
      .filter((h) => h.pageId === r.id)
      .map((h) => ({ who: h.editedBy, when: h.editedAt, what: h.summary }))
      .sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0)); // 新しい順

    return {
      id: r.id,
      categoryId: r.categoryId,
      parentId: r.parentId || null,
      title: r.title,
      tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
      private: bool(r.private),
      body: r.body,
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
      archived: bool(r.archived),
      attachments,
      history,
    } satisfies Page;
  });
}

function parseGlossary(rows: Row[]): GlossaryEntry[] {
  return rows.map((r) => ({ term: r.term, pageId: r.pageId }));
}

function parseTemplates(rows: Row[]): Template[] {
  return rows.map((r) => ({ id: r.id, label: r.label, hint: r.hint, titleTemplate: r.titleTemplate, bodyTemplate: r.bodyTemplate }));
}

function parseFaqs(rows: Row[]): FaqItem[] {
  return rows
    .slice()
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((r) => ({ id: r.id, question: r.question, answer: r.answer, pageId: r.pageId || null }));
}

function parseGuidelines(rows: Row[]): GuidelineSection[] {
  return rows
    .slice()
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((r) => ({ id: r.id, title: r.title, body: r.body }));
}

function parseApprovals(rows: Row[]): Approval[] {
  return rows
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      pageId: r.pageId || null,
      title: r.title,
      categoryId: r.categoryId,
      author: r.author,
      submittedAt: r.submittedAt,
      status: r.status as Approval["status"],
      newData: JSON.parse(r.newDataJson),
    }));
}

function parseInquiries(rows: Row[]): Inquiry[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type as Inquiry["type"],
    subject: r.subject,
    body: r.body,
    authorId: r.authorId,
    authorName: r.authorName,
    status: r.status as Inquiry["status"],
    createdAt: r.createdAt,
  }));
}

export interface AllData {
  categories: Category[];
  users: User[];
  pages: Page[];
  glossary: GlossaryEntry[];
  templates: Template[];
  faqs: FaqItem[];
  guidelines: GuidelineSection[];
  approvals: Approval[];
  inquiries: Inquiry[];
}

const ALL_SHEETS = ["Categories", "Users", "Pages", "Attachments", "History", "Glossary", "Templates", "FAQ", "Guidelines", "Approvals", "Inquiries"];

// 画面表示に必要な全シートを1回のAPI呼び出しでまとめて取得する(読み取りクォータ対策)。
export async function getAllData(): Promise<AllData> {
  const sheets = await readSheetsBatch(ALL_SHEETS);
  return {
    categories: parseCategories(sheets.Categories),
    users: parseUsers(sheets.Users),
    pages: parsePages(sheets.Pages, sheets.Attachments, sheets.History),
    glossary: parseGlossary(sheets.Glossary),
    templates: parseTemplates(sheets.Templates),
    faqs: parseFaqs(sheets.FAQ),
    guidelines: parseGuidelines(sheets.Guidelines),
    approvals: parseApprovals(sheets.Approvals),
    inquiries: parseInquiries(sheets.Inquiries),
  };
}

export async function getCategories(): Promise<Category[]> {
  const rows = await readSheet("Categories");
  return parseCategories(rows);
}

export async function requiresApproval(categoryId: string): Promise<boolean> {
  const cats = await getCategories();
  return cats.find((c) => c.id === categoryId)?.requiresApproval ?? true;
}

export async function getUsers(): Promise<User[]> {
  const rows = await readSheet("Users");
  return parseUsers(rows);
}

export async function getPages(): Promise<Page[]> {
  const [pageRows, attachmentRows, historyRows] = await Promise.all([
    readSheet("Pages"),
    readSheet("Attachments"),
    readSheet("History"),
  ]);
  return parsePages(pageRows, attachmentRows, historyRows);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export interface SubmitPageInput {
  pageId: string | null;
  categoryId: string;
  parentId: string | null;
  title: string;
  tags: string[];
  private: boolean;
  body: string;
}

export type SubmitResult = { status: "published"; pageId: string } | { status: "pending" };

async function nextId(sheetName: string, prefix: string): Promise<string> {
  const rows = await readSheet(sheetName);
  return `${prefix}${rows.length + 1}`;
}

// AIチャットの検索用に、公開ページの埋め込みベクトルを最新化する。
// 失敗してもページ保存自体は失敗させない(検索精度が落ちるだけなので致命的ではない)。
async function upsertPageEmbedding(pageId: string, body: string): Promise<void> {
  try {
    const vector = await embedText(body);
    const patch = { pageId, vectorJson: JSON.stringify(vector), updatedAt: jstLabel() };
    const updated = await updateRowById("PageEmbeddings", "pageId", pageId, patch);
    if (!updated) await appendRow("PageEmbeddings", patch);
  } catch (err) {
    console.error("埋め込みの更新に失敗しました", err);
  }
}

export async function getPageEmbeddings(): Promise<{ pageId: string; vector: number[] }[]> {
  const rows = await readSheet("PageEmbeddings");
  return rows
    .filter((r) => r.vectorJson)
    .map((r) => {
      try {
        return { pageId: r.pageId, vector: JSON.parse(r.vectorJson) as number[] };
      } catch {
        return null;
      }
    })
    .filter((r): r is { pageId: string; vector: number[] } => r !== null);
}

async function removePageEmbedding(pageId: string): Promise<void> {
  await deleteRowById("PageEmbeddings", "pageId", pageId).catch(() => {});
}

async function syncPageEmbedding(pageId: string, isPrivate: boolean, isArchived: boolean, body: string): Promise<void> {
  if (isPrivate || isArchived) {
    await removePageEmbedding(pageId);
  } else {
    await upsertPageEmbedding(pageId, body);
  }
}

export async function submitPage(input: SubmitPageInput, user: User): Promise<SubmitResult> {
  const title = input.title.trim() || "無題のページ";
  const needsApproval = await requiresApproval(input.categoryId);

  if (needsApproval) {
    const id = await nextId("Approvals", "ap");
    await appendRow("Approvals", {
      id,
      pageId: input.pageId ?? "",
      title,
      categoryId: input.categoryId,
      author: user.name,
      submittedAt: jstLabel(),
      status: "pending",
      newDataJson: JSON.stringify({
        title,
        body: input.body,
        categoryId: input.categoryId,
        private: input.private,
        tags: input.tags,
        parentId: input.parentId,
      }),
    });
    return { status: "pending" };
  }

  if (input.pageId) {
    await updateRowById("Pages", "id", input.pageId, {
      title,
      body: input.body,
      categoryId: input.categoryId,
      private: input.private ? "TRUE" : "FALSE",
      tags: input.tags.join(","),
      updatedBy: user.name,
      updatedAt: jstLabel(),
    });
    await appendRow("History", {
      id: await nextId("History", "h"),
      pageId: input.pageId,
      editedBy: user.name,
      editedAt: jstLabel(),
      summary: "内容を更新",
      bodySnapshot: input.body,
    });
    await syncPageEmbedding(input.pageId, input.private, false, input.body);
    return { status: "published", pageId: input.pageId };
  }

  const id = await nextId("Pages", "p");
  await appendRow("Pages", {
    id,
    categoryId: input.categoryId,
    parentId: input.parentId ?? "",
    title,
    tags: input.tags.join(","),
    private: input.private ? "TRUE" : "FALSE",
    body: input.body,
    updatedBy: user.name,
    updatedAt: jstLabel(),
    archived: "FALSE",
    createdAt: nowIso(),
  });
  await appendRow("History", {
    id: await nextId("History", "h"),
    pageId: id,
    editedBy: user.name,
    editedAt: jstLabel(),
    summary: "初版作成",
    bodySnapshot: input.body,
  });
  await syncPageEmbedding(id, input.private, false, input.body);
  return { status: "published", pageId: id };
}

export async function approveApproval(approvalId: string, reviewer: User): Promise<void> {
  const rows = await readSheet("Approvals");
  const item = rows.find((r) => r.id === approvalId && r.status === "pending");
  if (!item) return;
  const newData = JSON.parse(item.newDataJson) as {
    title: string;
    body: string;
    categoryId: string;
    private: boolean;
    tags: string[];
    parentId: string | null;
  };

  if (item.pageId) {
    await updateRowById("Pages", "id", item.pageId, {
      title: newData.title,
      body: newData.body,
      categoryId: newData.categoryId,
      private: newData.private ? "TRUE" : "FALSE",
      tags: newData.tags.join(","),
      updatedBy: item.author,
      updatedAt: jstLabel(),
    });
    await appendRow("History", {
      id: await nextId("History", "h"),
      pageId: item.pageId,
      editedBy: item.author,
      editedAt: jstLabel(),
      summary: `内容を更新（承認済み・承認者: ${reviewer.name}）`,
      bodySnapshot: newData.body,
    });
    await syncPageEmbedding(item.pageId, newData.private, false, newData.body);
  } else {
    const id = await nextId("Pages", "p");
    await appendRow("Pages", {
      id,
      categoryId: newData.categoryId,
      parentId: newData.parentId ?? "",
      title: newData.title,
      tags: newData.tags.join(","),
      private: newData.private ? "TRUE" : "FALSE",
      body: newData.body,
      updatedBy: item.author,
      updatedAt: jstLabel(),
      archived: "FALSE",
      createdAt: nowIso(),
    });
    await appendRow("History", {
      id: await nextId("History", "h"),
      pageId: id,
      editedBy: item.author,
      editedAt: jstLabel(),
      summary: `初版作成（承認済み・承認者: ${reviewer.name}）`,
      bodySnapshot: newData.body,
    });
    await syncPageEmbedding(id, newData.private, false, newData.body);
  }
  await updateRowById("Approvals", "id", approvalId, { status: "approved" });
}

export async function rejectApproval(approvalId: string): Promise<void> {
  await deleteRowById("Approvals", "id", approvalId);
}

export async function createInquiry(input: { type: string; subject: string; body: string; authorId: string; authorName: string }): Promise<void> {
  await appendRow("Inquiries", {
    id: await nextId("Inquiries", "iq"),
    type: input.type,
    subject: input.subject,
    body: input.body,
    authorId: input.authorId,
    authorName: input.authorName,
    status: "open",
    createdAt: jstLabel(),
  });
}

export async function resolveInquiry(id: string): Promise<void> {
  await updateRowById("Inquiries", "id", id, { status: "resolved" });
}

export async function setPageArchived(pageId: string, archived: boolean): Promise<void> {
  await updateRowById("Pages", "id", pageId, { archived: archived ? "TRUE" : "FALSE" });
  const page = await getPageById(pageId);
  if (page) await syncPageEmbedding(pageId, page.private, archived, page.body);
}

export async function deletePage(pageId: string): Promise<void> {
  await deleteRowById("Pages", "id", pageId);
  await deleteRowsWhere("Attachments", "pageId", pageId);
  await deleteRowsWhere("History", "pageId", pageId);
  await removePageEmbedding(pageId);
}

export interface CreatedFromImport {
  categoryId: string;
  title: string;
  body: string;
}

export async function importPage(input: CreatedFromImport, user: User): Promise<string> {
  const id = await nextId("Pages", "p");
  await appendRow("Pages", {
    id,
    categoryId: input.categoryId,
    parentId: "",
    title: input.title,
    tags: "",
    private: "FALSE",
    body: input.body,
    updatedBy: user.name,
    updatedAt: jstLabel(),
    archived: "FALSE",
    createdAt: nowIso(),
  });
  await appendRow("History", {
    id: await nextId("History", "h"),
    pageId: id,
    editedBy: user.name,
    editedAt: jstLabel(),
    summary: "データインポートで作成",
    bodySnapshot: input.body,
  });
  await syncPageEmbedding(id, false, false, input.body);
  return id;
}

export interface AttachmentInfo {
  id: string;
  pageId: string;
  fileName: string;
  driveFileId: string;
  sizeBytes: number;
}

export async function addAttachment(pageId: string, fileName: string, mimeType: string, bytes: Uint8Array): Promise<AttachmentInfo> {
  const uploaded = await uploadFile(fileName, mimeType, bytes);
  const id = await nextId("Attachments", "att");
  await appendRow("Attachments", {
    id,
    pageId,
    fileName: uploaded.fileName,
    driveFileId: uploaded.driveFileId,
    sizeBytes: uploaded.sizeBytes,
    uploadedAt: jstLabel(),
  });
  return { id, pageId, fileName: uploaded.fileName, driveFileId: uploaded.driveFileId, sizeBytes: uploaded.sizeBytes };
}

export async function getAttachment(attachmentId: string): Promise<(AttachmentInfo & { page?: Page }) | undefined> {
  const rows = await readSheet("Attachments");
  const row = rows.find((r) => r.id === attachmentId);
  if (!row) return undefined;
  const page = await getPageById(row.pageId);
  return {
    id: row.id,
    pageId: row.pageId,
    fileName: row.fileName,
    driveFileId: row.driveFileId,
    sizeBytes: Number(row.sizeBytes) || 0,
    page,
  };
}

export async function downloadAttachment(driveFileId: string) {
  return downloadFile(driveFileId);
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const rows = await readSheet("Attachments");
  const row = rows.find((r) => r.id === attachmentId);
  if (!row) return;
  await deleteFile(row.driveFileId).catch(() => {});
  await deleteRowById("Attachments", "id", attachmentId);
}

export async function getPageById(id: string): Promise<Page | undefined> {
  const pages = await getPages();
  return pages.find((p) => p.id === id);
}
