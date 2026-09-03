import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getCategories, importPage, MAX_PAGE_LEVEL } from "@/lib/server/repo";
import { convertServerParsedFile } from "@/lib/server/import-convert";
import { IMPORTABLE_EXTENSIONS, SERVER_PARSE_EXTENSIONS, TEXT_EXTENSIONS, fileExtension, splitTitleAndBody } from "@/lib/import-text";
import type { User } from "@/lib/types";

// フォルダ階層をページの親子関係に変換する際、ページの3階層制限(MAX_PAGE_LEVEL)を超える分はまとめて
// 最深階層のフォルダページの下に配置する(それより深いフォルダ名は使わない)。
const MAX_FOLDER_DEPTH = MAX_PAGE_LEVEL; // フォルダページとして作成するのはこの階層数まで

async function ensureFolderPage(
  folders: string[],
  categoryId: string,
  user: User,
  folderPageIds: Map<string, string>
): Promise<string | null> {
  let parentId: string | null = null;
  const depth = Math.min(folders.length, MAX_FOLDER_DEPTH);
  for (let i = 0; i < depth; i++) {
    const key = folders.slice(0, i + 1).join("/");
    let pageId = folderPageIds.get(key);
    if (!pageId) {
      pageId = await importPage(
        {
          categoryId,
          title: folders[i],
          body: `インポート時のフォルダ構成から自動作成されたページです。配下のファイルは「子ページ」欄をご覧ください。`,
          parentId,
        },
        user
      );
      folderPageIds.set(key, pageId);
    }
    parentId = pageId;
  }
  return parentId;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const categoryId = formData.get("categoryId");
  const userRaw = formData.get("user");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }
  if (typeof categoryId !== "string" || typeof userRaw !== "string") {
    return NextResponse.json({ error: "パラメータが不正です" }, { status: 400 });
  }
  const user = JSON.parse(userRaw) as User;
  if (user.role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const categories = await getCategories();
  const targetCategoryLabel = categories.find((c) => c.id === categoryId)?.label;

  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files).filter((f) => {
      if (f.dir) return false;
      const ext = fileExtension(f.name);
      const baseName = f.name.split("/").pop() ?? f.name;
      return (IMPORTABLE_EXTENSIONS as readonly string[]).includes(ext) && !baseName.startsWith(".");
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "ZIP内に対応形式のファイル(Markdown/テキスト/CSV/PDF/Word/HTML)が見つかりませんでした" },
        { status: 422 }
      );
    }

    const created: { fileName: string; pageId: string; title: string; type: "page" | "folder" }[] = [];
    const failed: { fileName: string; error: string }[] = [];
    const folderPageIds = new Map<string, string>();

    for (const entry of entries) {
      const baseName = entry.name.split("/").pop() ?? entry.name;
      let folders = entry.name.split("/").slice(0, -1).filter(Boolean);
      // ZIP直下のフォルダ名がインポート先カテゴリ名と同じ場合(例:「営業部」カテゴリに
      // 「営業部/」フォルダ)、カテゴリ自体がその区分を表しているため、同名のフォルダページを
      // 二重に作ると「営業部の中の営業部」のように紛らわしくなる。その場合はこの階層を
      // 読み飛ばし、直下のファイルをカテゴリ直下のページとして扱う。
      if (targetCategoryLabel && folders[0] === targetCategoryLabel) {
        folders = folders.slice(1);
      }
      const ext = fileExtension(baseName);

      try {
        let title: string;
        let body: string;
        if ((TEXT_EXTENSIONS as readonly string[]).includes(ext)) {
          const content = await entry.async("string");
          ({ title, body } = splitTitleAndBody(baseName, content));
        } else if ((SERVER_PARSE_EXTENSIONS as readonly string[]).includes(ext)) {
          const bytes = await entry.async("uint8array");
          ({ title, body } = await convertServerParsedFile(baseName, ext, bytes));
        } else {
          continue;
        }

        if (!body.trim()) {
          failed.push({ fileName: entry.name, error: "本文が空です" });
          continue;
        }

        const parentId = await ensureFolderPage(folders, categoryId, user, folderPageIds);
        // フォルダページ作成もcreated一覧に含めたいので、初出のフォルダはここで記録する
        for (let i = 0; i < Math.min(folders.length, MAX_FOLDER_DEPTH); i++) {
          const key = folders.slice(0, i + 1).join("/");
          const pageId = folderPageIds.get(key);
          if (pageId && !created.some((c) => c.pageId === pageId)) {
            created.push({ fileName: `${key}/`, pageId, title: folders[i], type: "folder" });
          }
        }

        const pageId = await importPage({ categoryId, title, body, parentId }, user);
        created.push({ fileName: entry.name, pageId, title, type: "page" });
      } catch (err) {
        failed.push({ fileName: entry.name, error: err instanceof Error ? err.message : "変換に失敗しました" });
      }
    }

    return NextResponse.json({ created, failed });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ZIPファイルの解析に失敗しました" }, { status: 500 });
  }
}
