"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { signupApi } from "@/lib/client-api";
import { ORG_DOMAIN } from "@/lib/mock-data";
import { BrandMark } from "@/components/BrandMark";

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await signupApi({ name, email, password });
    if (!result.ok) {
      setError(result.error ?? "登録できませんでした");
      setSubmitting(false);
      return;
    }
    const loginResult = await login(email, password);
    if (!loginResult.ok) {
      setError(loginResult.error ?? "登録は完了しましたが、ログインに失敗しました。ログイン画面からお試しください");
      setSubmitting(false);
      return;
    }
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-bg px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandMark size={56} />
        <div>
          <div className="font-heading font-semibold text-[1.4rem] leading-tight">テクWiki</div>
          <p className="text-ink-faint text-[0.9rem] mt-1">社内の知識を、ひとつに。</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[360px] bg-surface border border-border rounded-m shadow-sm p-8">
        <h2 className="text-xl mb-1.5">新規登録</h2>
        <p className="text-ink-muted text-sm mb-7">社内メールアドレスでアカウントを作成します</p>

        {error && (
          <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2.5 text-sm mb-4">
            {error}
          </div>
        )}

        <label className="block mb-4">
          <span className="block text-[0.82rem] text-ink-muted mb-1.5">名前</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 山田 太郎"
            className="w-full px-3 py-2.5 border border-border rounded-s bg-surface text-ink focus:border-accent focus:outline-none"
          />
        </label>

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
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-s bg-accent text-white font-medium hover:bg-accent-strong transition-colors disabled:opacity-60"
        >
          登録する
        </button>

        <div className="mt-5 p-3.5 bg-surface-2 border border-dashed border-border rounded-s text-[0.8rem] text-ink-muted">
          登録直後は所属部署が未設定の状態になります。管理者が部署を割り当てるまでの間は、非公開ページは閲覧できません。
        </div>

        <p className="text-center text-[0.82rem] text-ink-muted mt-5">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-accent-strong hover:underline">
            ログイン
          </Link>
        </p>
      </form>
    </div>
  );
}
