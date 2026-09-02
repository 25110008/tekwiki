// Google Drive(共有ドライブ)への添付ファイルの保存・取得・削除。
// サーバー専用。ファイルは「リンクを知っている全員が閲覧可」にはせず、
// このアプリのAPI経由(canViewでの権限確認あり)でのみ中身を配信する。
import { getGoogleAccessToken } from "./google-auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";

function folderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_FOLDER_ID が設定されていません");
  return id;
}

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getGoogleAccessToken();
  const res = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Google Drive APIエラー (${res.status}): ${await res.text()}`);
  }
  return res;
}

export interface UploadedFile {
  driveFileId: string;
  fileName: string;
  sizeBytes: number;
}

export async function uploadFile(fileName: string, mimeType: string, bytes: Uint8Array): Promise<UploadedFile> {
  const boundary = `tekwiki-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId()] });

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    encoder.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes,
    encoder.encode(`\r\n--${boundary}--`),
  ];
  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.length;
  }

  const res = await driveFetch(`${DRIVE_UPLOAD_API}?uploadType=multipart&supportsAllDrives=true&fields=id,name,size`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const data = (await res.json()) as { id: string; name: string; size?: string };
  return { driveFileId: data.id, fileName: data.name, sizeBytes: Number(data.size ?? bytes.length) };
}

export async function downloadFile(driveFileId: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const meta = await driveFetch(`${DRIVE_API}/${driveFileId}?supportsAllDrives=true&fields=mimeType`);
  const { mimeType } = (await meta.json()) as { mimeType: string };
  const res = await driveFetch(`${DRIVE_API}/${driveFileId}?alt=media&supportsAllDrives=true`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, mimeType };
}

export async function deleteFile(driveFileId: string): Promise<void> {
  await driveFetch(`${DRIVE_API}/${driveFileId}?supportsAllDrives=true`, { method: "DELETE" });
}
