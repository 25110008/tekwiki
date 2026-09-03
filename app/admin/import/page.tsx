"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { importPageApi, importZipApi, type ZipImportResult } from "@/lib/client-api";
import { SERVER_PARSE_EXTENSIONS, TEXT_EXTENSIONS, fileExtension, splitTitleAndBody } from "@/lib/import-text";
import type { User } from "@/lib/types";

const SUPPORTED = [
  { label: "Markdown", ext: ".md,.markdown" },
  { label: "テキスト", ext: ".txt" },
  { label: "CSV", ext: ".csv" },
  { label: "PDF", ext: ".pdf" },
  { label: "Word (.docx)", ext: ".docx" },
  { label: "Webページ(URL)", ext: "" },
  { label: "保存済みHTMLファイル", ext: ".html,.htm" },
  { label: "ZIP(複数一括: 上記形式が混在可)", ext: ".zip" },
];

interface MultiFileItem {
  fileName: string;
  title: string;
  body: string;
  error?: string;
}

interface MultiImportResult {
  created: { fileName: string; pageId: string; title: string }[];
  failed: { fileName: string; error: string }[];
}

async function extractOne(file: File): Promise<MultiFileItem> {
  const ext = fileExtension(file.name);
  try {
    if ((SERVER_PARSE_EXTENSIONS as readonly string[]).includes(ext)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/extract", { method: "POST", body: formData });
      const json = (await res.json()) as { title?: string; body?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "解析に失敗しました");
      return { fileName: file.name, title: json.title ?? "", body: json.body ?? "" };
    }
    if ((TEXT_EXTENSIONS as readonly string[]).includes(ext)) {
      const content = await file.text();
      const { title, body } = splitTitleAndBody(file.name, content);
      return { fileName: file.name, title, body };
    }
    return { fileName: file.name, title: "", body: "", error: "対応していないファイル形式です" };
  } catch (err) {
    return { fileName: file.name, title: "", body: "", error: err instanceof Error ? err.message : "解析に失敗しました" };
  }
}

