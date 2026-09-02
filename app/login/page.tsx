"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../providers";
import { ORG_DOMAIN } from "@/lib/mock-data";
import { BrandMark } from "@/components/BrandMark";
import type { User } from "@/lib/types";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function LoginPage() {
  const { loginWithUser } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(errorParam);
      return;
    }
    if (searchParams.get("google") === "1") {
      const raw = readCookie("tekwiki_google_user");
      if (raw) {
        try {
          const user = JSON.parse(raw) as User;
          loginWithUser(user);
          document.cookie = "tekwiki_google_user=; Max-Age=0; path=/";
          // クライアント側遷移だと、AuthProviderの状態更新が新しい画面に伝わる前に
          // 遷移してしまうことがあるため、確実に反映されるよう丸ごと再読み込みする。
          window.location.href = "/";
          return;
        } catch {
          setError("ログイン処理に失敗しました。もう一度お試しください");
        }
      } else {
        setError("ログイン処理に失敗しました。もう一度お試しください");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="w-full max-w-[360px]">
          <h2 className="text-2xl mb-1.5">ログイン</h2>
          <p className="text-ink-muted text-sm mb-7">
            社内のGoogleアカウント(<code className="font-code bg-surface-3 px-1.5 py-0.5 rounded">@{ORG_DOMAIN}</code>)でサインインしてください
          </p>

          {error && (
            <div className="bg-danger-soft text-danger border border-danger rounded-s px-3 py-2.5 text-sm mb-4">
              {error}
            </div>
          )}

          <a
            href="/api/auth/google/start"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-s border border-border bg-surface text-ink font-medium hover:bg-surface-2 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.5-4.8 2.6-7.7 2.6-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C39.9 36.9 44 31.4 44 24c0-1.2-.1-2.4-.4-3.5z" />
            </svg>
            Googleでログイン
          </a>

          <div className="mt-5 p-3.5 bg-surface-2 border border-dashed border-border rounded-s text-[0.8rem] text-ink-muted">
            @{ORG_DOMAIN} 以外のGoogleアカウントではログインできません。あらかじめテクWikiに登録されているメールアドレスである必要があります。
          </div>
        </div>
      </div>
    </div>
  );
}
