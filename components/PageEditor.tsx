"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { catLabel, renderMarkdown } from "@/lib/wiki";
import { clearDraft, draftKey, loadDraft, saveDraft } from "@/lib/store";
import { attachmentDownloadUrl, deleteAttachmentApi, submitPageApi, uploadAttachmentApi, type Attachment } from "@/lib/client-api";

const SNIPPETS: Record<string, [string, string]> = {
  heading: ["## ", ""],
  bold: ["**", "**"],
  list: ["- ", ""],
  code: ["`", "`"],
  codeblock: ["```\n", "\n```"],
  table: ["", "| 列1 | 列2 |\n| --- | --- |\n| a | b |"],
};

const TOOLBAR: { key: string; label: string }[] = [
  { key: "heading", label: "見出し" },
  { key: "bold", label: "太字" },
  { key: "list", label: "箇条書き" },
  { key: "code", label: "コード" },
  { key: "codeblock", label: "コードブロック" },
  { key: "table", label: "表" },
];

export interface PageEditorProps {
  pageId: string | null;
  parentId: string | null;
  initialCategoryId: string;
  initialTitle: string;
  initialBody: string;
  initialTags?: string[];
  initialPrivate?: boolean;
  initialAttachments?: Attachment[];
}

export function PageEditor({
  pageId,
  parentId,
  initialCategoryId,
  initialTitle,
  initialBody,
  initialTags = [],
  initialPrivate = false,
  initialAttachments = [],
}: PageEditorProps) {
  const { user } = useAuth();
  const { data, refresh } = useAppData();
  const { categories, pages, glossary } = data;
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const parent = parentId ? pages.find((p) => p.id === parentId) : null;

  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [restorable, setRestorable] = useState<null | { title: string; body: string; categoryId: string; tags: string[]; private: boolean; savedAt: string }>(null);

  const key = draftKey(pageId, initialCategoryId, parentId);
  const latest = useRef({ categoryId, title, tags, isPrivate, body });
  useEffect(() => {
    latest.current = { categoryId, title, tags, isPrivate, body };
  });

  useEffect(() => {
    const draft = loadDraft(key);
    if (draft && (draft.body !== initialBody || draft.title !== initialTitle)) {
      setRestorable({ title: draft.title, body: draft.body, categoryId: draft.categoryId, tags: draft.tags, private: draft.private, savedAt: draft.savedAt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const t = setInterval(() => {
      const s = latest.current;
      saveDraft(key, { pageId, categoryId: s.categoryId, parentId, title: s.title, tags: s.tags, private: s.isPrivate, body: s.body });
    }, 8000);
    return () => clearInterval(t);
  }, [key, pageId, parentId]);

  if (!user) return null;

  const needsApproval = categories.find((c) => c.id === categoryId)?.requiresApproval ?? true;

  function insertSnippet(snippetKey: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const [before, after] = SNIPPETS[snippetKey];
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end);
    const inserted = before + selected + after;
    const nextBody = body.slice(0, start) + inserted + body.slice(end);
    setBody(nextBody);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + before.length + selected.length;
      ta.selectionStart = ta.selectionEnd = cursor;
    });
  }

  function addTag() {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  }

  function removeTag(i: number) {
    setTags(tags.filter((_, idx) => idx !== i));
  }

  function handleSaveDraft() {
    saveDraft(key, { pageId, categoryId, parentId, title, tags, private: isPrivate, body });
  }

  function handleRestore() {
    if (!restorable) return;
    setTitle(restorable.title);
    setBody(restorable.body);
    setTags(restorable.tags);
    setIsPrivate(restorable.private);
    if (!parentId) setCategoryId(restorable.categoryId);
    setRestorable(null);
  }

  function handleDiscardDraft() {
    clearDraft(key);
    setRestorable(null);
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;
    setAttachmentError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachmentApi(pageId, file);
      setAttachments((prev) => [...prev, { id: uploaded.id, name: uploaded.fileName, size: `${Math.max(1, Math.round(uploaded.sizeBytes / 1024))}KB` }]);
      await refresh();
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  async function handleAttachmentDelete(attachmentId: string) {
    if (!user) return;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    try {
      await deleteAttachmentApi(attachmentId, user);
      await refresh();
    } catch {
      setAttachmentError("削除に失敗しました");
    }
  }

  function handleCancel() {
    if (pageId) router.push(`/pages/${pageId}`);
    else router.push("/");
  }

  async function handleSubmit() {
    if (!user || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPageApi({ pageId, categoryId, parentId, title, tags, private: isPrivate, body }, user);
      clearDraft(key);
      await refresh();
      if (result.status === "pending") {
        router.push(pageId ? `/pages/${pageId}` : "/");
      } else {
        router.push(`/pages/${result.pageId}`);
      }
    } catch {
      setSubmitError("保存に失敗しました。時間をおいて再度お試しください");
      setSubmitting(false);
    }
  }

  const heading = pageId ? "ページを編集" : parent ? "子ページを作成" : "新規ページ作成";
  const hint = needsApproval
    ? `「${catLabel(categoryId, categories)}」は承認制のカテゴリです。保存すると管理者の承認待ちになります`
    : "保存するとすぐに公開されます。内容は変更履歴に記録され、いつでも元に戻せます";

  return (
    <div className="max-w-[68ch]">
      <h2 className="text-[1.7rem] mb-1.5">{heading}</h2>
      <p className="text-ink-faint text-[0.82rem] mb-5">
        {parent && <>「{parent.title}」の子ページとして作成します。</>}
        {hint}
      </p>

      {submitError && (
        <div className="bg-danger-soft text-danger border border-danger rounded-s px-4 py-3 text-sm mb-5">{submitError}</div>
      )}

      {restorable && (
        <div className="bg-warn-soft text-warn border border-warn rounded-s px-4 py-3 text-sm mb-5 flex flex-wrap items-center gap-3">
          <span>保存された下書きがあります({restorable.savedAt}保存)。復元しますか？</span>
          <button onClick={handleRestore} className="border border-warn rounded-s px-3 py-1 text-[0.8rem] hover:bg-white/40">復元する</button>
          <button onClick={handleDiscardDraft} className="border border-warn rounded-s px-3 py-1 text-[0.8rem] hover:bg-white/40">破棄する</button>
        </div>
      )}

      <div className="flex flex-col gap-4.5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">タイトル</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">カテゴリ</span>
            {parent ? (
              <div className="border border-border rounded-s px-3 py-2 text-sm bg-surface-2 text-ink-muted">
                {catLabel(categoryId, categories)}(親ページに合わせて自動設定)
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.requiresApproval ? "(承認制)" : ""}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">非公開設定</span>
            <div className="flex items-center gap-2 border border-border rounded-s px-3 py-2 bg-surface-1 h-[38px]">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <span className="text-[0.85rem]">このカテゴリの部署のみに公開</span>
            </div>
          </label>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">タグ</span>
          <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-s px-2.5 py-2 bg-surface-1">
            {tags.map((t, i) => (
              <span key={t} className="flex items-center gap-1 text-[0.76rem] px-2 py-1 rounded-full bg-surface-3 text-ink-muted">
                {t}
                <button onClick={() => removeTag(i)} className="text-ink-faint hover:text-danger">×</button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="タグを入力しEnter"
              className="flex-1 min-w-[8ch] text-[0.85rem] outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">本文</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPreview(false)}
                className={`px-3 py-1 text-[0.8rem] rounded-s ${!preview ? "bg-accent-soft text-accent-strong font-medium" : "text-ink-muted"}`}
              >
                編集
              </button>
              <button
                onClick={() => setPreview(true)}
                className={`px-3 py-1 text-[0.8rem] rounded-s ${preview ? "bg-accent-soft text-accent-strong font-medium" : "text-ink-muted"}`}
              >
                プレビュー
              </button>
            </div>
          </div>

          {preview ? (
            <div
              className="prose border border-border rounded-s p-4 min-h-[220px] bg-surface-1 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-3 [&_h3]:mt-3 [&_h3]:mb-2 [&_code]:font-code [&_code]:bg-surface-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-surface-2 [&_pre]:border [&_pre]:border-border [&_pre]:rounded-s [&_pre]:p-3 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_td]:border [&_td]:border-border [&_td]:p-1.5"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body, pageId, glossary, pages) }}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {TOOLBAR.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => insertSnippet(b.key)}
                    className="border border-border rounded-s px-2.5 py-1 text-[0.76rem] hover:bg-surface-2"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="border border-border rounded-s px-3 py-2 text-sm bg-surface-1 font-code leading-relaxed"
              />
              <p className="text-ink-faint text-[0.78rem]">
                Markdown記法が使えます(# 見出し / **太字** / - 箇条書き / `コード` / ```コードブロック``` / 表)
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">添付ファイル</span>
          {attachmentError && <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2 text-[0.82rem]">{attachmentError}</div>}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-s bg-surface-1 text-sm">
                  <span className="flex-1 truncate">{a.name}</span>
                  <span className="text-ink-faint text-[0.76rem]">{a.size}</span>
                  <button onClick={() => handleAttachmentDelete(a.id)} className="text-danger text-[0.8rem] hover:underline">
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
          {pageId ? (
            <div
              onClick={() => attachmentInputRef.current?.click()}
              className="border border-dashed border-border rounded-s px-4 py-6 text-center text-ink-faint text-[0.82rem] bg-surface-2 cursor-pointer hover:border-accent"
            >
              {uploading ? "アップロード中..." : "クリックしてファイルを選択(最大20MB)"}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-s px-4 py-6 text-center text-ink-faint text-[0.82rem] bg-surface-2">
              ページを保存すると添付ファイルを追加できます
            </div>
          )}
          <input ref={attachmentInputRef} type="file" onChange={handleAttachmentUpload} className="hidden" />
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-accent text-white rounded-s px-4 py-2 text-sm font-medium hover:bg-accent-strong disabled:opacity-60"
          >
            {submitting ? "保存中..." : needsApproval ? "承認依頼して保存" : "保存して公開する"}
          </button>
          <button onClick={handleSaveDraft} className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2">
            下書き保存
          </button>
          <button onClick={handleCancel} className="border border-border rounded-s px-4 py-2 text-sm hover:bg-surface-2">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
