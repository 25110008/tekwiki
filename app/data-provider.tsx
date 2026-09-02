"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Approval, Category, FaqItem, GlossaryEntry, GuidelineSection, Inquiry, Page, Template, User } from "@/lib/types";

export interface AppData {
  categories: Category[];
  users: User[];
  pages: Page[];
  glossary: GlossaryEntry[];
  templates: Template[];
  faqs: FaqItem[];
  guidelines: GuidelineSection[];
  approvals: Approval[];
  inquiries: Inquiry[];
}

const EMPTY: AppData = {
  categories: [],
  users: [],
  pages: [],
  glossary: [],
  templates: [],
  faqs: [],
  guidelines: [],
  approvals: [],
  inquiries: [],
};

interface DataContextValue {
  data: AppData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({ data: EMPTY, loading: true, error: null, refresh: async () => {} });

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch("/api/data", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`データの取得に失敗しました (${res.status})`);
      const json = (await res.json()) as AppData;
      setData(json);
      setError(null);
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "AbortError";
      setError(timedOut ? "通信がタイムアウトしました。時間をおいて再度お試しください" : e instanceof Error ? e.message : "データの取得に失敗しました");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <DataContext.Provider value={{ data, loading, error, refresh }}>{children}</DataContext.Provider>;
}

export function useAppData() {
  return useContext(DataContext);
}
