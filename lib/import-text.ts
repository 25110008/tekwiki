export const TEXT_EXTENSIONS = ["md", "markdown", "txt", "csv"] as const;
export const SERVER_PARSE_EXTENSIONS = ["pdf", "docx", "html", "htm"] as const;
export const IMPORTABLE_EXTENSIONS = [...TEXT_EXTENSIONS, ...SERVER_PARSE_EXTENSIONS] as const;

export function fileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function splitTitleAndBody(fileName: string, content: string): { title: string; body: string } {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    return { title: lines[0].slice(2).trim(), body: lines.slice(1).join("\n").trim() };
  }
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
  return { title: nameWithoutExt, body: content.trim() };
}
