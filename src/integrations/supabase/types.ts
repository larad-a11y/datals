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
      coaching_expenses: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          month: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          month: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          month?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_backups: {
        Row: {
          backup_date: string | null
          backup_type: string
          charges_snapshot: Json
          coaching_expenses_snapshot: Json
          created_at: string | null
          id: string
          month: string
          salaries_snapshot: Json
          sales_snapshot: Json
          tunnels_snapshot: Json
          user_id: string
        }
        Insert: {
          backup_date?: string | null
          backup_type?: string
          charges_snapshot?: Json
          coaching_expenses_snapshot?: Json
          created_at?: string | null
          id?: string
          month: string
          salaries_snapshot?: Json
          sales_snapshot?: Json
          tunnels_snapshot?: Json
          user_id: string
        }
        Update: {
          backup_date?: string | null
          backup_type?: string
          charges_snapshot?: Json
          coaching_expenses_snapshot?: Json
          created_at?: string | null
          id?: string
          month?: string
          salaries_snapshot?: Json
          sales_snapshot?: Json
          tunnels_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      salaries: {
        Row: {
          created_at: string | null
          employee_name: string
          employer_charges: number | null
          gross_salary: number
          id: string
          total_cost: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          employee_name: string
          employer_charges?: number | null
          gross_salary: number
          id?: string
          total_cost: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          employee_name?: string
          employer_charges?: number | null
          gross_salary?: number
          id?: string
          total_cost?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_collected: number | null
          base_price: number
          cb_amount: number | null
          client_email: string | null
          client_name: string | null
          closer_id: string | null
          created_at: string | null
          defaulted_at: string | null
          id: string
          is_defaulted: boolean | null
          is_fully_refunded: boolean
          klarna_amount: number | null
          last_payment_update: string | null
          next_payment_date: string | null
          number_of_payments: number | null
          offer_id: string | null
          payment_history: Json | null
          payment_method: string
          refund_history: Json
          refunded_amount: number
          sale_date: string
          total_price: number
          traffic_source: string
          tunnel_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_collected?: number | null
          base_price: number
          cb_amount?: number | null
          client_email?: string | null
          client_name?: string | null
          closer_id?: string | null
          created_at?: string | null
          defaulted_at?: string | null
          id?: string
          is_defaulted?: boolean | null
          is_fully_refunded?: boolean
          klarna_amount?: number | null
          last_payment_update?: string | null
          next_payment_date?: string | null
          number_of_payments?: number | null
          offer_id?: string | null
          payment_history?: Json | null
          payment_method: string
          refund_history?: Json
          refunded_amount?: number
          sale_date: string
          total_price: number
          traffic_source?: string
          tunnel_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_collected?: number | null
          base_price?: number
          cb_amount?: number | null
          client_email?: string | null
          client_name?: string | null
          closer_id?: string | null
          created_at?: string | null
          defaulted_at?: string | null
          id?: string
          is_defaulted?: boolean | null
          is_fully_refunded?: boolean
          klarna_amount?: number | null
          last_payment_update?: string | null
          next_payment_date?: string | null
          number_of_payments?: number | null
          offer_id?: string | null
          payment_history?: Json | null
          payment_method?: string
          refund_history?: Json
          refunded_amount?: number
          sale_date?: string
          total_price?: number
          traffic_source?: string
          tunnel_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_tunnel_id_fkey"
            columns: ["tunnel_id"]
            isOneToOne: false
            referencedRelation: "tunnels"
            referencedColumns: ["id"]
          },
        ]
      }
      tunnels: {
        Row: {
          ad_budget: number | null
          attendees: number | null
          average_price: number | null
          calls_booked: number | null
          calls_closed: number | null
          calls_generated: number | null
          challenge_days: Json | null
          closer_stats: Json | null
          collected_amount: number | null
          created_at: string | null
          date: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          month: string
          name: string
          registrations: number | null
          registrations_ads: number | null
          registrations_organic: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ad_budget?: number | null
          attendees?: number | null
          average_price?: number | null
          calls_booked?: number | null
          calls_closed?: number | null
          calls_generated?: number | null
          challenge_days?: Json | null
          closer_stats?: Json | null
          collected_amount?: number | null
          created_at?: string | null
          date?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          month: string
          name: string
          registrations?: number | null
          registrations_ads?: number | null
          registrations_organic?: number | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ad_budget?: number | null
          attendees?: number | null
          average_price?: number | null
          calls_booked?: number | null
          calls_closed?: number | null
          calls_generated?: number | null
          challenge_days?: Json | null
          closer_stats?: Json | null
          collected_amount?: number | null
          created_at?: string | null
          date?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          month?: string
          name?: string
          registrations?: number | null
          registrations_ads?: number | null
          registrations_organic?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_charges: {
        Row: {
          advertising: number | null
          agency_percent: number | null
          agency_threshold: number | null
          associate_percent: number | null
          closers: Json | null
          closers_percent: number | null
          created_at: string | null
          id: string
          installment_plans: Json | null
          klarna_max_amount: number | null
          klarna_percent: number | null
          marketing: number | null
          offers: Json | null
          other_costs: number | null
          payment_processor_percent: number | null
          software: number | null
          tax_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advertising?: number | null
          agency_percent?: number | null
          agency_threshold?: number | null
          associate_percent?: number | null
          closers?: Json | null
          closers_percent?: number | null
          created_at?: string | null
          id?: string
          installment_plans?: Json | null
          klarna_max_amount?: number | null
          klarna_percent?: number | null
          marketing?: number | null
          offers?: Json | null
          other_costs?: number | null
          payment_processor_percent?: number | null
          software?: number | null
          tax_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advertising?: number | null
          agency_percent?: number | null
          agency_threshold?: number | null
          associate_percent?: number | null
          closers?: Json | null
          closers_percent?: number | null
          created_at?: string | null
          id?: string
          installment_plans?: Json | null
          klarna_max_amount?: number | null
          klarna_percent?: number | null
          marketing?: number | null
          offers?: Json | null
          other_costs?: number | null
          payment_processor_percent?: number | null
          software?: number | null
          tax_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
