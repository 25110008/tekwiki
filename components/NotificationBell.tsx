"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppData } from "@/app/data-provider";

export function NotificationBell() {
  const { data } = useAppData();
  const [open, setOpen] = useState(false);

  const openInquiries = data.inquiries.filter((i) => i.status !== "resolved");
  const unassignedUsers = data.users.filter((u) => !u.department);
  const count = data.approvals.length + openInquiries.length + unassignedUsers.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 border border-border bg-surface rounded-s hover:bg-surface-2"
        aria-label="通知"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[0.65rem] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-10" />
          <div className="absolute top-11 right-0 w-80 bg-surface border border-border rounded-m shadow-md overflow-hidden z-20 max-h-96 overflow-y-auto">
            <div className="px-3.5 py-2.5 border-b border-border text-[0.8rem] font-medium">通知</div>
            {count === 0 ? (
              <div className="px-3.5 py-6 text-center text-ink-faint text-[0.82rem]">新しい通知はありません</div>
            ) : (
              <div className="flex flex-col">
                {data.approvals.map((a) => (
                  <Link
                    key={`ap-${a.id}`}
                    href="/admin/approvals"
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-2.5 border-b border-border text-[0.82rem] hover:bg-surface-2"
                  >
                    <span className="text-accent-strong font-medium">承認待ち：</span>
                    {a.title}
                    <div className="text-ink-faint text-[0.74rem] mt-0.5">
                      {a.author}が編集・{a.submittedAt}
                    </div>
                  </Link>
                ))}
                {openInquiries.map((i) => (
                  <Link
                    key={`iq-${i.id}`}
                    href="/admin/inquiries"
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-2.5 border-b border-border text-[0.82rem] hover:bg-surface-2"
                  >
                    <span className="text-accent-strong font-medium">お問い合わせ：</span>
                    {i.subject}
                    <div className="text-ink-faint text-[0.74rem] mt-0.5">
                      {i.authorName}・{i.createdAt}
                    </div>
                  </Link>
                ))}
                {unassignedUsers.map((u) => (
                  <Link
                    key={`user-${u.id}`}
                    href="/admin/users"
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-2.5 border-b border-border text-[0.82rem] hover:bg-surface-2"
                  >
                    <span className="text-accent-strong font-medium">部署未割り当て：</span>
                    {u.name}
                    <div className="text-ink-faint text-[0.74rem] mt-0.5">{u.email}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
