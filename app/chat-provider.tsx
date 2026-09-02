"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { CHAT_SUGGESTIONS } from "@/lib/chat";
import { askChatApi } from "@/lib/client-api";
import { BrandMark } from "@/components/BrandMark";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  denied?: boolean;
  cites?: { id: string; title: string }[];
}

interface ChatContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ChatContext = createContext<ChatContextValue>({ open: false, setOpen: () => {} });

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log, open, thinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setLog((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);
    try {
      const answer = await askChatApi(trimmed);
      setLog((prev) => [...prev, { role: "ai", ...answer }]);
    } catch {
      setLog((prev) => [...prev, { role: "ai", text: "エラーが発生しました。時間をおいて再度お試しください。", cites: [] }]);
    } finally {
      setThinking(false);
    }
  }

  function openPage(pageId: string) {
    setOpen(false);
    router.push(`/pages/${pageId}`);
  }

  return (
    <ChatContext.Provider value={{ open, setOpen }}>
      {children}
      {user && open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/20 z-30" />
          <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[380px] bg-surface border-l border-border shadow-lg z-40 flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <BrandMark size={30} />
              <div className="flex-1">
                <div className="font-medium text-sm">テクWiki AI</div>
                <div className="text-ink-faint text-[0.74rem]">Cloudflare Workers AIを使用・学習データには利用されません</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink text-xl leading-none px-1">
                ×
              </button>
            </div>
            <div className="text-[0.74rem] text-ink-faint px-4 py-2 border-b border-border">
              {user.name} として質問中・回答は全社公開ページの内容に限定されます(暫定版)
            </div>
            <div ref={logRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {log.length === 0 ? (
                <div className="text-ink-faint text-sm text-center py-8">気になることを質問してみてください</div>
              ) : (
                log.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="self-end max-w-[85%] bg-accent text-white rounded-m px-3.5 py-2.5 text-[0.88rem]">
                      {m.text}
                    </div>
                  ) : (
                    <div
                      key={i}
                      className={`self-start max-w-[90%] rounded-m px-3.5 py-2.5 text-[0.88rem] ${
                        m.denied ? "bg-warn-soft text-warn border border-warn" : "bg-surface-2 text-ink border border-border"
                      }`}
                    >
                      {m.text}
                      {m.cites && m.cites.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2.5">
                          {m.cites.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => openPage(c.id)}
                              className="text-left text-accent-strong text-[0.8rem] hover:underline"
                            >
                              {c.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )
              )}
              {thinking && (
                <div className="self-start max-w-[90%] rounded-m px-3.5 py-2.5 text-[0.88rem] bg-surface-2 text-ink-faint border border-border">
                  考えています...
                </div>
              )}
            </div>

            {log.length === 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={thinking}
                    className="text-[0.78rem] border border-border rounded-full px-3 py-1.5 hover:bg-surface-2 disabled:opacity-60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 p-3 border-t border-border">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send(input);
                }}
                disabled={thinking}
                placeholder="質問を入力..."
                className="flex-1 border border-border rounded-s px-3 py-2 text-sm bg-surface-1 disabled:opacity-60"
              />
              <button
                onClick={() => send(input)}
                disabled={thinking}
                className="bg-accent text-white rounded-s px-3.5 py-2 text-sm font-medium hover:bg-accent-strong disabled:opacity-60"
              >
                送信
              </button>
            </div>
          </div>
        </>
      )}
    </ChatContext.Provider>
  );
}
