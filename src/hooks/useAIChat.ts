import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { systemPromptFor, type AIContextType } from "./aiSystemPrompts";

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  context_type: string;
  context_key: string;
  title: string | null;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UseAIChatResult {
  conversation: AIConversation | null;
  messages: AIMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: unknown;
  sendMessage: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
}

/**
 * Hook que carrega (ou cria) a conversa de IA para um contexto específico do usuário logado.
 *
 * Fluxo:
 *  1. Procura conversa ativa por (user_id, context_type, context_key).
 *  2. Se não existir, chama `createInitial()` (passado pelo wrapper específico do contexto)
 *     para gerar a primeira análise via edge function legada e cria a conversa + msg system + msg assistant.
 *  3. Expõe sendMessage (edge function `ai-chat`) e regenerate (arquiva atual + recria).
 */
export function useAIChat(opts: {
  contextType: AIContextType;
  contextKey: string | null;
  title: string | null;
  enabled?: boolean;
  /** Gera a primeira análise. Deve retornar texto markdown + metadados (ex.: dossiê) a salvar como assistant. */
  createInitial: () => Promise<{ analysis: string; metadata?: Record<string, any> }>;
}): UseAIChatResult {
  const { contextType, contextKey, title, enabled = true, createInitial } = opts;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-chat", contextType, contextKey],
    enabled: enabled && !!contextKey,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<{ conversation: AIConversation; messages: AIMessage[] }> => {
      if (!contextKey) throw new Error("contextKey ausente");

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Usuário não autenticado");
      const userId = userData.user.id;

      // 1) tenta carregar conversa ativa
      const { data: existing, error: selErr } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("context_type", contextType)
        .eq("context_key", contextKey)
        .eq("is_archived", false)
        .maybeSingle();
      if (selErr) throw selErr;

      if (existing) {
        const { data: msgs, error: msgsErr } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("conversation_id", existing.id)
          .order("created_at", { ascending: true });
        if (msgsErr) throw msgsErr;
        return { conversation: existing as AIConversation, messages: (msgs ?? []) as AIMessage[] };
      }

      // 2) cria primeira análise
      const initial = await createInitial();

      const { data: convInserted, error: convInsErr } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          context_type: contextType,
          context_key: contextKey,
          title: title ?? null,
        })
        .select("*")
        .single();
      if (convInsErr) throw convInsErr;

      const conversation = convInserted as AIConversation;

      const seedMessages = [
        {
          conversation_id: conversation.id,
          role: "system" as const,
          content: systemPromptFor(contextType),
        },
        {
          conversation_id: conversation.id,
          role: "assistant" as const,
          content: initial.analysis,
          metadata: initial.metadata ?? null,
        },
      ];

      const { data: insertedMsgs, error: insMsgErr } = await supabase
        .from("ai_messages")
        .insert(seedMessages)
        .select("*");
      if (insMsgErr) throw insMsgErr;

      const ordered = [...(insertedMsgs ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) as AIMessage[];

      return { conversation, messages: ordered };
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const conversation = query.data?.conversation;
      if (!conversation) throw new Error("Conversa não carregada");
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { conversation_id: conversation.id, user_message: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { assistant_message: AIMessage; conversation_id: string };
    },
    onMutate: async (text: string) => {
      // optimistic: adiciona msg user imediatamente
      const conv = query.data?.conversation;
      if (!conv) return;
      qc.setQueryData(["ai-chat", contextType, contextKey], (prev: any) => {
        if (!prev) return prev;
        const optimistic: AIMessage = {
          id: `optimistic-${Date.now()}`,
          role: "user",
          content: text,
          metadata: null,
          created_at: new Date().toISOString(),
        };
        return { ...prev, messages: [...prev.messages, optimistic] };
      });
    },
    onSuccess: async () => {
      // recarrega mensagens reais
      const conv = query.data?.conversation;
      if (!conv) return;
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      qc.setQueryData(["ai-chat", contextType, contextKey], (prev: any) =>
        prev ? { ...prev, messages: (msgs ?? []) as AIMessage[] } : prev,
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["ai-chat", contextType, contextKey] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const conv = query.data?.conversation;
      if (conv) {
        const { error } = await supabase
          .from("ai_conversations")
          .update({ is_archived: true })
          .eq("id", conv.id);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["ai-chat", contextType, contextKey] });
    },
  });

  return {
    conversation: query.data?.conversation ?? null,
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading || query.isFetching,
    isSending: sendMutation.isPending || regenerateMutation.isPending,
    error: query.error ?? sendMutation.error ?? regenerateMutation.error,
    sendMessage: async (text) => { await sendMutation.mutateAsync(text); },
    regenerate: async () => { await regenerateMutation.mutateAsync(); },
  };
}
