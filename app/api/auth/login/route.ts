import { NextResponse } from "next/server";
import { getUsers } from "@/lib/server/repo";
import { ORG_DOMAIN } from "@/lib/mock-data";

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email: string; password: string };
  const trimmed = (email || "").trim().toLowerCase();
  const domain = trimmed.split("@")[1];

  if (!domain || domain !== ORG_DOMAIN) {
    return NextResponse.json({ ok: false, error: `@${ORG_DOMAIN} 以外のメールアドレスではログインできません` }, { status: 401 });
  }

  const users = await getUsers();
  const localPart = trimmed.split("@")[0];
  const matched = users.find((u) => u.email.toLowerCase() === trimmed) ?? users.find((u) => u.id === localPart) ?? users[0];

  if (!matched) {
    return NextResponse.json({ ok: false, error: "ユーザーが見つかりません" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: matched });
}
