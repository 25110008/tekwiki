"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { useAppData } from "@/app/data-provider";
import { Sidebar, MobileOutline } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { error: dataError, refresh } = useAppData();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) router.replace("/login");
  }, [mounted, loading, user, router]);

  const ready = mounted && !loading && !!user;

  return (
    <div className="flex min-h-screen">
      {!ready ? (
        <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">読み込み中...</div>
      ) : dataError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-center px-6">
          <p className="text-danger">{dataError}</p>
          <button onClick={() => refresh()} className="border border-border rounded-s px-4 py-2 hover:bg-surface-2">
            再試行する
          </button>
        </div>
      ) : (
        <>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className="p-7 md:p-8 flex-1">{children}</main>
            <MobileOutline />
          </div>
        </>
      )}
    </div>
  );
}
