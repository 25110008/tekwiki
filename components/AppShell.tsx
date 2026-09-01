"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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
      ) : (
        <>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className="p-7 md:p-8 flex-1">{children}</main>
          </div>
        </>
      )}
    </div>
  );
}
