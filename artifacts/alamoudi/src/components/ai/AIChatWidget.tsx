import { useEffect, useRef, useState } from "react";
import { X, Send, RefreshCw, Bot, User, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAIChat, type ChatMessage } from "@/context/AIChatContext";

// Renders assistant text and turns internal property links (/properties/:id) into
// in-app links, while keeping everything else as plain text (no HTML injection).
function MessageContent({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts = text.split(/(\/properties\/[A-Za-z0-9_-]+)/g);
  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        if (/^\/properties\/[A-Za-z0-9_-]+$/.test(part)) {
          return (
            <Link
              key={i}
              href={part}
              onClick={onNavigate}
              className="text-accent underline underline-offset-2 font-medium hover:opacity-80"
            >
              عرض العقار
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function Bubble({ msg, onNavigate }: { msg: ChatMessage; onNavigate: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
      <span
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent/15 text-accent",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        <MessageContent text={msg.content} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center">
        <Bot className="h-4 w-4" />
      </span>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
        </span>
      </div>
    </div>
  );
}

export function AIChatWidget() {
  const { open, openChat, closeChat, messages, sending, error, leadSaved, send, retry } =
    useAIChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, error]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const submit = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void send(text);
  };

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={openChat}
          aria-label="مستشارك الذكي"
          className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 pl-4 pr-2.5 py-2.5 hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="animate-ai-pulse flex items-center justify-center h-8 w-8 rounded-full bg-white text-accent shadow-sm">
            <span className="text-[13px] font-extrabold tracking-tight leading-none">AI</span>
          </span>
          <span className="hidden sm:inline text-sm font-semibold">مستشارك الذكي</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={closeChat}
            aria-hidden="true"
          />
          <div
            className="fixed z-50 flex flex-col bg-background shadow-2xl border border-border overflow-hidden
              inset-x-0 bottom-0 h-[88dvh] rounded-t-2xl
              sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[85vh] sm:w-[400px] sm:rounded-2xl"
            role="dialog"
            aria-label="مستشارك العقاري الذكي"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-accent to-accent/80 text-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-white text-accent flex items-center justify-center shadow-sm">
                  <span className="text-[13px] font-extrabold tracking-tight leading-none">AI</span>
                </span>
                <div className="leading-tight">
                  <p className="font-bold text-sm">مستشارك العقاري الذكي</p>
                  <p className="text-[11px] text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300" /> متصل الآن
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-muted/20">
              {messages.map((m) => (
                <Bubble key={m.id} msg={m} onNavigate={closeChat} />
              ))}
              {sending && <TypingIndicator />}
              {leadSaved && (
                <div className="text-center text-[11px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg py-1.5 px-3">
                  ✓ تم حفظ طلبك وسيتواصل معك فريقنا قريبًا
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => void retry()}
                  >
                    <RefreshCw className="h-3 w-3 ml-1" /> إعادة
                  </Button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-border bg-background p-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 resize-none max-h-28 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-muted-foreground"
                />
                <Button
                  onClick={submit}
                  disabled={!input.trim() || sending}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0"
                  aria-label="إرسال"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                مدعوم بالذكاء الاصطناعي · قد تحدث أخطاء
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
