import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { extractArticle } from "@/lib/server/article-extract";
import { splitTitleAndBody } from "@/lib/import-text";

// PDF/Word(.docx)/保存済みHTMLをタイトル・本文に変換する。
// 単発インポート(/api/import/extract)とZIP一括インポート(/api/import/zip)の両方から使う共通処理。
export async function convertServerParsedFile(
  fileName: string,
  ext: string,
  bytes: Uint8Array
): Promise<{ title: string; body: string }> {
  if (ext === "html" || ext === "htm") {
    const html = new TextDecoder("utf-8").decode(bytes);
    const article = extractArticle(html, fileName.replace(/\.[^.]+$/, ""));
    if (!article) throw new Error("本文を抽出できませんでした");
    return article;
  }

  let text: string;
  if (ext === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  } else if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = result.value;
  } else {
    throw new Error("対応していないファイル形式です");
  }

  if (!text.trim()) throw new Error("ファイルから文字を読み取れませんでした");
  return splitTitleAndBody(fileName, text);
}
