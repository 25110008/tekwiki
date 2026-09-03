// Cloudflare D1(SQLite)を実データとして扱うデータアクセス層。
// サーバー専用(APIルートからのみ呼び出すこと)。
import { getDb } from "./d1";
import { deleteAttachmentBytes, getAttachmentBytes, putAttachment } from "./attachments-store";
import { embedText } from "./embeddings";
import type {
  Approval,
  Category,
  FaqItem,
  GlossaryEntry,
  GuidelineSection,
  Inquiry,
  Page,
  Role,
  Template,
  User,
} from "../types";

const nowIso = () => new Date().toISOString();

// 既存データの日時表記と揃えるためのフォーマット。"YYYY-MM-DD HH:mm" で統一しておくことで、
// 文字列比較のままでも新しい順に並び替えられる。
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

// 既存のID命名(p1, u1, att1...)を踏襲した連番ID発行。低頻度の書き込みが前提のため、
// カウントによる採番の競合リスクは許容する(元のスプレッドシート版と同等)。
async function nextId(table: string, prefix: string): Promise<string> {
  const db = await getDb();
  const row = await db.prepare(`SELECT COUNT(*) as c FROM ${table}`).first<{ c: number }>();
  return `${prefix}${(row?.c ?? 0) + 1}`;
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  if (n >= 1024) return `${Math.round(n / 1024)}KB`;
  return `${n}B`;
}

interface PageRow {
  id: string;
  categoryId: string;
  parentId: string | null;
  title: string;
  tags: string;
  isPrivate: number;
  body: string;
  updatedBy: string;
  updatedAt: string;
  archived: number;
}
interface AttachmentRow {
  id: string;
  pageId: string;
  fileName: string;
  sizeBytes: number;
}
interface HistoryRow {
  pageId: string;
  editedBy: string;
  editedAt: string;
  summary: string;
}

function buildPages(pageRows: PageRow[], attachmentRows: AttachmentRow[], historyRows: HistoryRow[]): Page[] {
  return pageRows.map((r) => {
    const attachments = attachmentRows
      .filter((a) => a.pageId === r.id)
      .map((a) => ({ id: a.id, name: a.fileName, size: formatBytes(a.sizeBytes) }));
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
      private: !!r.isPrivate,
      body: r.body,
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
      archived: !!r.archived,
      attachments,
      history,
    } satisfies Page;
  });
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

export async function getAllData(): Promise<AllData> {
  const db = await getDb();
  const [categories, users, pages, attachments, history, glossary, templates, faqs, guidelines, approvals, inquiries] = await Promise.all([
    db.prepare(`SELECT id, label, requires_approval AS requiresApproval FROM categories`).all<{ id: string; label: string; requiresApproval: number }>(),
    db.prepare(`SELECT id, name, email, department, role FROM users`).all<User>(),
    db
      .prepare(
        `SELECT id, category_id AS categoryId, parent_id AS parentId, title, tags, is_private AS isPrivate, body, updated_by AS updatedBy, updated_at AS updatedAt, archived FROM pages`
      )
      .all<PageRow>(),
    db.prepare(`SELECT id, page_id AS pageId, file_name AS fileName, size_bytes AS sizeBytes FROM attachments`).all<AttachmentRow>(),
    db.prepare(`SELECT page_id AS pageId, edited_by AS editedBy, edited_at AS editedAt, summary FROM history`).all<HistoryRow>(),
    db.prepare(`SELECT term, page_id AS pageId FROM glossary`).all<GlossaryEntry>(),
    db.prepare(`SELECT id, label, hint, title_template AS titleTemplate, body_template AS bodyTemplate FROM templates`).all<Template>(),
    db
      .prepare(`SELECT id, question, answer, page_id AS pageId, sort_order AS sortOrder FROM faq ORDER BY sort_order`)
      .all<{ id: string; question: string; answer: string; pageId: string | null; sortOrder: number }>(),
    db.prepare(`SELECT id, title, body, sort_order AS sortOrder FROM guidelines ORDER BY sort_order`).all<GuidelineSection>(),
    db
      .prepare(
        `SELECT id, page_id AS pageId, title, category_id AS categoryId, author, submitted_at AS submittedAt, status, new_data_json AS newDataJson FROM approvals WHERE status = 'pending'`
      )
      .all<{ id: string; pageId: string | null; title: string; categoryId: string; author: string; submittedAt: string; status: string; newDataJson: string }>(),
    db
      .prepare(`SELECT id, type, subject, body, author_id AS authorId, author_name AS authorName, status, created_at AS createdAt FROM inquiries`)
      .all<Inquiry>(),
  ]);

  return {
    categories: categories.results.map((c) => ({ id: c.id, label: c.label, requiresApproval: !!c.requiresApproval })),
    users: users.results,
    pages: buildPages(pages.results, attachments.results, history.results),
    glossary: glossary.results,
    templates: templates.results,
    faqs: faqs.results.map((f) => ({ ...f, pageId: f.pageId || null })),
    guidelines: guidelines.results,
    approvals: approvals.results.map((a) => ({ ...a, pageId: a.pageId || null, status: a.status as Approval["status"], newData: JSON.parse(a.newDataJson) })),
    inquiries: inquiries.results,
  };
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  const { results } = await db.prepare(`SELECT id, label, requires_approval AS requiresApproval FROM categories`).all<{ id: string; label: string; requiresApproval: number }>();
  return results.map((c) => ({ id: c.id, label: c.label, requiresApproval: !!c.requiresApproval }));
}

