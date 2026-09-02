"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "tekwiki:user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // localStorage unavailable — 未ログイン状態のまま
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const trimmed = email.trim();
    if (!trimmed) return { ok: false, error: "メールアドレスを入力してください" };
    if (!password) return { ok: false, error: "パスワードを入力してください" };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; user?: User };
      if (!json.ok || !json.user) {
        return { ok: false, error: json.error ?? "ログインできませんでした" };
      }
      setUser(json.user);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.user));
      } catch {
        // ignore
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "サーバーに接続できませんでした" };
    }
  }

  function logout() {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
