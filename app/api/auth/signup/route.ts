import { NextResponse } from "next/server";
import { createUser, getUserRowByEmail } from "@/lib/server/repo";
import { hashPassword } from "@/lib/server/password";
import { ORG_DOMAIN } from "@/lib/mock-data";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const { name, email, password } = (await request.json()) as { name: string; email: string; password: string };
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  const domain = trimmedEmail.split("@")[1];

  if (!trimmedName) {
    return NextResponse.json({ ok: false, error: "名前を入力してください" }, { status: 400 });
  }
  if (!domain || domain !== ORG_DOMAIN) {
    return NextResponse.json({ ok: false, error: `@${ORG_DOMAIN} 以外のメールアドレスでは登録できません` }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ ok: false, error: "パスワードは4文字以上で入力してください" }, { status: 400 });
  }

  const existing = await getUserRowByEmail(trimmedEmail);
  if (existing) {
    return NextResponse.json({ ok: false, error: "このメールアドレスはすでに登録されています" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user: User = await createUser({ name: trimmedName, email: trimmedEmail, passwordHash });
  return NextResponse.json({ ok: true, user });
}
