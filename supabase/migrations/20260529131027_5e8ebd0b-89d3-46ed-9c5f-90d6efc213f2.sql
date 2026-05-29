
-- ai_conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type text NOT NULL,
  context_key text NOT NULL,
  title text,
  message_count integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ai_conversations_user_ctx_active_uniq
  ON public.ai_conversations (user_id, context_type, context_key)
  WHERE is_archived = false;

CREATE INDEX ai_conversations_user_idx
  ON public.ai_conversations (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own conversations"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own conversations"
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own conversations"
  ON public.ai_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own conversations"
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ai_messages
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_messages_conv_created_idx
  ON public.ai_messages (conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own messages"
  ON public.ai_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users insert own messages"
  ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users update own messages"
  ON public.ai_messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Users delete own messages"
  ON public.ai_messages FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = ai_messages.conversation_id AND c.user_id = auth.uid()
  ));

-- Trigger: incrementa message_count e atualiza updated_at na conversa
CREATE OR REPLACE FUNCTION public.ai_messages_after_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_conversations
    SET message_count = message_count + 1,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_messages_after_insert
AFTER INSERT ON public.ai_messages
FOR EACH ROW EXECUTE FUNCTION public.ai_messages_after_insert_fn();
