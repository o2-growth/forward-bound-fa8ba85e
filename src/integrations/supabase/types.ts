export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_email: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_email: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context_key: string
          context_type: string
          created_at: string
          id: string
          is_archived: boolean
          message_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_key: string
          context_type: string
          created_at?: string
          id?: string
          is_archived?: boolean
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_key?: string
          context_type?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          message_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_email: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_email?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_email?: string | null
        }
        Relationships: []
      }
      bu_indicators_config: {
        Row: {
          bu: string
          cpmql: number
          cpv: number
          created_at: string
          id: string
          investimento_planejado: number
          month: string
          mql_to_rm: number
          prop_to_venda: number
          rm_to_rr: number
          rr_to_prop: number
          ticket_medio: number
          updated_at: string
        }
        Insert: {
          bu: string
          cpmql?: number
          cpv?: number
          created_at?: string
          id?: string
          investimento_planejado?: number
          month: string
          mql_to_rm?: number
          prop_to_venda?: number
          rm_to_rr?: number
          rr_to_prop?: number
          ticket_medio?: number
          updated_at?: string
        }
        Update: {
          bu?: string
          cpmql?: number
          cpv?: number
          created_at?: string
          id?: string
          investimento_planejado?: number
          month?: string
          mql_to_rm?: number
          prop_to_venda?: number
          rm_to_rr?: number
          rr_to_prop?: number
          ticket_medio?: number
          updated_at?: string
        }
        Relationships: []
      }
      bu_indicators_config_backup_20260512_modelo_atual: {
        Row: {
          bu: string | null
          cpmql: number | null
          cpv: number | null
          created_at: string | null
          id: string | null
          investimento_planejado: number | null
          month: string | null
          mql_to_rm: number | null
          prop_to_venda: number | null
          rm_to_rr: number | null
          rr_to_prop: number | null
          ticket_medio: number | null
          updated_at: string | null
        }
        Insert: {
          bu?: string | null
          cpmql?: number | null
          cpv?: number | null
          created_at?: string | null
          id?: string | null
          investimento_planejado?: number | null
          month?: string | null
          mql_to_rm?: number | null
          prop_to_venda?: number | null
          rm_to_rr?: number | null
          rr_to_prop?: number | null
          ticket_medio?: number | null
          updated_at?: string | null
        }
        Update: {
          bu?: string | null
          cpmql?: number | null
          cpv?: number | null
          created_at?: string | null
          id?: string | null
          investimento_planejado?: number | null
          month?: string | null
          mql_to_rm?: number | null
          prop_to_venda?: number | null
          rm_to_rr?: number | null
          rr_to_prop?: number | null
          ticket_medio?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bu_indicators_config_backup_20260512_v2_pre_churn: {
        Row: {
          bu: string | null
          cpmql: number | null
          cpv: number | null
          created_at: string | null
          id: string | null
          investimento_planejado: number | null
          month: string | null
          mql_to_rm: number | null
          prop_to_venda: number | null
          rm_to_rr: number | null
          rr_to_prop: number | null
          ticket_medio: number | null
          updated_at: string | null
        }
        Insert: {
          bu?: string | null
          cpmql?: number | null
          cpv?: number | null
          created_at?: string | null
          id?: string | null
          investimento_planejado?: number | null
          month?: string | null
          mql_to_rm?: number | null
          prop_to_venda?: number | null
          rm_to_rr?: number | null
          rr_to_prop?: number | null
          ticket_medio?: number | null
          updated_at?: string | null
        }
        Update: {
          bu?: string | null
          cpmql?: number | null
          cpv?: number | null
          created_at?: string | null
          id?: string | null
          investimento_planejado?: number | null
          month?: string | null
          mql_to_rm?: number | null
          prop_to_venda?: number | null
          rm_to_rr?: number | null
          rr_to_prop?: number | null
          ticket_medio?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bu_investment_snapshots: {
        Row: {
          bu: string
          created_at: string
          id: string
          investimento_anterior: number
          investimento_novo: number
          month: string
          reason: string | null
          was_locked: boolean
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          id?: string
          investimento_anterior?: number
          investimento_novo?: number
          month: string
          reason?: string | null
          was_locked?: boolean
          year: number
        }
        Update: {
          bu?: string
          created_at?: string
          id?: string
          investimento_anterior?: number
          investimento_novo?: number
          month?: string
          reason?: string | null
          was_locked?: boolean
          year?: number
        }
        Relationships: []
      }
      cfo_squad_assignment: {
        Row: {
          cfo_squad_nome: string
          created_at: string
          id: string
          pessoa_id: string | null
          pessoa_nome: string
          role: string
          updated_at: string
        }
        Insert: {
          cfo_squad_nome: string
          created_at?: string
          id?: string
          pessoa_id?: string | null
          pessoa_nome: string
          role: string
          updated_at?: string
        }
        Update: {
          cfo_squad_nome?: string
          created_at?: string
          id?: string
          pessoa_id?: string | null
          pessoa_nome?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      cfo_user_mapping: {
        Row: {
          cfo_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cfo_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cfo_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cliente_slack_channels: {
        Row: {
          channel_id: string
          channel_name: string
          cliente_id: string
          created_at: string
          set_by: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          cliente_id: string
          created_at?: string
          set_by?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          cliente_id?: string
          created_at?: string
          set_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      closer_absolute_metas: {
        Row: {
          closer: string
          created_at: string
          faturamento_meta: number
          id: string
          month: string
          prop_meta: number
          rm_meta: number
          rr_meta: number
          updated_at: string
          venda_meta: number
          year: number
        }
        Insert: {
          closer: string
          created_at?: string
          faturamento_meta?: number
          id?: string
          month: string
          prop_meta?: number
          rm_meta?: number
          rr_meta?: number
          updated_at?: string
          venda_meta?: number
          year?: number
        }
        Update: {
          closer?: string
          created_at?: string
          faturamento_meta?: number
          id?: string
          month?: string
          prop_meta?: number
          rm_meta?: number
          rr_meta?: number
          updated_at?: string
          venda_meta?: number
          year?: number
        }
        Relationships: []
      }
      closer_absolute_metas_backup_20260706_jul: {
        Row: {
          closer: string | null
          created_at: string | null
          faturamento_meta: number | null
          id: string | null
          month: string | null
          prop_meta: number | null
          rm_meta: number | null
          rr_meta: number | null
          updated_at: string | null
          venda_meta: number | null
          year: number | null
        }
        Insert: {
          closer?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          id?: string | null
          month?: string | null
          prop_meta?: number | null
          rm_meta?: number | null
          rr_meta?: number | null
          updated_at?: string | null
          venda_meta?: number | null
          year?: number | null
        }
        Update: {
          closer?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          id?: string | null
          month?: string | null
          prop_meta?: number | null
          rm_meta?: number | null
          rr_meta?: number | null
          updated_at?: string | null
          venda_meta?: number | null
          year?: number | null
        }
        Relationships: []
      }
      closer_metas: {
        Row: {
          bu: string
          closer: string
          created_at: string
          id: string
          month: string
          percentage: number
          updated_at: string
          year: number
        }
        Insert: {
          bu: string
          closer: string
          created_at?: string
          id?: string
          month: string
          percentage?: number
          updated_at?: string
          year?: number
        }
        Update: {
          bu?: string
          closer?: string
          created_at?: string
          id?: string
          month?: string
          percentage?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      commercial_insights_snapshots: {
        Row: {
          generated_at: string
          id: string
          insights: Json
          label: string | null
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          insights?: Json
          label?: string | null
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          insights?: Json
          label?: string | null
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_stage_metas: {
        Row: {
          cpl: number
          cpmql: number
          cpp: number
          cprm: number
          cprr: number
          cpv: number
          created_at: string
          id: string
          month: string
          updated_at: string
          year: number
        }
        Insert: {
          cpl?: number
          cpmql?: number
          cpp?: number
          cprm?: number
          cprr?: number
          cpv?: number
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          year?: number
        }
        Update: {
          cpl?: number
          cpmql?: number
          cpp?: number
          cprm?: number
          cprr?: number
          cpv?: number
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      daily_revenue: {
        Row: {
          caas: number
          customer_count: number
          date: string
          expansao: number
          id: string
          saas: number
          source: string
          synced_at: string
          tax: number
          total_inflows: number
          year: number
        }
        Insert: {
          caas?: number
          customer_count?: number
          date: string
          expansao?: number
          id?: string
          saas?: number
          source?: string
          synced_at?: string
          tax?: number
          total_inflows?: number
          year: number
        }
        Update: {
          caas?: number
          customer_count?: number
          date?: string
          expansao?: number
          id?: string
          saas?: number
          source?: string
          synced_at?: string
          tax?: number
          total_inflows?: number
          year?: number
        }
        Relationships: []
      }
      dre_supplier_alias: {
        Row: {
          created_at: string
          id: string
          label_normalizado: string
          label_original: string
          pessoa_id: string | null
          pessoa_nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_normalizado: string
          label_original: string
          pessoa_id?: string | null
          pessoa_nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label_normalizado?: string
          label_original?: string
          pessoa_id?: string | null
          pessoa_nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_investments: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          month: number
          updated_at: string
          updated_by: string | null
          valor: number
          year: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          month: number
          updated_at?: string
          updated_by?: string | null
          valor?: number
          year: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          month?: number
          updated_at?: string
          updated_by?: string | null
          valor?: number
          year?: number
        }
        Relationships: []
      }
      funnel_metas: {
        Row: {
          bu: string
          created_at: string
          faturamento_meta: number
          faturamento_vender: number
          id: string
          investimento: number
          is_locked: boolean
          leads: number
          month: string
          mqls: number
          mrr_base_planejamento: number
          propostas: number
          rms: number
          rrs: number
          updated_at: string
          vendas: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          faturamento_meta?: number
          faturamento_vender?: number
          id?: string
          investimento?: number
          is_locked?: boolean
          leads?: number
          month: string
          mqls?: number
          mrr_base_planejamento?: number
          propostas?: number
          rms?: number
          rrs?: number
          updated_at?: string
          vendas?: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          faturamento_meta?: number
          faturamento_vender?: number
          id?: string
          investimento?: number
          is_locked?: boolean
          leads?: number
          month?: string
          mqls?: number
          mrr_base_planejamento?: number
          propostas?: number
          rms?: number
          rrs?: number
          updated_at?: string
          vendas?: number
          year?: number
        }
        Relationships: []
      }
      funnel_metas_backup_20260512: {
        Row: {
          bu: string | null
          created_at: string | null
          faturamento_meta: number | null
          faturamento_vender: number | null
          id: string | null
          investimento: number | null
          is_locked: boolean | null
          leads: number | null
          month: string | null
          mqls: number | null
          mrr_base_planejamento: number | null
          propostas: number | null
          rms: number | null
          rrs: number | null
          updated_at: string | null
          vendas: number | null
          year: number | null
        }
        Insert: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Update: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Relationships: []
      }
      funnel_metas_backup_20260512_modelo_atual_v2: {
        Row: {
          bu: string | null
          created_at: string | null
          faturamento_meta: number | null
          faturamento_vender: number | null
          id: string | null
          investimento: number | null
          is_locked: boolean | null
          leads: number | null
          month: string | null
          mqls: number | null
          mrr_base_planejamento: number | null
          propostas: number | null
          rms: number | null
          rrs: number | null
          updated_at: string | null
          vendas: number | null
          year: number | null
        }
        Insert: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Update: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Relationships: []
      }
      funnel_metas_backup_20260512_v3_pre_churn: {
        Row: {
          bu: string | null
          created_at: string | null
          faturamento_meta: number | null
          faturamento_vender: number | null
          id: string | null
          investimento: number | null
          is_locked: boolean | null
          leads: number | null
          month: string | null
          mqls: number | null
          mrr_base_planejamento: number | null
          propostas: number | null
          rms: number | null
          rrs: number | null
          updated_at: string | null
          vendas: number | null
          year: number | null
        }
        Insert: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Update: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Relationships: []
      }
      funnel_metas_backup_20260709_jul_modelo_atual: {
        Row: {
          bu: string | null
          created_at: string | null
          faturamento_meta: number | null
          faturamento_vender: number | null
          id: string | null
          investimento: number | null
          is_locked: boolean | null
          leads: number | null
          month: string | null
          mqls: number | null
          mrr_base_planejamento: number | null
          propostas: number | null
          rms: number | null
          rrs: number | null
          updated_at: string | null
          vendas: number | null
          year: number | null
        }
        Insert: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Update: {
          bu?: string | null
          created_at?: string | null
          faturamento_meta?: number | null
          faturamento_vender?: number | null
          id?: string | null
          investimento?: number | null
          is_locked?: boolean | null
          leads?: number | null
          month?: string | null
          mqls?: number | null
          mrr_base_planejamento?: number | null
          propostas?: number | null
          rms?: number | null
          rrs?: number | null
          updated_at?: string | null
          vendas?: number | null
          year?: number | null
        }
        Relationships: []
      }
      funnel_realized: {
        Row: {
          bu: string
          created_at: string
          date: string | null
          id: string
          indicator: string
          month: string
          updated_at: string
          value: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          date?: string | null
          id?: string
          indicator: string
          month: string
          updated_at?: string
          value?: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          date?: string | null
          id?: string
          indicator?: string
          month?: string
          updated_at?: string
          value?: number
          year?: number
        }
        Relationships: []
      }
      meta_ads_cache: {
        Row: {
          cache_key: string
          data: Json
          expires_at: string
          fetched_at: string | null
          id: string
        }
        Insert: {
          cache_key: string
          data: Json
          expires_at: string
          fetched_at?: string | null
          id?: string
        }
        Update: {
          cache_key?: string
          data?: Json
          expires_at?: string
          fetched_at?: string | null
          id?: string
        }
        Relationships: []
      }
      meta_redistribution_changes: {
        Row: {
          bu: string
          created_at: string
          delta: number
          field: string
          id: string
          month: string
          session_id: string
          value_after: number
          value_before: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          delta?: number
          field: string
          id?: string
          month: string
          session_id: string
          value_after?: number
          value_before?: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          delta?: number
          field?: string
          id?: string
          month?: string
          session_id?: string
          value_after?: number
          value_before?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_redistribution_changes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "meta_redistribution_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_redistribution_sessions: {
        Row: {
          changes_count: number
          created_at: string
          description: string
          id: string
          is_active: boolean
          total_after: number
          total_before: number
          user_id: string
        }
        Insert: {
          changes_count?: number
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          total_after?: number
          total_before?: number
          user_id: string
        }
        Update: {
          changes_count?: number
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          total_after?: number
          total_before?: number
          user_id?: string
        }
        Relationships: []
      }
      monetary_metas: {
        Row: {
          bu: string
          created_at: string
          faturamento: number | null
          id: string
          month: string
          mrr: number | null
          pontual: number | null
          setup: number | null
          ticket_medio: number
          updated_at: string
          vendas: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          faturamento?: number | null
          id?: string
          month: string
          mrr?: number | null
          pontual?: number | null
          setup?: number | null
          ticket_medio?: number
          updated_at?: string
          vendas?: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          faturamento?: number | null
          id?: string
          month?: string
          mrr?: number | null
          pontual?: number | null
          setup?: number | null
          ticket_medio?: number
          updated_at?: string
          vendas?: number
          year?: number
        }
        Relationships: []
      }
      mrr_base_monthly: {
        Row: {
          created_at: string
          id: string
          is_total_override: boolean
          month: string
          updated_at: string
          value: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_total_override?: boolean
          month: string
          updated_at?: string
          value?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_total_override?: boolean
          month?: string
          updated_at?: string
          value?: number
          year?: number
        }
        Relationships: []
      }
      mrr_base_monthly_backup_20260512_pre_churn: {
        Row: {
          created_at: string | null
          id: string | null
          is_total_override: boolean | null
          month: string | null
          updated_at: string | null
          value: number | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_total_override?: boolean | null
          month?: string | null
          updated_at?: string | null
          value?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_total_override?: boolean | null
          month?: string | null
          updated_at?: string | null
          value?: number | null
          year?: number | null
        }
        Relationships: []
      }
      okr_metas: {
        Row: {
          created_at: string
          direction: string
          display_order: number
          id: string
          is_active: boolean
          kr_key: string
          label: string
          period: string
          quarter: number | null
          target_value: number
          unit: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          direction?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kr_key: string
          label: string
          period: string
          quarter?: number | null
          target_value: number
          unit?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          direction?: string
          display_order?: number
          id?: string
          is_active?: boolean
          kr_key?: string
          label?: string
          period?: string
          quarter?: number | null
          target_value?: number
          unit?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      personnel_dre_groups_config: {
        Row: {
          group_ids: Json
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          group_ids?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          group_ids?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      personnel_dre_mapping: {
        Row: {
          created_at: string
          created_by: string | null
          dre_label: string
          dre_label_original: string
          group_id: string | null
          group_label: string | null
          id: string
          is_ignored: boolean
          pessoa_id: string | null
          pessoa_nome: string | null
          pessoa_time: string | null
          team_split: Json
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dre_label: string
          dre_label_original: string
          group_id?: string | null
          group_label?: string | null
          id?: string
          is_ignored?: boolean
          pessoa_id?: string | null
          pessoa_nome?: string | null
          pessoa_time?: string | null
          team_split?: Json
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dre_label?: string
          dre_label_original?: string
          group_id?: string | null
          group_label?: string | null
          id?: string
          is_ignored?: boolean
          pessoa_id?: string | null
          pessoa_nome?: string | null
          pessoa_time?: string | null
          team_split?: Json
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_realized: {
        Row: {
          bu: string
          created_at: string
          id: string
          month: string
          updated_at: string
          value: number
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          value?: number
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          value?: number
          year?: number
        }
        Relationships: []
      }
      sdr_metas: {
        Row: {
          bu: string
          created_at: string
          id: string
          month: string
          rm_meta: number
          rr_meta: number
          sdr: string
          updated_at: string
          year: number
        }
        Insert: {
          bu: string
          created_at?: string
          id?: string
          month: string
          rm_meta?: number
          rr_meta?: number
          sdr: string
          updated_at?: string
          year?: number
        }
        Update: {
          bu?: string
          created_at?: string
          id?: string
          month?: string
          rm_meta?: number
          rr_meta?: number
          sdr?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sdr_metas_backup_20260706_jul_modelo_atual: {
        Row: {
          bu: string | null
          created_at: string | null
          id: string | null
          month: string | null
          rm_meta: number | null
          rr_meta: number | null
          sdr: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          bu?: string | null
          created_at?: string | null
          id?: string | null
          month?: string | null
          rm_meta?: number | null
          rr_meta?: number | null
          sdr?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          bu?: string | null
          created_at?: string | null
          id?: string | null
          month?: string | null
          rm_meta?: number | null
          rr_meta?: number | null
          sdr?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tab_permissions: {
        Row: {
          created_at: string
          id: string
          tab_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tab_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tab_key?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_cfo_name: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rollback_redistribution_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      save_redistribution_session: {
        Args: {
          p_changes: Json
          p_description: string
          p_total_after: number
          p_total_before: number
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "cfo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "cfo"],
    },
  },
} as const