export async function requiresApproval(categoryId: string): Promise<boolean> {
  const cats = await getCategories();
  return cats.find((c) => c.id === categoryId)?.requiresApproval ?? true;
}

export async function getUsers(): Promise<User[]> {
  const db = await getDb();
  const { results } = await db.prepare(`SELECT id, name, email, department, role FROM users`).all<User>();
  return results;
}

export async function getPages(): Promise<Page[]> {
  const db = await getDb();
  const [pages, attachments, history] = await Promise.all([
    db
      .prepare(
        `SELECT id, category_id AS categoryId, parent_id AS parentId, title, tags, is_private AS isPrivate, body, updated_by AS updatedBy, updated_at AS updatedAt, archived FROM pages`
      )
      .all<PageRow>(),
    db.prepare(`SELECT id, page_id AS pageId, file_name AS fileName, size_bytes AS sizeBytes FROM attachments`).all<AttachmentRow>(),
    db.prepare(`SELECT page_id AS pageId, edited_by AS editedBy, edited_at AS editedAt, summary FROM history`).all<HistoryRow>(),
  ]);
  return buildPages(pages.results, attachments.results, history.results);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  const row = await db.prepare(`SELECT id, name, email, department, role FROM users WHERE LOWER(email) = LOWER(?)`).bind(email).first<User>();
  return row ?? undefined;
}

// ログイン処理専用。パスワードハッシュ(秘密情報)を含む生の行を返す。
export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  department: string;
  role: string;
}
export async function getUserRowByEmail(email: string): Promise<UserRow | undefined> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT id, name, email, password_hash AS passwordHash, department, role FROM users WHERE LOWER(email) = LOWER(?)`)
    .bind(email)
    .first<UserRow>();
  return row ?? undefined;
}

export async function setUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).bind(passwordHash, userId).run();
}

// 新規登録。部署は必ず未割り当て("")で作成し、本人の自己申告では部署を確定させない
// (他部署の非公開ページを不正に閲覧できてしまうのを防ぐため)。管理者が後から割り当てる。
export async function createUser(input: { name: string; email: string; passwordHash: string }): Promise<User> {
  const db = await getDb();
  const id = await nextId("users", "u");
  await db
    .prepare(`INSERT INTO users (id, name, email, password_hash, department, role, created_at) VALUES (?, ?, ?, ?, '', 'member', ?)`)
    .bind(id, input.name, input.email, input.passwordHash, nowIso())
    .run();
  return { id, name: input.name, email: input.email, department: "", role: "member" };
}

export async function updateUser(userId: string, patch: { department?: string; role?: Role }): Promise<void> {
  const db = await getDb();
  if (patch.department !== undefined) {
    await db.prepare(`UPDATE users SET department = ? WHERE id = ?`).bind(patch.department, userId).run();
  }
  if (patch.role !== undefined) {
    await db.prepare(`UPDATE users SET role = ? WHERE id = ?`).bind(patch.role, userId).run();
  }
}

export async function resetUserPassword(userId: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE users SET password_hash = '' WHERE id = ?`).bind(userId).run();
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

