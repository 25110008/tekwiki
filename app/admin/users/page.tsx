"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { resetUserPasswordApi, updateUserApi } from "@/lib/client-api";
import type { Role, User } from "@/lib/types";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { data, loading, refresh } = useAppData();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading || !user) {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">読み込み中...</div>
      </AppShell>
    );
  }

  if (user.role !== "admin") {
    return (
      <AppShell>
        <div className="text-ink-faint text-sm text-center py-10">この画面は管理者のみ閲覧できます</div>
      </AppShell>
    );
  }

  async function changeDepartment(target: User, department: string) {
    if (!user) return;
    setBusyId(target.id);
    await updateUserApi(target.id, { department }, user);
    await refresh();
    setBusyId(null);
  }

  async function changeRole(target: User, role: Role) {
    if (!user) return;
    setBusyId(target.id);
    await updateUserApi(target.id, { role }, user);
    await refresh();
    setBusyId(null);
  }

  async function handleResetPassword(target: User) {
    if (!user) return;
    if (!confirm(`${target.name}さんのパスワードをリセットしますか？次回ログイン時に新しいパスワードを設定できるようになります。`)) return;
    setBusyId(target.id);
    await resetUserPasswordApi(target.id, user);
    await refresh();
    setBusyId(null);
  }

  const unassigned = data.users.filter((u) => !u.department);
  const assigned = data.users.filter((u) => u.department);

  function UserRow({ u }: { u: User }) {
    return (
      <div className="border border-border rounded-m p-4 bg-surface-1 flex flex-wrap items-center gap-3.5">
        <div className="min-w-[160px]">
          <div className="font-medium">{u.name}</div>
          <div className="text-ink-faint text-[0.78rem]">{u.email}</div>
        </div>

        <label className="flex items-center gap-1.5 text-[0.82rem] text-ink-muted">
          部署
          <select
            value={u.department}
            onChange={(e) => changeDepartment(u, e.target.value)}
            disabled={busyId === u.id}
            className="border border-border rounded-s px-2 py-1.5 bg-surface text-ink text-[0.82rem] disabled:opacity-60"
          >
            <option value="">未割り当て</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-[0.82rem] text-ink-muted">
          権限
          <select
            value={u.role}
            onChange={(e) => changeRole(u, e.target.value as Role)}
            disabled={busyId === u.id}
            className="border border-border rounded-s px-2 py-1.5 bg-surface text-ink text-[0.82rem] disabled:opacity-60"
          >
            <option value="member">一般ユーザー</option>
            <option value="admin">管理者</option>
          </select>
        </label>

        <button
          onClick={() => handleResetPassword(u)}
          disabled={busyId === u.id}
          className="border border-border rounded-s px-3 py-1.5 text-[0.8rem] hover:bg-surface-2 disabled:opacity-60 ml-auto"
        >
          パスワードをリセット
        </button>
      </div>
    );
  }

  return (
    <AppShell>
      <h2 className="text-[1.7rem] mb-1.5">ユーザー管理</h2>
      <p className="text-ink-faint text-[0.85rem] mb-6 max-w-[70ch]">
        新規登録された方は所属部署が未割り当ての状態になります。本人が申告した部署をそのまま信用すると、他部署の非公開ページを不正に見られてしまうため、必ずここで実際の所属を確認してから割り当ててください。
      </p>

      {unassigned.length > 0 && (
        <div className="mb-6">
          <div className="text-[0.78rem] uppercase tracking-wide text-danger mb-2.5">部署未割り当て({unassigned.length}件)</div>
          <div className="flex flex-col gap-3">
            {unassigned.map((u) => (
              <UserRow key={u.id} u={u} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[0.78rem] uppercase tracking-wide text-ink-faint mb-2.5">全ユーザー</div>
        <div className="flex flex-col gap-3">
          {assigned.map((u) => (
            <UserRow key={u.id} u={u} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
