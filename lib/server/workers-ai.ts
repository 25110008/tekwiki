// Cloudflare Workers AI(サーバー専用)。REST API経由で呼び出すため、
// Node.js・Cloudflare Workers/Pages Functionsのどちらでも同じコードで動く。
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function runChatCompletion(messages: ChatCompletionMessage[]): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN が設定されていません");
  }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, max_tokens: 400 }),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare Workers AIエラー (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { success: boolean; result?: { response?: string }; errors?: unknown[] };
  if (!data.success || !data.result?.response) {
    throw new Error(`Cloudflare Workers AIから有効な回答が得られませんでした: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result.response.trim();
}
