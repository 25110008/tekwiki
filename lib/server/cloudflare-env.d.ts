// @opennextjs/cloudflareのCloudflareEnv型に、wrangler.jsoncで定義したbindingを追加する。
export {};

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ATTACHMENTS: KVNamespace;
  }
}
