import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { api } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  reply: string;
  leadSaved: boolean;
}

const GREETING =
  "أهلًا بك في العمودي للتسويق العقاري 👋 معك مستشارك العقاري الذكي.\nاكتب لي ما تبحث عنه (المنطقة، نوع العقار، الميزانية...) وسأساعدك في إيجاد الأنسب.";

interface AIChatContextType {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  leadSaved: boolean;
  send: (text: string) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "greeting", role: "assistant", content: GREETING },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadSaved, setLeadSaved] = useState(false);
  const lastInput = useRef<string | null>(null);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((o) => !o), []);

  const runChat = useCallback(async (history: ChatMessage[]) => {
    setSending(true);
    setError(null);
    try {
      const payload = history
        .filter((m) => m.id !== "greeting")
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post<ChatResponse>("/ai/chat", { messages: payload });
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: "assistant", content: res.reply },
      ]);
      if (res.leadSaved) setLeadSaved(true);
      lastInput.current = null;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذّر الاتصال بالمستشار العقاري الذكي.";
      setError(message);
    } finally {
      setSending(false);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const userMsg: ChatMessage = { id: genId(), role: "user", content: trimmed };
      lastInput.current = trimmed;
      const next = [...messages, userMsg];
      setMessages(next);
      await runChat(next);
    },
    [messages, sending, runChat],
  );

  const retry = useCallback(async () => {
    if (sending) return;
    setError(null);
    // The last user message is already in `messages`; just re-run.
    await runChat(messages);
  }, [messages, sending, runChat]);

  const reset = useCallback(() => {
    setMessages([{ id: "greeting", role: "assistant", content: GREETING }]);
    setError(null);
    setLeadSaved(false);
    lastInput.current = null;
  }, []);

  return (
    <AIChatContext.Provider
      value={{
        open,
        openChat,
        closeChat,
        toggleChat,
        messages,
        sending,
        error,
        leadSaved,
        send,
        retry,
        reset,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat(): AIChatContextType {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error("useAIChat must be used inside AIChatProvider");
  return ctx;
}
