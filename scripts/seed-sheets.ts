// 初回セットアップ用スクリプト。スプレッドシートの各シートにヘッダー行と
// これまでのダミーデータを書き込む。実行は一度きりでよい。
//   node scripts/seed-sheets.ts
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

import { CATEGORIES, USERS, PAGES, GLOSSARY, TEMPLATES, FAQS, GUIDELINES } from "../lib/mock-data.ts";
import { ensureSheetWithRows } from "../lib/server/sheets.ts";

function parseSizeToBytes(size: string): number {
  const m = size.match(/^([\d.]+)\s*(KB|MB|GB)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || "").toUpperCase();
  const mult = unit === "GB" ? 1024 ** 3 : unit === "MB" ? 1024 ** 2 : unit === "KB" ? 1024 : 1;
  return Math.round(n * mult);
}

async function main() {
  console.log("Users を書き込み中...");
  await ensureSheetWithRows(
    "Users",
    ["id", "name", "email", "passwordHash", "department", "role", "createdAt"],
    USERS.map((u) => [u.id, u.name, u.email, "", u.department, u.role, "2026-01-01T00:00:00+09:00"])
  );

  console.log("Categories を書き込み中...");
  await ensureSheetWithRows(
    "Categories",
    ["id", "label", "requiresApproval"],
    CATEGORIES.map((c) => [c.id, c.label, c.requiresApproval ? "TRUE" : "FALSE"])
  );

  console.log("Pages を書き込み中...");
  await ensureSheetWithRows(
    "Pages",
    ["id", "categoryId", "parentId", "title", "tags", "private", "body", "updatedBy", "updatedAt", "archived", "createdAt"],
    PAGES.map((p) => [
      p.id,
      p.categoryId,
      p.parentId ?? "",
      p.title,
      p.tags.join(","),
      p.private ? "TRUE" : "FALSE",
      p.body,
      p.updatedBy,
      p.updatedAt,
      p.archived ? "TRUE" : "FALSE",
      p.history[p.history.length - 1]?.when ?? p.updatedAt,
    ])
  );

  console.log("Attachments を書き込み中...");
  const attachmentRows: (string | number)[][] = [];
  let attSeq = 1;
  for (const p of PAGES) {
    for (const a of p.attachments) {
      attachmentRows.push([`att${attSeq++}`, p.id, a.name, "", parseSizeToBytes(a.size), p.updatedAt]);
    }
  }
  await ensureSheetWithRows("Attachments", ["id", "pageId", "fileName", "driveFileId", "sizeBytes", "uploadedAt"], attachmentRows);

  console.log("History を書き込み中...");
  const historyRows: string[][] = [];
  let histSeq = 1;
  for (const p of PAGES) {
    p.history.forEach((h, i) => {
      historyRows.push([`h${histSeq++}`, p.id, h.who, h.when, h.what, i === 0 ? p.body : ""]);
    });
  }
  await ensureSheetWithRows("History", ["id", "pageId", "editedBy", "editedAt", "summary", "bodySnapshot"], historyRows);

  console.log("Approvals のヘッダーのみ作成中...");
  await ensureSheetWithRows("Approvals", ["id", "pageId", "title", "categoryId", "author", "submittedAt", "status", "newDataJson"], []);

  console.log("Glossary を書き込み中...");
  await ensureSheetWithRows("Glossary", ["term", "pageId"], GLOSSARY.map((g) => [g.term, g.pageId]));

  console.log("FAQ を書き込み中...");
  await ensureSheetWithRows(
    "FAQ",
    ["id", "question", "answer", "pageId", "sortOrder"],
    FAQS.map((f, i) => [f.id, f.question, f.answer, f.pageId ?? "", i + 1])
  );

  console.log("Guidelines を書き込み中...");
  await ensureSheetWithRows(
    "Guidelines",
    ["id", "title", "body", "sortOrder"],
    GUIDELINES.map((g, i) => [g.id, g.title, g.body, i + 1])
  );

  console.log("Templates を書き込み中...");
  await ensureSheetWithRows(
    "Templates",
    ["id", "label", "hint", "titleTemplate", "bodyTemplate"],
    TEMPLATES.map((t) => [t.id, t.label, t.hint, t.titleTemplate, t.bodyTemplate])
  );

  console.log("Inquiries のヘッダーのみ作成中...");
  await ensureSheetWithRows("Inquiries", ["id", "type", "subject", "body", "authorId", "authorName", "status", "createdAt"], []);

  console.log("Notifications のヘッダーのみ作成中...");
  await ensureSheetWithRows("Notifications", ["id", "targetRole", "text", "createdAt", "read"], []);

  console.log("PageEmbeddings のヘッダーのみ作成中...");
  await ensureSheetWithRows("PageEmbeddings", ["pageId", "vectorJson", "updatedAt"], []);

  console.log("完了しました。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
