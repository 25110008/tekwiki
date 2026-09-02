"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Approval, Category, FaqItem, GlossaryEntry, GuidelineSection, Page, Template, User } from "@/lib/types";

export interface AppData {
  categories: Category[];
  users: User[];
  pages: Page[];
  glossary: GlossaryEntry[];
  templates: Template[];
  faqs: FaqItem[];
  guidelines: GuidelineSection[];
  approvals: Approval[];
}

const EMPTY: AppData = { categories: [], users: [], pages: [], glossary: [], templates: [], faqs: [], guidelines: [], approvals: [] };

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
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (!res.ok) throw new Error(`データの取得に失敗しました (${res.status})`);
      const json = (await res.json()) as AppData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データの取得に失敗しました");
    } finally {
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
