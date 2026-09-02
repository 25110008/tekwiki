import { NextResponse } from "next/server";
import JSZip from "jszip";
import { importPage } from "@/lib/server/repo";
import type { User } from "@/lib/types";

function splitTitleAndBody(fileName: string, content: string): { title: string; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    return { title: lines[0].slice(2).trim(), body: lines.slice(1).join("\n").trim() };
  }
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  return { title: nameWithoutExt, body: content.trim() };
}

const MARKDOWN_EXTENSIONS = ["md", "markdown"];

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

  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files).filter((f) => {
      if (f.dir) return false;
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const baseName = f.name.split("/").pop() ?? f.name;
      return MARKDOWN_EXTENSIONS.includes(ext) && !baseName.startsWith(".");
    });

    if (entries.length === 0) {
      return NextResponse.json({ error: "ZIP内にMarkdownファイル(.md)が見つかりませんでした" }, { status: 422 });
    }

    const created: { fileName: string; pageId: string; title: string }[] = [];
    const failed: { fileName: string; error: string }[] = [];

    for (const entry of entries) {
      try {
        const content = await entry.async("string");
        const baseName = entry.name.split("/").pop() ?? entry.name;
        const { title, body } = splitTitleAndBody(baseName, content);
        if (!body.trim()) {
          failed.push({ fileName: entry.name, error: "本文が空です" });
          continue;
        }
        const pageId = await importPage({ categoryId, title, body }, user);
        created.push({ fileName: entry.name, pageId, title });
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
