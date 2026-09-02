"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { importPageApi } from "@/lib/client-api";

const SUPPORTED = [
  { label: "Markdown", ext: ".md,.markdown" },
  { label: "テキスト", ext: ".txt" },
  { label: "CSV", ext: ".csv" },
  { label: "PDF", ext: ".pdf" },
  { label: "Word (.docx)", ext: ".docx" },
  { label: "Webページ(URL)", ext: "" },
];
const PLANNED = ["Confluenceエクスポート", "Notionエクスポート"];

const TEXT_EXTENSIONS = ["md", "markdown", "txt", "csv"];
const SERVER_PARSE_EXTENSIONS = ["pdf", "docx"];

function splitTitleAndBody(fileName: string, content: string): { title: string; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    return { title: lines[0].slice(2).trim(), body: lines.slice(1).join("\n").trim() };
  }
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  return { title: nameWithoutExt, body: content.trim() };
}

export default function ImportPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  if (user.role !== "admin") {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">この画面は管理者のみ閲覧できます</div>
      </AppShell>
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (SERVER_PARSE_EXTENSIONS.includes(ext)) {
      setParsing(true);
      setSourceLabel(file.name);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/import/extract", { method: "POST", body: formData });
        const json = (await res.json()) as { title?: string; body?: string; error?: string };
        if (!res.ok || json.error) throw new Error(json.error ?? "解析に失敗しました");
        setTitle(json.title ?? "");
        setBody(json.body ?? "");
      } catch (err) {
        setSourceLabel(null);
        setError(err instanceof Error ? err.message : "ファイルの解析に失敗しました");
      } finally {
        setParsing(false);
      }
      return;
    }

    if (!TEXT_EXTENSIONS.includes(ext)) {
      setError("対応していないファイル形式です");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      const { title: t, body: b } = splitTitleAndBody(file.name, content);
      setSourceLabel(file.name);
      setTitle(t);
      setBody(b);
    };
    reader.onerror = () => setError("ファイルの読み込みに失敗しました");
    reader.readAsText(file, "utf-8");
  }

  async function handleUrlImport() {
    const url = urlInput.trim();
    if (!url || parsing) return;
    setError(null);
    setParsing(true);
    try {
      const res = await fetch("/api/import/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as { title?: string; body?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "取り込みに失敗しました");
      setSourceLabel(url);
      setTitle(json.title ?? "");
      setBody(json.body ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!user || !title.trim() || !body.trim() || importing) return;
    setImporting(true);
    try {
      const result = await importPageApi({ categoryId, title: title.trim(), body: body.trim() }, user);
      await refresh();
      router.push(`/pages/${result.pageId}`);
    } catch {
      setError("インポートに失敗しました");
      setImporting(false);
    }
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-5">データインポート</h2>

      <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">対応フォーマット</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {SUPPORTED.map((f) => (
          <span key={f.label} className="text-[0.76rem] px-2.5 py-1 rounded-full bg-accent-soft text-accent-strong border border-accent">
            {f.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {PLANNED.map((f) => (
          <span key={f} className="text-[0.76rem] px-2.5 py-1 rounded-full bg-surface-3 text-ink-faint border border-border">
            {f}(準備中)
          </span>
        ))}
      </div>

      <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">Webページから取り込む</div>
      <div className="flex gap-2 max-w-[560px] mb-6">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUrlImport();
          }}
          placeholder="https://example.com/article"
          className="flex-1 border border-border rounded-s px-3 py-2 text-sm bg-surface-1"
        />
        <button
          onClick={handleUrlImport}
          disabled={parsing || !urlInput.trim()}
          className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-60 shrink-0"
        >
          取り込む
        </button>
      </div>

      <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">またはファイルを選択</div>
      <div
        onClick={() => fileRef.current?.click()}
        className="border border-dashed border-border rounded-s px-4 py-8 text-center text-ink-faint text-[0.85rem] bg-surface-2 max-w-[560px] cursor-pointer hover:border-accent"
      >
        {parsing ? "解析中..." : sourceLabel ? `選択中: ${sourceLabel}` : "クリックしてファイルを選択(Markdown / テキスト / CSV / PDF / Word)"}
      </div>
      <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.csv,.pdf,.docx" onChange={handleFileChange} className="hidden" />

      {error && <div className="bg-danger-soft text-danger border border-danger rounded-s px-4 py-2.5 text-sm mt-4 max-w-[560px]">{error}</div>}

      {sourceLabel && !parsing && (
        <div className="mt-6 max-w-[68ch]">
          <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">変換プレビュー(内容は保存前に編集できます)</div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">追加先カテゴリ</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1 max-w-[280px]">
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">タイトル</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">本文</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1 font-code leading-relaxed" />
            </label>
            <div>
              <button
                onClick={handleImport}
                disabled={importing || !title.trim() || !body.trim()}
                className="bg-accent text-white rounded-s px-4 py-2 text-sm font-medium hover:bg-accent-strong disabled:opacity-60"
              >
                {importing ? "取り込み中..." : "この内容でページを作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
