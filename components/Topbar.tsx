"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useChat } from "@/app/chat-provider";
import { NotificationBell } from "./NotificationBell";

export function Topbar() {
  const { user, logout } = useAuth();
  const { setOpen: setChatOpen } = useChat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    router.push(`/?${params.toString()}`);
  }

  if (pathname === "/login" || !user) return null;

  return (
    <div className="flex items-center gap-3.5 px-6 py-3 border-b border-border bg-surface sticky top-0 z-10">
      <form onSubmit={handleSearch} className="flex-1 max-w-[420px] flex items-center gap-2 bg-surface-2 border border-border rounded-s px-3 py-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ページを検索..."
          className="bg-transparent outline-none text-sm flex-1 text-ink"
        />
      </form>
      <div className="flex-1" />
      <button
        onClick={() => setChatOpen(true)}
        className="flex items-center gap-2 bg-accent text-white rounded-s px-3.5 py-2 text-sm font-medium hover:bg-accent-strong"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a7.5 7.5 0 0 1-11.6 6.3L4 19l1.4-4.2A7.5 7.5 0 1 1 21 11.5z" />
        </svg>
        AIに質問
      </button>
      {user.role === "admin" && <NotificationBell />}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 border border-border bg-surface rounded-s pl-1.5 pr-2.5 py-1.5 text-sm hover:bg-surface-2"
        >
          <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-strong flex items-center justify-center text-[0.72rem] font-semibold">
            {user.name.slice(0, 1)}
          </span>
          <span className="max-w-[12ch] truncate">{user.name}</span>
        </button>
        {menuOpen && (
          <div className="absolute top-11 right-0 w-56 bg-surface border border-border rounded-m shadow-md overflow-hidden z-20">
            <div className="px-3.5 py-2 border-b border-border text-[0.8rem] text-ink-muted">{user.email}</div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-full text-left px-3.5 py-2.5 text-[0.85rem] text-danger hover:bg-surface-2"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
