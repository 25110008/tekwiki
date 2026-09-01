"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { ORG_DOMAIN } from "@/lib/mock-data";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error ?? "ログインできませんでした");
      return;
    }
    setError("");
    router.push("/");
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr] bg-bg">
      <div className="hidden md:flex flex-col justify-center gap-5 p-16 border-r border-border bg-surface-2">
        <BrandMark size={44} />
        <h1 className="text-4xl max-w-[8em]">ひとつにまとまる、社内の知識。</h1>
        <p className="text-ink-muted max-w-[42ch] text-[0.98rem]">
          点在していた複数のWikiをテクWikiに集約。記事を探すではなく、質問して引き出せる場所に。
        </p>
        <ul className="flex flex-col gap-2.5 mt-2 text-[0.92rem] text-ink-muted">
          <li>・全社公開ページを対象にしたAIチャット回答(非公開情報は対象外)</li>
          <li>・編集はすぐに反映、承認は一部の重要カテゴリのみ</li>
          <li>・部署ごとの固定カテゴリで整理されたページ</li>
        </ul>
      </div>

      <div className="flex items-center justify-center p-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px]">
          <h2 className="text-2xl mb-1.5">ログイン</h2>
          <p className="text-ink-muted text-sm mb-7">社内メールアドレスでサインインしてください</p>

          {error && (
            <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2.5 text-sm mb-4">
              {error}
            </div>
          )}

          <label className="block mb-4">
            <span className="block text-[0.82rem] text-ink-muted mb-1.5">メールアドレス</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${ORG_DOMAIN}`}
              className="w-full px-3 py-2.5 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none"
            />
          </label>

          <label className="block mb-4">
            <span className="block text-[0.82rem] text-ink-muted mb-1.5">パスワード</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full px-3 py-2.5 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none"
            />
            <span className="block text-[0.78rem] text-ink-faint mt-1.5">デモでは任意の文字列でログインできます</span>
          </label>

          <button
            type="submit"
            className="w-full py-2.5 rounded-s bg-accent text-white font-medium hover:bg-accent-strong transition-colors"
          >
            ログイン
          </button>

          <div className="mt-5 p-3.5 bg-surface-2 border border-dashed border-border rounded-s text-[0.8rem] text-ink-muted">
            デモ用ヒント：<code className="font-code bg-surface-3 px-1.5 py-0.5 rounded">@{ORG_DOMAIN}</code> 以外のドメインでは拒否されます。例：
            <code className="font-code bg-surface-3 px-1.5 py-0.5 rounded">tanaka@{ORG_DOMAIN}</code>
          </div>
        </form>
      </div>
    </div>
  );
}
