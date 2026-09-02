import { NextResponse } from "next/server";
import { ORG_DOMAIN } from "@/lib/mock-data";
import { getUserByEmail } from "@/lib/server/repo";

function decodeJwtPayload(idToken: string): Record<string, unknown> {
  const payload = idToken.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function redirectToLogin(request: Request, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/tekwiki_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToLogin(request, "認証の状態が確認できませんでした。もう一度お試しください");
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return redirectToLogin(request, "サーバーの設定が不足しています");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return redirectToLogin(request, "Googleとの認証に失敗しました");
  }
  const tokenData = (await tokenRes.json()) as { id_token?: string };
  if (!tokenData.id_token) {
    return redirectToLogin(request, "Googleとの認証に失敗しました");
  }

  const claims = decodeJwtPayload(tokenData.id_token) as {
    email?: string;
    email_verified?: boolean;
    iss?: string;
    aud?: string;
    exp?: number;
  };

  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") {
    return redirectToLogin(request, "認証情報が不正です");
  }
  if (claims.aud !== clientId) {
    return redirectToLogin(request, "認証情報が不正です");
  }
  if (!claims.exp || claims.exp * 1000 < Date.now()) {
    return redirectToLogin(request, "認証の有効期限が切れました。もう一度お試しください");
  }
  if (!claims.email || !claims.email_verified) {
    return redirectToLogin(request, "確認済みのメールアドレスが取得できませんでした");
  }
  if (!claims.email.toLowerCase().endsWith(`@${ORG_DOMAIN}`)) {
    return redirectToLogin(request, `@${ORG_DOMAIN} のアカウントでログインしてください`);
  }

  const user = await getUserByEmail(claims.email);
  if (!user) {
    return redirectToLogin(request, "このメールアドレスはテクWikiに登録されていません。管理者にお問い合わせください");
  }

  const res = NextResponse.redirect(new URL("/login?google=1", request.url));
  res.cookies.set("tekwiki_google_user", JSON.stringify(user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60,
    path: "/",
  });
  res.cookies.delete("tekwiki_oauth_state");
  return res;
}
