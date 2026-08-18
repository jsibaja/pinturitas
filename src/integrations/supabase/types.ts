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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description_es: string | null
          icon_path: string | null
          id: string
          name_es: string
          rule: Json
          sort_order: number
        }
        Insert: {
          code: string
          description_es?: string | null
          icon_path?: string | null
          id?: string
          name_es: string
          rule?: Json
          sort_order?: number
        }
        Update: {
          code?: string
          description_es?: string | null
          icon_path?: string | null
          id?: string
          name_es?: string
          rule?: Json
          sort_order?: number
        }
        Relationships: []
      }
      artworks: {
        Row: {
          canvas_state: Json
          child_id: string
          completed_at: string | null
          created_at: string
          drawing_id: string
          id: string
          is_completed: boolean
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          canvas_state?: Json
          child_id: string
          completed_at?: string | null
          created_at?: string
          drawing_id: string
          id?: string
          is_completed?: boolean
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          canvas_state?: Json
          child_id?: string
          completed_at?: string | null
          created_at?: string
          drawing_id?: string
          id?: string
          is_completed?: boolean
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artworks_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      child_achievements: {
        Row: {
          achievement_id: string
          child_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          child_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          child_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_achievements_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar_key: string | null
          birth_year: number | null
          created_at: string
          id: string
          name: string
          parent_id: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          avatar_key?: string | null
          birth_year?: number | null
          created_at?: string
          id?: string
          name: string
          parent_id: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          avatar_key?: string | null
          birth_year?: number | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity: {
        Row: {
          activity_date: string
          child_id: string
          drawings_colored: number
          id: string
          minutes: number
          words_reviewed: number
        }
        Insert: {
          activity_date: string
          child_id: string
          drawings_colored?: number
          id?: string
          minutes?: number
          words_reviewed?: number
        }
        Update: {
          activity_date?: string
          child_id?: string
          drawings_colored?: number
          id?: string
          minutes?: number
          words_reviewed?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          article_en: string | null
          audio_path: string | null
          created_at: string
          fun_fact_es: string | null
          id: string
          is_active: boolean
          line_art_path: string | null
          name_en: string
          name_es: string
          phonetic_es: string | null
          plural_en: string | null
          preview_image_path: string | null
          regions: Json
          sample_sentence_en: string | null
          sample_sentence_es: string | null
          slug: string
          sort_order: number
          updated_at: string
          world_id: string
        }
        Insert: {
          article_en?: string | null
          audio_path?: string | null
          created_at?: string
          fun_fact_es?: string | null
          id?: string
          is_active?: boolean
          line_art_path?: string | null
          name_en: string
          name_es: string
          phonetic_es?: string | null
          plural_en?: string | null
          preview_image_path?: string | null
          regions?: Json
          sample_sentence_en?: string | null
          sample_sentence_es?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          world_id: string
        }
        Update: {
          article_en?: string | null
          audio_path?: string | null
          created_at?: string
          fun_fact_es?: string | null
          id?: string
          is_active?: boolean
          line_art_path?: string | null
          name_en?: string
          name_es?: string
          phonetic_es?: string | null
          plural_en?: string | null
          preview_image_path?: string | null
          regions?: Json
          sample_sentence_en?: string | null
          sample_sentence_es?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          error: string | null
          id: string
          provider_message_id: string | null
          sent_at: string
          status: string
          template_code: string
          to_email: string
          user_id: string | null
        }
        Insert: {
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status: string
          template_code: string
          to_email: string
          user_id?: string | null
        }
        Update: {
          error?: string | null
          id?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          template_code?: string
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          child_id: string
          created_at: string
          drawing_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          drawing_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          drawing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          child_id: string
          correct_count: number
          duration_seconds: number
          game_type: string
          id: string
          played_at: string
          score: number
          wrong_count: number
        }
        Insert: {
          child_id: string
          correct_count?: number
          duration_seconds?: number
          game_type: string
          id?: string
          played_at?: string
          score?: number
          wrong_count?: number
        }
        Update: {
          child_id?: string
          correct_count?: number
          duration_seconds?: number
          game_type?: string
          id?: string
          played_at?: string
          score?: number
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      palette_colors: {
        Row: {
          hex: string
          id: string
          name_en: string
          name_es: string
          phonetic_es: string | null
          sort_order: number
        }
        Insert: {
          hex: string
          id?: string
          name_en: string
          name_es: string
          phonetic_es?: string | null
          sort_order?: number
        }
        Update: {
          hex?: string
          id?: string
          name_en?: string
          name_es?: string
          phonetic_es?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      parent_notes: {
        Row: {
          body: string
          child_id: string
          created_at: string
          drawing_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          body: string
          child_id: string
          created_at?: string
          drawing_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          child_id?: string
          created_at?: string
          drawing_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notes_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notes_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          external_id: string
          id: string
          payload: Json
          provider: string
          received_at: string
          subscription_id: string | null
        }
        Insert: {
          event_type: string
          external_id: string
          id?: string
          payload: Json
          provider: string
          received_at?: string
          subscription_id?: string | null
        }
        Update: {
          event_type?: string
          external_id?: string
          id?: string
          payload?: Json
          provider?: string
          received_at?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          hotmart_offer_code: string | null
          id: string
          is_active: boolean
          is_best_value: boolean
          months: number
          name: string
          price_usd: number
          sort_order: number
        }
        Insert: {
          billing_interval: string
          code: string
          hotmart_offer_code?: string | null
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          months: number
          name: string
          price_usd: number
          sort_order?: number
        }
        Update: {
          billing_interval?: string
          code?: string
          hotmart_offer_code?: string | null
          id?: string
          is_active?: boolean
          is_best_value?: boolean
          months?: number
          name?: string
          price_usd?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          external_reference: string | null
          hotmart_offer_code: string | null
          hotmart_subscriber_code: string | null
          id: string
          plan_id: string
          raw_payload: Json | null
          renews_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          external_reference?: string | null
          hotmart_offer_code?: string | null
          hotmart_subscriber_code?: string | null
          id?: string
          plan_id: string
          raw_payload?: Json | null
          renews_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          external_reference?: string | null
          hotmart_offer_code?: string | null
          hotmart_subscriber_code?: string | null
          id?: string
          plan_id?: string
          raw_payload?: Json | null
          renews_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          created_at: string
          daily_reminder_time: string | null
          music_enabled: boolean
          notifications_enabled: boolean
          sound_enabled: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_reminder_time?: string | null
          music_enabled?: boolean
          notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_reminder_time?: string | null
          music_enabled?: boolean
          notifications_enabled?: boolean
          sound_enabled?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vocab_progress: {
        Row: {
          child_id: string
          correct_count: number
          drawing_id: string
          id: string
          last_seen_at: string | null
          next_review_at: string | null
          srs_box: number
          status: Database["public"]["Enums"]["vocab_status"]
          wrong_count: number
        }
        Insert: {
          child_id: string
          correct_count?: number
          drawing_id: string
          id?: string
          last_seen_at?: string | null
          next_review_at?: string | null
          srs_box?: number
          status?: Database["public"]["Enums"]["vocab_status"]
          wrong_count?: number
        }
        Update: {
          child_id?: string
          correct_count?: number
          drawing_id?: string
          id?: string
          last_seen_at?: string | null
          next_review_at?: string | null
          srs_box?: number
          status?: Database["public"]["Enums"]["vocab_status"]
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vocab_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocab_progress_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          color_hex: string | null
          cover_image_path: string | null
          created_at: string
          icon_key: string | null
          id: string
          is_free: boolean
          name_en: string
          name_es: string
          slug: string
          sort_order: number
        }
        Insert: {
          color_hex?: string | null
          cover_image_path?: string | null
          created_at?: string
          icon_key?: string | null
          id?: string
          is_free?: boolean
          name_en: string
          name_es: string
          slug: string
          sort_order?: number
        }
        Update: {
          color_hex?: string | null
          cover_image_path?: string | null
          created_at?: string
          icon_key?: string | null
          id?: string
          is_free?: boolean
          name_en?: string
          name_es?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          _display_name?: string
          _email: string
          _password: string
          _plan_code?: string
          _role?: Database["public"]["Enums"]["app_role"]
          _status?: Database["public"]["Enums"]["subscription_status"]
        }
        Returns: string
      }
      admin_delete_user: { Args: { _user_id: string }; Returns: undefined }
      admin_update_email: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      admin_update_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      can_manage_user: { Args: { _target: string }; Returns: boolean }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      owns_child: { Args: { _child_id: string }; Returns: boolean }
      user_rank: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "owner" | "admin" | "user"
      subscription_status: "pendiente" | "activa" | "vencida" | "cancelada"
      vocab_status: "nueva" | "aprendiendo" | "dominada"
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
      app_role: ["owner", "admin", "user"],
      subscription_status: ["pendiente", "activa", "vencida", "cancelada"],
      vocab_status: ["nueva", "aprendiendo", "dominada"],
    },
  },
} as const