export type SubmitResult = { status: "published"; pageId: string } | { status: "pending" } | { status: "rejected"; error: string };

export const MAX_PAGE_LEVEL = 2; // 0-indexed。0=最上位、1=子、2=孫(3階層まで許可)

interface ParentRow {
  parentId: string | null;
}

// ページのカテゴリ(所属)を変更した際、子孫ページのカテゴリも合わせて変更する。
// 子ページは作成時に親のカテゴリへ固定される仕様(PageEditorでカテゴリ選択欄が
// 「親ページに合わせて自動設定」になる)なので、親のカテゴリが後から変わった場合も
// 追従させないと、子ページだけ旧カテゴリに取り残されてしまう。
async function cascadeCategoryToDescendants(db: D1Database, pageId: string, categoryId: string): Promise<void> {
  const { results } = await db.prepare(`SELECT id FROM pages WHERE parent_id = ?`).bind(pageId).all<{ id: string }>();
  for (const child of results) {
    await db.prepare(`UPDATE pages SET category_id = ? WHERE id = ?`).bind(categoryId, child.id).run();
    await cascadeCategoryToDescendants(db, child.id, categoryId);
  }
}

async function getPageLevel(db: D1Database, pageId: string): Promise<number> {
  let level = 0;
  let current: string | null = pageId;
  while (current) {
    const stmt = db.prepare(`SELECT parent_id AS parentId FROM pages WHERE id = ?`).bind(current);
    const row: ParentRow | null = await stmt.first<ParentRow>();
    if (!row || !row.parentId) break;
    level++;
    current = row.parentId;
  }
  return level;
}

