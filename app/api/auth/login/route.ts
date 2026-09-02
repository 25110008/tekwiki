import { NextResponse } from "next/server";
import { getUserRowByEmail, setUserPasswordHash } from "@/lib/server/repo";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { ORG_DOMAIN } from "@/lib/mock-data";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email: string; password: string };
  const trimmed = (email || "").trim().toLowerCase();
  const domain = trimmed.split("@")[1];

  if (!domain || domain !== ORG_DOMAIN) {
    return NextResponse.json({ ok: false, error: `@${ORG_DOMAIN} 以外のメールアドレスではログインできません` }, { status: 401 });
  }
  if (!password) {
    return NextResponse.json({ ok: false, error: "パスワードを入力してください" }, { status: 401 });
  }

  const row = await getUserRowByEmail(trimmed);
  if (!row) {
    return NextResponse.json({ ok: false, error: "このメールアドレスは登録されていません。管理者にお問い合わせください" }, { status: 401 });
  }

  if (!row.passwordHash) {
    // 初回ログイン: 入力されたパスワードをそのままパスワードとして登録する。
    const hash = await hashPassword(password);
    await setUserPasswordHash(row.id, hash);
  } else {
    const valid = await verifyPassword(password, row.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "パスワードが違います" }, { status: 401 });
    }
  }

  const user: User = { id: row.id, name: row.name, email: row.email, department: row.department, role: row.role as User["role"] };
  return NextResponse.json({ ok: true, user });
}
