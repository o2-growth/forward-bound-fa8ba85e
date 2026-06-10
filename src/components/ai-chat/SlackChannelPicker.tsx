import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hash, Link2, Loader2, Search, X } from "lucide-react";

interface SlackChannel {
  id: string;
  name: string;
  member_count: number | null;
}

interface SlackChannelPickerProps {
  /** ID do cliente (mesmo enviado ao analyze-cliente-360). */
  clienteId: string;
  /** Canal atualmente vinculado (vem do dossiê `cliente360.slack`). */
  currentChannel: { id: string; name: string; member_count?: number | null } | null;
  /** Origem do vínculo: "override" (manual) ou "heuristic" (automático). */
  source: "override" | "heuristic" | null;
  /** Total de mensagens da janela já carregada (apenas para exibição). */
  messagesCount?: number;
  /** Chamado após salvar/remover override para recarregar o dossiê. */
  onChanged: () => void | Promise<void>;
}

export function SlackChannelPicker({
  clienteId,
  currentChannel,
  source,
  messagesCount,
  onChanged,
}: SlackChannelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    console.log("[SlackChannelPicker] open state changed:", { open, clienteId });
  }, [open, clienteId]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    console.log("[SlackChannelPicker] fetching list_channels", { query: debouncedQuery });
    (async () => {
      try {
        const t0 = performance.now();
        const { data, error } = await supabase.functions.invoke("query-slack-db", {
          body: { action: "list_channels", query: debouncedQuery, limit: 30 },
        });
        const dt = Math.round(performance.now() - t0);
        if (error) throw error;
        const channels = (data?.channels ?? []) as SlackChannel[];
        console.log("[SlackChannelPicker] list_channels OK", { count: channels.length, ms: dt });
        if (!cancel) setResults(channels);
      } catch (err: any) {
        console.error("[SlackChannelPicker] list_channels FAIL", err);
        if (!cancel) toast.error(`Falha ao listar canais: ${err?.message ?? err}`);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, debouncedQuery]);

  const linkChannel = async (channel: SlackChannel) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("cliente_slack_channels")
        .upsert({
          cliente_id: clienteId,
          channel_id: channel.id,
          channel_name: channel.name,
          set_by: userData?.user?.id ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "cliente_id" });
      if (error) throw error;
      toast.success(`Canal #${channel.name} vinculado`, {
        description: "Recarregando dossiê com o histórico de mensagens deste canal…",
      });
      setOpen(false);
      await onChanged();
    } catch (err: any) {
      toast.error(`Erro ao vincular: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const removeOverride = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cliente_slack_channels")
        .delete()
        .eq("cliente_id", clienteId);
      if (error) throw error;
      toast.success("Vínculo manual removido — voltou à heurística automática");
      setOpen(false);
      await onChanged();
    } catch (err: any) {
      toast.error(`Erro ao remover: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const label = useMemo(() => {
    if (currentChannel) {
      const suffix = typeof messagesCount === "number" ? ` · ${messagesCount} msgs` : "";
      return `#${currentChannel.name}${suffix}`;
    }
    return "Sem canal Slack vinculado";
  }, [currentChannel, messagesCount]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant={currentChannel ? "secondary" : "outline"}
          className="cursor-pointer text-[10px] font-normal gap-1 hover:bg-secondary/80"
          title="Clique para trocar o canal Slack vinculado"
        >
          {currentChannel ? <Hash className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
          {label}
          {source === "override" && currentChannel && (
            <span className="text-[9px] opacity-70">(manual)</span>
          )}
          {source === "heuristic" && currentChannel && (
            <span className="text-[9px] opacity-70">(auto)</span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 z-[100]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 border-b">
          <div className="text-xs font-semibold mb-2">Canal Slack do cliente</div>
          {currentChannel ? (
            <div className="text-[11px] text-muted-foreground mb-2">
              Atual: <span className="font-mono">#{currentChannel.name}</span>
              {source === "override" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 ml-2 text-[10px]"
                  onClick={removeOverride}
                  disabled={saving}
                >
                  <X className="h-3 w-3 mr-1" /> Desvincular
                </Button>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground mb-2">
              Nenhum canal vinculado. Selecione um abaixo.
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar canal (ex.: interno-faster)"
              className="h-8 text-xs pl-7"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Carregando…
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum canal encontrado
            </div>
          ) : (
            <ul className="py-1">
              {results.map((c) => {
                const isCurrent = c.id === currentChannel?.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={saving || isCurrent}
                      onClick={() => linkChannel(c)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
                    >
                      <span className="font-mono truncate">#{c.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {isCurrent ? "atual" : c.member_count != null ? `${c.member_count} membros` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