export default function ImportPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [multiFiles, setMultiFiles] = useState<MultiFileItem[] | null>(null);
  const [multiImporting, setMultiImporting] = useState(false);
  const [multiResult, setMultiResult] = useState<MultiImportResult | null>(null);

  const [zipCategoryId, setZipCategoryId] = useState("all");
  const [zipImporting, setZipImporting] = useState(false);
  const [zipResult, setZipResult] = useState<ZipImportResult | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

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

  async function processSingleFile(file: File) {
    const ext = fileExtension(file.name);

    if ((SERVER_PARSE_EXTENSIONS as readonly string[]).includes(ext)) {
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

    if (!(TEXT_EXTENSIONS as readonly string[]).includes(ext)) {
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setMultiFiles(null);
    setMultiResult(null);
    setSourceLabel(null);

    if (files.length === 1) {
      await processSingleFile(files[0]);
      return;
    }

    setParsing(true);
    const results: MultiFileItem[] = [];
    for (const file of files) {
      results.push(await extractOne(file));
    }
    setMultiFiles(results);
    setParsing(false);
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

  async function handleMultiImport() {
    if (!user || !multiFiles || multiImporting) return;
    setMultiImporting(true);
    const created: MultiImportResult["created"] = [];
    const failed: MultiImportResult["failed"] = [];
    for (const item of multiFiles) {
      if (item.error || !item.body.trim()) {
        failed.push({ fileName: item.fileName, error: item.error ?? "本文が空です" });
        continue;
      }
      try {
        const result = await importPageApi({ categoryId, title: item.title.trim() || item.fileName, body: item.body.trim() }, user as User);
        created.push({ fileName: item.fileName, pageId: result.pageId, title: item.title });
      } catch {
        failed.push({ fileName: item.fileName, error: "作成に失敗しました" });
      }
    }
    setMultiResult({ created, failed });
    setMultiFiles(null);
    setMultiImporting(false);
    await refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleZipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setZipError(null);
    setZipResult(null);
    setZipImporting(true);
    try {
      const result = await importZipApi(file, zipCategoryId, user);
      setZipResult(result);
      await refresh();
    } catch (err) {
      setZipError(err instanceof Error ? err.message : "ZIPの取り込みに失敗しました");
    } finally {
      setZipImporting(false);
      if (zipRef.current) zipRef.current.value = "";
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
      <p className="text-ink-faint text-[0.78rem] mb-6 max-w-[60ch]">
        ConfluenceやNotionは専用フォーマットに未対応ですが、社外に公開されているページであれば「Webページから取り込む」欄にURLを貼り付けることで取り込めます。
        <br />
        ログインが必要な社内限定ページは、そのページを開いた状態でブラウザの「名前を付けて保存(ウェブページ・HTMLのみ)」で保存し、そのファイルを下の「またはファイルを選択」からアップロードしてください。
        <br />
        ファイルは複数まとめて選択することもできます(その場合、内容のプレビュー編集はできず、変換した内容のままページを作成します)。
      </p>

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

      <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">またはファイルを選択(複数選択可)</div>
      <div
        onClick={() => fileRef.current?.click()}
        className="border border-dashed border-border rounded-s px-4 py-8 text-center text-ink-faint text-[0.85rem] bg-surface-2 max-w-[560px] cursor-pointer hover:border-accent"
      >
        {parsing
          ? "解析中..."
          : sourceLabel
            ? `選択中: ${sourceLabel}`
            : "クリックしてファイルを選択(Markdown / テキスト / CSV / PDF / Word / 保存済みHTML、複数選択可)"}
      </div>
      <input ref={fileRef} type="file" multiple accept=".md,.markdown,.txt,.csv,.pdf,.docx,.html,.htm" onChange={handleFileChange} className="hidden" />

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

      {multiFiles && !parsing && (
        <div className="mt-6 max-w-[68ch]">
          <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">
            {multiFiles.length}件のファイルを変換しました(プレビュー編集なしで一括作成します)
          </div>
          <label className="flex flex-col gap-1.5 text-sm mb-3">
            <span className="font-medium">追加先カテゴリ</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1 max-w-[280px]">
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <ul className="flex flex-col gap-1 mb-4">
            {multiFiles.map((item) => (
              <li key={item.fileName} className={`text-[0.82rem] ${item.error ? "text-danger" : ""}`}>
                {item.fileName}
                {item.error ? `: ${item.error}` : ` → ${item.title || "(タイトル未設定)"}`}
              </li>
            ))}
          </ul>
          <button
            onClick={handleMultiImport}
            disabled={multiImporting}
            className="bg-accent text-white rounded-s px-4 py-2 text-sm font-medium hover:bg-accent-strong disabled:opacity-60"
          >
            {multiImporting ? "作成中..." : `この内容で${multiFiles.filter((f) => !f.error).length}件のページを作成`}
          </button>
        </div>
      )}

      {multiResult && (
        <div className="mt-6 max-w-[68ch]">
          <div className="text-[0.85rem] mb-2">
            <span className="text-accent-strong font-medium">{multiResult.created.length}件</span> 作成しました
            {multiResult.failed.length > 0 && <span className="text-danger">(失敗 {multiResult.failed.length}件)</span>}
          </div>
          {multiResult.created.length > 0 && (
            <ul className="flex flex-col gap-1 mb-3">
              {multiResult.created.map((c) => (
                <li key={c.pageId} className="text-[0.82rem]">
                  <Link href={`/pages/${c.pageId}`} className="text-accent-strong hover:underline">
                    {c.title}
                  </Link>
                  <span className="text-ink-faint"> ({c.fileName})</span>
                </li>
              ))}
            </ul>
          )}
          {multiResult.failed.length > 0 && (
            <ul className="flex flex-col gap-1">
              {multiResult.failed.map((f) => (
                <li key={f.fileName} className="text-[0.82rem] text-danger">
                  {f.fileName}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="border-t border-border mt-10 pt-8">
        <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2">ZIPを一括インポート</div>
        <p className="text-ink-faint text-[0.82rem] mb-3 max-w-[60ch]">
          Markdown/テキスト/CSV/PDF/Word/HTMLが混在したZIPファイルから、1ファイルにつき1ページをまとめて作成します。フォルダ分けされている場合、フォルダ名のページが自動作成され、中のファイルはその子ページになります(3階層を超える分は3階層目にまとめます)。プレビュー編集はできないため、内容は作成後に個別のページ編集画面で調整してください。
        </p>
        <div className="flex items-center gap-2 max-w-[560px] mb-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">追加先カテゴリ</span>
            <select
              value={zipCategoryId}
              onChange={(e) => setZipCategoryId(e.target.value)}
              className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1 max-w-[280px]"
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          onClick={() => zipRef.current?.click()}
          className="border border-dashed border-border rounded-s px-4 py-8 text-center text-ink-faint text-[0.85rem] bg-surface-2 max-w-[560px] cursor-pointer hover:border-accent"
        >
          {zipImporting ? "取り込み中...(件数が多いと時間がかかります)" : "クリックしてZIPファイルを選択"}
        </div>
        <input ref={zipRef} type="file" accept=".zip" onChange={handleZipChange} className="hidden" />

        {zipError && <div className="bg-danger-soft text-danger border border-danger rounded-s px-4 py-2.5 text-sm mt-4 max-w-[560px]">{zipError}</div>}

        {zipResult && (
          <div className="mt-4 max-w-[68ch]">
            <div className="text-[0.85rem] mb-2">
              <span className="text-accent-strong font-medium">{zipResult.created.length}件</span> 作成しました
              {zipResult.failed.length > 0 && <span className="text-danger">(失敗 {zipResult.failed.length}件)</span>}
            </div>
            {zipResult.created.length > 0 && (
              <ul className="flex flex-col gap-1 mb-3">
                {zipResult.created.map((c) => (
                  <li key={c.pageId} className="text-[0.82rem]">
                    {c.type === "folder" && <span className="text-ink-faint">📁 </span>}
                    <Link href={`/pages/${c.pageId}`} className="text-accent-strong hover:underline">
                      {c.title}
                    </Link>
                    <span className="text-ink-faint"> ({c.fileName})</span>
                  </li>
                ))}
              </ul>
            )}
            {zipResult.failed.length > 0 && (
              <ul className="flex flex-col gap-1">
                {zipResult.failed.map((f) => (
                  <li key={f.fileName} className="text-[0.82rem] text-danger">
                    {f.fileName}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