// AIチャットの検索用に、公開ページの埋め込みベクトルを最新化する。
// 失敗してもページ保存自体は失敗させない(検索精度が落ちるだけなので致命的ではない)。
async function upsertPageEmbedding(pageId: string, title: string, body: string): Promise<void> {
  try {
    // タイトルを含めて埋め込むことで、本文が短いページ同士(例:「デプロイ手順書」と「障害対応フロー」)の
    // 取り違えを防ぐ。
    const vector = await embedText(`${title}\n${body}`);
    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO page_embeddings (page_id, vector_json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(page_id) DO UPDATE SET vector_json = excluded.vector_json, updated_at = excluded.updated_at`
      )
      .bind(pageId, JSON.stringify(vector), jstLabel())
      .run();
  } catch (err) {
    console.error("埋め込みの更新に失敗しました", err);
  }
}

export async function getPageEmbeddings(): Promise<{ pageId: string; vector: number[] }[]> {
  const db = await getDb();
  const { results } = await db.prepare(`SELECT page_id AS pageId, vector_json AS vectorJson FROM page_embeddings`).all<{ pageId: string; vectorJson: string }>();
  return results
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
  const db = await getDb();
  await db.prepare(`DELETE FROM page_embeddings WHERE page_id = ?`).bind(pageId).run();
}

async function syncPageEmbedding(pageId: string, isPrivate: boolean, isArchived: boolean, title: string, body: string): Promise<void> {
  if (isPrivate || isArchived) {
    await removePageEmbedding(pageId);
  } else {
    await upsertPageEmbedding(pageId, title, body);
  }
}

export async function submitPage(input: SubmitPageInput, user: User): Promise<SubmitResult> {
  const db = await getDb();
  const title = input.title.trim() || "無題のページ";

  if (input.parentId) {
    if ((await getPageLevel(db, input.parentId)) >= MAX_PAGE_LEVEL) {
      return { status: "rejected", error: "3階層を超える子ページは作成できません" };
    }
  }

  const needsApproval = await requiresApproval(input.categoryId);

  if (needsApproval) {
    const id = await nextId("approvals", "ap");
    await db
      .prepare(`INSERT INTO approvals (id, page_id, title, category_id, author, submitted_at, status, new_data_json) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`)
      .bind(
        id,
        input.pageId ?? null,
        title,
        input.categoryId,
        user.name,
        jstLabel(),
        JSON.stringify({ title, body: input.body, categoryId: input.categoryId, private: input.private, tags: input.tags, parentId: input.parentId })
      )
      .run();
    return { status: "pending" };
  }

  if (input.pageId) {
    const before = await db.prepare(`SELECT category_id AS categoryId FROM pages WHERE id = ?`).bind(input.pageId).first<{ categoryId: string }>();
    await db
      .prepare(`UPDATE pages SET title = ?, body = ?, category_id = ?, is_private = ?, tags = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
      .bind(title, input.body, input.categoryId, input.private ? 1 : 0, input.tags.join(","), user.name, jstLabel(), input.pageId)
      .run();
    if (before && before.categoryId !== input.categoryId) {
      await cascadeCategoryToDescendants(db, input.pageId, input.categoryId);
    }
    await db
      .prepare(`INSERT INTO history (id, page_id, edited_by, edited_at, summary, body_snapshot) VALUES (?, ?, ?, ?, '内容を更新', ?)`)
      .bind(await nextId("history", "h"), input.pageId, user.name, jstLabel(), input.body)
      .run();
    await syncPageEmbedding(input.pageId, input.private, false, title, input.body);
    return { status: "published", pageId: input.pageId };
  }

  const id = await nextId("pages", "p");
  await db
    .prepare(
      `INSERT INTO pages (id, category_id, parent_id, title, tags, is_private, body, updated_by, updated_at, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .bind(id, input.categoryId, input.parentId ?? null, title, input.tags.join(","), input.private ? 1 : 0, input.body, user.name, jstLabel(), nowIso())
    .run();
  await db
    .prepare(`INSERT INTO history (id, page_id, edited_by, edited_at, summary, body_snapshot) VALUES (?, ?, ?, ?, '初版作成', ?)`)
    .bind(await nextId("history", "h"), id, user.name, jstLabel(), input.body)
    .run();
  await syncPageEmbedding(id, input.private, false, title, input.body);
  return { status: "published", pageId: id };
}

export async function approveApproval(approvalId: string, reviewer: User): Promise<void> {
  const db = await getDb();
  const item = await db
    .prepare(`SELECT id, page_id AS pageId, author, new_data_json AS newDataJson FROM approvals WHERE id = ? AND status = 'pending'`)
    .bind(approvalId)
    .first<{ id: string; pageId: string | null; author: string; newDataJson: string }>();
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
    const before = await db.prepare(`SELECT category_id AS categoryId FROM pages WHERE id = ?`).bind(item.pageId).first<{ categoryId: string }>();
    await db
      .prepare(`UPDATE pages SET title = ?, body = ?, category_id = ?, is_private = ?, tags = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
      .bind(newData.title, newData.body, newData.categoryId, newData.private ? 1 : 0, newData.tags.join(","), item.author, jstLabel(), item.pageId)
      .run();
    if (before && before.categoryId !== newData.categoryId) {
      await cascadeCategoryToDescendants(db, item.pageId, newData.categoryId);
    }
    await db
      .prepare(`INSERT INTO history (id, page_id, edited_by, edited_at, summary, body_snapshot) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(await nextId("history", "h"), item.pageId, item.author, jstLabel(), `内容を更新（承認済み・承認者: ${reviewer.name}）`, newData.body)
      .run();
    await syncPageEmbedding(item.pageId, newData.private, false, newData.title, newData.body);
  } else {
    const id = await nextId("pages", "p");
    await db
      .prepare(
        `INSERT INTO pages (id, category_id, parent_id, title, tags, is_private, body, updated_by, updated_at, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(id, newData.categoryId, newData.parentId ?? null, newData.title, newData.tags.join(","), newData.private ? 1 : 0, newData.body, item.author, jstLabel(), nowIso())
      .run();
    await db
      .prepare(`INSERT INTO history (id, page_id, edited_by, edited_at, summary, body_snapshot) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(await nextId("history", "h"), id, item.author, jstLabel(), `初版作成（承認済み・承認者: ${reviewer.name}）`, newData.body)
      .run();
    await syncPageEmbedding(id, newData.private, false, newData.title, newData.body);
  }
  await db.prepare(`UPDATE approvals SET status = 'approved' WHERE id = ?`).bind(approvalId).run();
}

export async function rejectApproval(approvalId: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`DELETE FROM approvals WHERE id = ?`).bind(approvalId).run();
}

export async function createInquiry(input: { type: string; subject: string; body: string; authorId: string; authorName: string }): Promise<void> {
  const db = await getDb();
  await db
    .prepare(`INSERT INTO inquiries (id, type, subject, body, author_id, author_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`)
    .bind(await nextId("inquiries", "iq"), input.type, input.subject, input.body, input.authorId, input.authorName, jstLabel())
    .run();
}

export async function resolveInquiry(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE inquiries SET status = 'resolved' WHERE id = ?`).bind(id).run();
}

export async function setPageArchived(pageId: string, archived: boolean): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE pages SET archived = ? WHERE id = ?`).bind(archived ? 1 : 0, pageId).run();
  const page = await getPageById(pageId);
  if (page) await syncPageEmbedding(pageId, page.private, archived, page.title, page.body);
}

export async function deletePage(pageId: string): Promise<void> {
  const db = await getDb();
  const attachments = await db.prepare(`SELECT kv_key AS kvKey FROM attachments WHERE page_id = ?`).bind(pageId).all<{ kvKey: string }>();
  for (const a of attachments.results) {
    if (a.kvKey) await deleteAttachmentBytes(a.kvKey).catch(() => {});
  }
  // 外部キー制約があるため、pagesを参照している行を先に削除・解除してから本体を削除する。
  await db.batch([
    db.prepare(`DELETE FROM page_embeddings WHERE page_id = ?`).bind(pageId),
    db.prepare(`DELETE FROM attachments WHERE page_id = ?`).bind(pageId),
    db.prepare(`DELETE FROM history WHERE page_id = ?`).bind(pageId),
    db.prepare(`DELETE FROM glossary WHERE page_id = ?`).bind(pageId),
    db.prepare(`UPDATE pages SET parent_id = NULL WHERE parent_id = ?`).bind(pageId),
    db.prepare(`UPDATE faq SET page_id = NULL WHERE page_id = ?`).bind(pageId),
    db.prepare(`DELETE FROM pages WHERE id = ?`).bind(pageId),
  ]);
}

export interface CreatedFromImport {
  categoryId: string;
  title: string;
  body: string;
  parentId?: string | null;
}

export async function importPage(input: CreatedFromImport, user: User): Promise<string> {
  const db = await getDb();
  const id = await nextId("pages", "p");
  await db
    .prepare(
      `INSERT INTO pages (id, category_id, parent_id, title, tags, is_private, body, updated_by, updated_at, archived, created_at) VALUES (?, ?, ?, ?, '', 0, ?, ?, ?, 0, ?)`
    )
    .bind(id, input.categoryId, input.parentId ?? null, input.title, input.body, user.name, jstLabel(), nowIso())
    .run();
  await db
    .prepare(`INSERT INTO history (id, page_id, edited_by, edited_at, summary, body_snapshot) VALUES (?, ?, ?, ?, 'データインポートで作成', ?)`)
    .bind(await nextId("history", "h"), id, user.name, jstLabel(), input.body)
    .run();
  await syncPageEmbedding(id, false, false, input.title, input.body);
  return id;
}

export interface AttachmentInfo {
  id: string;
  pageId: string;
  fileName: string;
  kvKey: string;
  sizeBytes: number;
}

export async function addAttachment(pageId: string, fileName: string, mimeType: string, bytes: Uint8Array): Promise<AttachmentInfo> {
  const db = await getDb();
  const id = await nextId("attachments", "att");
  const kvKey = `att-${id}`;
  await putAttachment(kvKey, bytes);
  await db
    .prepare(`INSERT INTO attachments (id, page_id, file_name, kv_key, size_bytes, uploaded_at, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, pageId, fileName, kvKey, bytes.length, jstLabel(), mimeType)
    .run();
  return { id, pageId, fileName, kvKey, sizeBytes: bytes.length };
}

export async function getAttachment(attachmentId: string): Promise<(AttachmentInfo & { mimeType: string; page?: Page }) | undefined> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT id, page_id AS pageId, file_name AS fileName, kv_key AS kvKey, size_bytes AS sizeBytes, mime_type AS mimeType FROM attachments WHERE id = ?`)
    .bind(attachmentId)
    .first<{ id: string; pageId: string; fileName: string; kvKey: string; sizeBytes: number; mimeType: string }>();
  if (!row) return undefined;
  const page = await getPageById(row.pageId);
  return { ...row, page };
}

export async function downloadAttachment(kvKey: string): Promise<{ bytes: Uint8Array; mimeType: string } | undefined> {
  const bytes = await getAttachmentBytes(kvKey);
  if (!bytes) return undefined;
  return { bytes, mimeType: "application/octet-stream" };
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const db = await getDb();
  const row = await db.prepare(`SELECT kv_key AS kvKey FROM attachments WHERE id = ?`).bind(attachmentId).first<{ kvKey: string }>();
  if (!row) return;
  if (row.kvKey) await deleteAttachmentBytes(row.kvKey).catch(() => {});
  await db.prepare(`DELETE FROM attachments WHERE id = ?`).bind(attachmentId).run();
}

export async function getPageById(id: string): Promise<Page | undefined> {
  const db = await getDb();
  const page = await db
    .prepare(
      `SELECT id, category_id AS categoryId, parent_id AS parentId, title, tags, is_private AS isPrivate, body, updated_by AS updatedBy, updated_at AS updatedAt, archived FROM pages WHERE id = ?`
    )
    .bind(id)
    .first<PageRow>();
  if (!page) return undefined;
  const [attachments, history] = await Promise.all([
    db.prepare(`SELECT id, page_id AS pageId, file_name AS fileName, size_bytes AS sizeBytes FROM attachments WHERE page_id = ?`).bind(id).all<AttachmentRow>(),
    db.prepare(`SELECT page_id AS pageId, edited_by AS editedBy, edited_at AS editedAt, summary FROM history WHERE page_id = ?`).bind(id).all<HistoryRow>(),
  ]);
  return buildPages([page], attachments.results, history.results)[0];
}

export async function getFaqs(): Promise<FaqItem[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT id, question, answer, page_id AS pageId, sort_order AS sortOrder FROM faq ORDER BY sort_order`)
    .all<{ id: string; question: string; answer: string; pageId: string | null; sortOrder: number }>();
  return results.map((f) => ({ ...f, pageId: f.pageId || null }));
}

export async function createFaq(input: { question: string; answer: string; pageId?: string | null }): Promise<FaqItem> {
  const db = await getDb();
  const countRow = await db.prepare(`SELECT COUNT(*) as c FROM faq`).first<{ c: number }>();
  const id = await nextId("faq", "faq");
  const sortOrder = (countRow?.c ?? 0) + 1;
  await db
    .prepare(`INSERT INTO faq (id, question, answer, page_id, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, input.question, input.answer, input.pageId ?? null, sortOrder)
    .run();
  return { id, question: input.question, answer: input.answer, pageId: input.pageId ?? null };
}

export async function updateFaq(id: string, patch: { question: string; answer: string; pageId?: string | null }): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE faq SET question = ?, answer = ?, page_id = ? WHERE id = ?`).bind(patch.question, patch.answer, patch.pageId ?? null, id).run();
}

export async function deleteFaq(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`DELETE FROM faq WHERE id = ?`).bind(id).run();
}

export async function getGuidelines(): Promise<GuidelineSection[]> {
  const db = await getDb();
  const { results } = await db.prepare(`SELECT id, title, body, sort_order AS sortOrder FROM guidelines ORDER BY sort_order`).all<GuidelineSection>();
  return results;
}

export async function createGuideline(input: { title: string; body: string }): Promise<GuidelineSection> {
  const db = await getDb();
  const countRow = await db.prepare(`SELECT COUNT(*) as c FROM guidelines`).first<{ c: number }>();
  const id = await nextId("guidelines", "gl");
  const sortOrder = (countRow?.c ?? 0) + 1;
  await db.prepare(`INSERT INTO guidelines (id, title, body, sort_order) VALUES (?, ?, ?, ?)`).bind(id, input.title, input.body, sortOrder).run();
  return { id, title: input.title, body: input.body };
}

export async function updateGuideline(id: string, patch: { title: string; body: string }): Promise<void> {
  const db = await getDb();
  await db.prepare(`UPDATE guidelines SET title = ?, body = ? WHERE id = ?`).bind(patch.title, patch.body, id).run();
}

export async function deleteGuideline(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare(`DELETE FROM guidelines WHERE id = ?`).bind(id).run();
}
