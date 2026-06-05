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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auction_attendees: {
        Row: {
          joined_at: string
          property_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          property_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_attendees_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_whitelist: {
        Row: {
          added_at: string
          ic_number: string
          id: string
          property_id: string
        }
        Insert: {
          added_at?: string
          ic_number: string
          id?: string
          property_id: string
        }
        Update: {
          added_at?: string
          ic_number?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_whitelist_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          bidder_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          amount: number
          bidder_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string
          email: string
          id: string
          name: string
          phone: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          email: string
          id?: string
          name: string
          phone: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          ic_number: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          ic_number: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          ic_number?: string
          id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          auction_date: string
          auction_location: string
          bid_increment: number
          category: Database["public"]["Enums"]["property_category"]
          condition_pdf_url: string | null
          conditions: string
          created_at: string
          current_bid: number | null
          current_bidder: string | null
          id: string
          image_url: string
          images: string[]
          is_paused: boolean
          name: string
          paused_remaining_ms: number | null
          proclamation_pdf_url: string | null
          reserve_price: number
          round_ends_at: string | null
          round_seconds: number
          status: string
          tenure: string
          title_number: string
          winner_id: string | null
        }
        Insert: {
          address: string
          auction_date: string
          auction_location: string
          bid_increment?: number
          category: Database["public"]["Enums"]["property_category"]
          condition_pdf_url?: string | null
          conditions: string
          created_at?: string
          current_bid?: number | null
          current_bidder?: string | null
          id?: string
          image_url: string
          images?: string[]
          is_paused?: boolean
          name: string
          paused_remaining_ms?: number | null
          proclamation_pdf_url?: string | null
          reserve_price: number
          round_ends_at?: string | null
          round_seconds?: number
          status?: string
          tenure: string
          title_number: string
          winner_id?: string | null
        }
        Update: {
          address?: string
          auction_date?: string
          auction_location?: string
          bid_increment?: number
          category?: Database["public"]["Enums"]["property_category"]
          condition_pdf_url?: string | null
          conditions?: string
          created_at?: string
          current_bid?: number | null
          current_bidder?: string | null
          id?: string
          image_url?: string
          images?: string[]
          is_paused?: boolean
          name?: string
          paused_remaining_ms?: number | null
          proclamation_pdf_url?: string | null
          reserve_price?: number
          round_ends_at?: string | null
          round_seconds?: number
          status?: string
          tenure?: string
          title_number?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      property_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          property_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          property_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          property_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      profiles_public: {
        Row: {
          full_name: string | null
          ic_masked: string | null
          id: string | null
        }
        Insert: {
          full_name?: string | null
          ic_masked?: never
          id?: string | null
        }
        Update: {
          full_name?: string | null
          ic_masked?: never
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_bid: { Args: { p_property_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      property_category:
        | "Terrace"
        | "Apartment"
        | "Condominium"
        | "Bungalow"
        | "Semi-Detached"
        | "Shop-Lot"
        | "Land"
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
      property_category: [
        "Terrace",
        "Apartment",
        "Condominium",
        "Bungalow",
        "Semi-Detached",
        "Shop-Lot",
        "Land",
      ],
    },
  },
} as const
