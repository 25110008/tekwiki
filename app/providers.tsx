"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ORG_DOMAIN, USERS } from "@/lib/mock-data";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "tekwiki:userId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      const found = USERS.find((u) => u.id === savedId);
      if (found) setUser(found);
    } catch {
      // localStorage unavailable — 未ログイン状態のまま
    } finally {
      setLoading(false);
    }
  }, []);

  function login(email: string, password: string): { ok: boolean; error?: string } {
    const trimmed = email.trim();
    const domain = trimmed.split("@")[1];
    if (!trimmed || !domain) return { ok: false, error: "メールアドレスを入力してください" };
    if (domain.toLowerCase() !== ORG_DOMAIN) {
      return { ok: false, error: `組織のメールアドレス（@${ORG_DOMAIN}）でログインしてください` };
    }
    if (!password) return { ok: false, error: "パスワードを入力してください" };

    const local = trimmed.split("@")[0].toLowerCase();
    const match = USERS.find((u) => local.includes(u.id) || u.id.includes(local));
    const resolved = match ?? USERS[0];
    setUser(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved.id);
    } catch {
      // ignore
    }
    return { ok: true };
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
