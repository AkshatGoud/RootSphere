import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/types/api";

interface Props {
  /** Where the trigger button sits on screen. */
  triggerPosition?: "bottom-right" | "bottom-right-low";
  /** Header label shown in the panel. */
  title: string;
  /** Subtitle under the header (e.g. "Local AI · Gemma 4"). */
  subtitle?: string;
  /** Empty-state copy. */
  emptyHint: string;
  /** Up to 4 quick-question chips shown in the empty state. */
  suggestions: string[];
  /** Function that calls the appropriate chat endpoint. */
  send: (body: ChatRequest) => Promise<ChatResponse>;
  /** Aria-label for the trigger button. */
  triggerLabel: string;
}

/**
 * Generic slide-out AI chat panel. Backs both:
 * - Field-level chat ("ask about THIS field")
 * - Dashboard chat ("ask about ALL my fields")
 *
 * The two only differ in the system prompt (built server-side from a
 * different context block) — UI is identical.
 */
export function ChatPanel({
  triggerPosition = "bottom-right",
  title,
  subtitle,
  emptyHint,
  suggestions,
  send,
  triggerLabel,
}: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (!isSending && open) inputRef.current?.focus();
  }, [isSending, open]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const historySnapshot = messages;
    setMessages([...historySnapshot, { role: "user", content: trimmed }]);
    setInput("");
    setIsSending(true);
    try {
      const { reply } = await send({ message: trimmed, history: historySnapshot });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${t("AI assistant is unavailable. Try again.")}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerPositionClass =
    triggerPosition === "bottom-right-low"
      ? "fixed bottom-6 right-6 z-40"
      : "fixed bottom-24 right-6 z-40";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={triggerLabel}
          className={`${triggerPositionClass} w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-slate-900 shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105`}
        >
          <span className="material-symbols-outlined text-2xl">forum</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background-light dark:bg-background-dark">
        <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <span className="material-symbols-outlined text-primary">forum</span>
            {title}
          </SheetTitle>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">psychology</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-xs">{emptyHint}</p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-slate-900 rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary animate-spin">progress_activity</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{t("Generating answer…")}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-surface-dark">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isSending}
              placeholder={t("Ask anything about this field…")}
              className="flex-1 h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              aria-label={t("Send")}
              className="w-11 h-11 rounded-lg bg-primary hover:bg-primary-dark text-slate-900 flex items-center justify-center shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t("Clear conversation")}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
