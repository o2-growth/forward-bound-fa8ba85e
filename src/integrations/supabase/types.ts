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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
