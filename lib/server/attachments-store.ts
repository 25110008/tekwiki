// 添付ファイルの実体を保存するCloudflare KVへのアクセスヘルパー。サーバー専用。
import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getKv(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext({ async: true });
  return env.ATTACHMENTS;
}

export async function putAttachment(key: string, bytes: Uint8Array): Promise<void> {
  const kv = await getKv();
  await kv.put(key, bytes);
}

export async function getAttachmentBytes(key: string): Promise<Uint8Array | null> {
  const kv = await getKv();
  const value = await kv.get(key, "arrayBuffer");
  return value ? new Uint8Array(value) : null;
}

export async function deleteAttachmentBytes(key: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(key);
}
