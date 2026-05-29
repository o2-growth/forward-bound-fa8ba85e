import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, AlertCircle, Sparkles, Send } from "lucide-react";
import type { AIMessage, UseAIChatResult } from "@/hooks/useAIChat";

interface AIChatDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chat: UseAIChatResult;
  /** Bloqueia input (ex.: contexto sintético sem dados reais). */
  disabledReason?: string | null;
  /** Painel de dossiê JSON exibido abaixo da 1ª resposta. */
  dossie?: Record<string, any> | null;
  dossieSummary?: React.ReactNode;
  width?: string;
}

function renderMarkdownish(text: string) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const headingMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-foreground">{headingMatch[1]}</h4>;
    }
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g).map((p, idx) => {
      const m = p.match(/^\*\*(.+)\*\*$/);
      return m ? <strong key={idx}>{m[1]}</strong> : <span key={idx}>{p}</span>;
    });
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const cleaned = trimmed.replace(/^[-*]\s/, "");
      const inner = cleaned.split(/(\*\*[^*]+\*\*)/g).map((p, idx) => {
        const m = p.match(/^\*\*(.+)\*\*$/);
        return m ? <strong key={idx}>{m[1]}</strong> : <span key={idx}>{p}</span>;
      });
      return <li key={i} className="ml-4 text-sm list-disc">{inner}</li>;
    }
    return <p key={i} className="text-sm leading-relaxed">{parts}</p>;
  });
}

function MessageBubble({ msg, isFirstAssistant, dossie, dossieSummary }: {
  msg: AIMessage;
  isFirstAssistant: boolean;
  dossie?: Record<string, any> | null;
  dossieSummary?: React.ReactNode;
}) {
  if (msg.role === "system") return null;
  if ((msg.metadata as any)?.hidden) return null;
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-lg border p-3 break-words ${
          isUser ? "bg-primary/10 border-primary/30" : "bg-card"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="space-y-1">{renderMarkdownish(msg.content)}</div>
        )}
        {isFirstAssistant && dossie && (
          <details className="mt-3 rounded border p-2 bg-muted/30 text-xs">
            <summary className="cursor-pointer font-medium text-muted-foreground flex items-center justify-between gap-2">
              <span>{dossieSummary ?? "Dossiê (JSON)"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(JSON.stringify(dossie, null, 2));
                }}
                className="text-[10px] px-2 py-0.5 rounded border bg-background hover:bg-muted"
              >
                Copiar JSON
              </button>
            </summary>
            <pre className="text-[10px] mt-2 overflow-x-auto max-h-96 whitespace-pre-wrap break-all bg-background p-2 rounded">
              {JSON.stringify(dossie, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export function AIChatDrawer({
  open,
  onClose,
  title,
  subtitle,
  chat,
  disabledReason,
  dossie,
  dossieSummary,
  width = "880px",
}: AIChatDrawerProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstAssistantId = useMemo(
    () => chat.messages.find((m) => m.role === "assistant")?.id ?? null,
    [chat.messages],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages.length, chat.isSending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chat.isSending || disabledReason) return;
    setInput("");
    try {
      await chat.sendMessage(text);
    } catch (e) {
      // erro já cai em chat.error; restaura input
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const errorText = chat.error instanceof Error ? chat.error.message : chat.error ? String(chat.error) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[95vw] overflow-hidden flex flex-col p-0"
        style={{ width }}
      >
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </SheetTitle>
          {subtitle && (
            <SheetDescription className="flex flex-wrap gap-2 text-xs">{subtitle}</SheetDescription>
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => chat.regenerate()}
              disabled={chat.isLoading || chat.isSending || !!disabledReason}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${chat.isLoading ? "animate-spin" : ""}`} />
              Regenerar análise
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-w-0" ref={scrollRef as any}>
          <div className="p-6 space-y-3">
            {disabledReason && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
                {disabledReason}
              </div>
            )}

            {chat.isLoading && chat.messages.length === 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando conversa…
                </div>
                <div className="space-y-2 mt-3">
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
                </div>
              </div>
            )}

            {errorText && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive">Erro</p>
                    <p className="text-xs text-muted-foreground break-words">{errorText}</p>
                  </div>
                </div>
              </div>
            )}

            {chat.messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                isFirstAssistant={m.id === firstAssistantId}
                dossie={m.id === firstAssistantId ? dossie : null}
                dossieSummary={dossieSummary}
              />
            ))}

            {chat.isSending && (
              <div className="flex justify-start">
                <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  digitando…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!disabledReason && (
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo de follow-up… (Enter envia, Shift+Enter quebra linha)"
              className="min-h-[44px] max-h-40 resize-none"
              disabled={chat.isSending || chat.isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chat.isSending || chat.isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
