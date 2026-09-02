// 文章の「意味の近さ」で検索するための埋め込み(embedding)処理。
// 多言語(日本語含む)対応のモデルを使用。AIチャットの検索精度向上に使う。
const MODEL = "@cf/baai/bge-m3";

export async function embedText(text: string): Promise<number[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN が設定されていません");
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 2000) }),
  });
  if (!res.ok) {
    throw new Error(`Cloudflare Workers AI(embedding)エラー (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { success: boolean; result?: { data?: number[][] } };
  const vector = data.result?.data?.[0];
  if (!data.success || !vector) {
    throw new Error("埋め込みベクトルの取得に失敗しました");
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
