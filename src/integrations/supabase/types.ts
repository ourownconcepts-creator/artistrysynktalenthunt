export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: string;
          body: string;
          competition_id: string | null;
          created_at: string;
          id: string;
          is_pinned: boolean;
          published_at: string;
          title: string;
        };
        Insert: {
          audience?: string;
          body?: string;
          competition_id?: string | null;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          title: string;
        };
        Update: {
          audience?: string;
          body?: string;
          competition_id?: string | null;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      application_badges: {
        Row: {
          application_id: string;
          awarded_at: string;
          badge_id: string;
          id: string;
        };
        Insert: {
          application_id: string;
          awarded_at?: string;
          badge_id: string;
          id?: string;
        };
        Update: {
          application_id?: string;
          awarded_at?: string;
          badge_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_badges_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "application_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          audition_notes: string;
          audition_url: string;
          bio: string;
          category_id: string;
          competition_id: string;
          created_at: string;
          current_round_id: string | null;
          date_of_birth: string | null;
          display_name: string;
          email: string;
          experience: string;
          full_name: string;
          handle: string;
          id: string;
          is_public: boolean;
          location: string;
          phone: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audition_notes?: string;
          audition_url?: string;
          bio?: string;
          category_id: string;
          competition_id: string;
          created_at?: string;
          current_round_id?: string | null;
          date_of_birth?: string | null;
          display_name: string;
          email?: string;
          experience?: string;
          full_name?: string;
          handle: string;
          id?: string;
          is_public?: boolean;
          location?: string;
          phone?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audition_notes?: string;
          audition_url?: string;
          bio?: string;
          category_id?: string;
          competition_id?: string;
          created_at?: string;
          current_round_id?: string | null;
          date_of_birth?: string | null;
          display_name?: string;
          email?: string;
          experience?: string;
          full_name?: string;
          handle?: string;
          id?: string;
          is_public?: boolean;
          location?: string;
          phone?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_current_round_id_fkey";
            columns: ["current_round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          detail: Json;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          audition_hint: string;
          blurb: string;
          created_at: string;
          group_id: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          audition_hint?: string;
          blurb?: string;
          created_at?: string;
          group_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          audition_hint?: string;
          blurb?: string;
          created_at?: string;
          group_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "category_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      category_groups: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      competition_rounds: {
        Row: {
          advancement_rule: string;
          closes_at: string | null;
          competition_id: string;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          opens_at: string | null;
          sequence: number;
          slug: string;
        };
        Insert: {
          advancement_rule?: string;
          closes_at?: string | null;
          competition_id: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          opens_at?: string | null;
          sequence: number;
          slug: string;
        };
        Update: {
          advancement_rule?: string;
          closes_at?: string | null;
          competition_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          opens_at?: string | null;
          sequence?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competition_rounds_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      competitions: {
        Row: {
          cities: number;
          consent_requirements: string[];
          created_at: string;
          current_round_id: string | null;
          description: string;
          eligibility: string[];
          ends_at: string | null;
          id: string;
          judge_weight: number;
          name: string;
          prize_pool: string;
          public_weight: number;
          registration_closes_at: string | null;
          registration_opens_at: string | null;
          requires_authentication: boolean;
          rules: string[];
          slug: string;
          starts_at: string | null;
          status: string;
          tagline: string;
          updated_at: string;
          vote_rate_limit_per_minute: number;
          votes_per_user_per_day: number;
          voting_closes_at: string | null;
          voting_model: string;
          voting_opens_at: string | null;
        };
        Insert: {
          cities?: number;
          consent_requirements?: string[];
          created_at?: string;
          current_round_id?: string | null;
          description?: string;
          eligibility?: string[];
          ends_at?: string | null;
          id?: string;
          judge_weight?: number;
          name: string;
          prize_pool?: string;
          public_weight?: number;
          registration_closes_at?: string | null;
          registration_opens_at?: string | null;
          requires_authentication?: boolean;
          rules?: string[];
          slug: string;
          starts_at?: string | null;
          status?: string;
          tagline?: string;
          updated_at?: string;
          vote_rate_limit_per_minute?: number;
          votes_per_user_per_day?: number;
          voting_closes_at?: string | null;
          voting_model?: string;
          voting_opens_at?: string | null;
        };
        Update: {
          cities?: number;
          consent_requirements?: string[];
          created_at?: string;
          current_round_id?: string | null;
          description?: string;
          eligibility?: string[];
          ends_at?: string | null;
          id?: string;
          judge_weight?: number;
          name?: string;
          prize_pool?: string;
          public_weight?: number;
          registration_closes_at?: string | null;
          registration_opens_at?: string | null;
          requires_authentication?: boolean;
          rules?: string[];
          slug?: string;
          starts_at?: string | null;
          status?: string;
          tagline?: string;
          updated_at?: string;
          vote_rate_limit_per_minute?: number;
          votes_per_user_per_day?: number;
          voting_closes_at?: string | null;
          voting_model?: string;
          voting_opens_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "competitions_current_round_fk";
            columns: ["current_round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      judge_assignments: {
        Row: {
          category_id: string | null;
          competition_id: string;
          created_at: string;
          id: string;
          judge_id: string;
        };
        Insert: {
          category_id?: string | null;
          competition_id: string;
          created_at?: string;
          id?: string;
          judge_id: string;
        };
        Update: {
          category_id?: string | null;
          competition_id?: string;
          created_at?: string;
          id?: string;
          judge_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judge_assignments_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judge_assignments_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          artistrysynk_identity_ref: string | null;
          artistrysynk_provider: string;
          avatar_url: string | null;
          bio: string;
          created_at: string;
          display_name: string;
          email: string | null;
          handle: string | null;
          id: string;
          is_public: boolean;
          location: string;
          primary_discipline: string;
          updated_at: string;
        };
        Insert: {
          artistrysynk_identity_ref?: string | null;
          artistrysynk_provider?: string;
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          handle?: string | null;
          id: string;
          is_public?: boolean;
          location?: string;
          primary_discipline?: string;
          updated_at?: string;
        };
        Update: {
          artistrysynk_identity_ref?: string | null;
          artistrysynk_provider?: string;
          avatar_url?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          handle?: string | null;
          id?: string;
          is_public?: boolean;
          location?: string;
          primary_discipline?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      round_results: {
        Row: {
          application_id: string;
          decided_at: string;
          decided_by: string | null;
          id: string;
          outcome: string;
          round_id: string;
        };
        Insert: {
          application_id: string;
          decided_at?: string;
          decided_by?: string | null;
          id?: string;
          outcome: string;
          round_id: string;
        };
        Update: {
          application_id?: string;
          decided_at?: string;
          decided_by?: string | null;
          id?: string;
          outcome?: string;
          round_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "round_results_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "round_results_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          application_id: string;
          comment: string;
          created_at: string;
          criterion_id: string;
          id: string;
          judge_id: string;
          round_id: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          application_id: string;
          comment?: string;
          created_at?: string;
          criterion_id: string;
          id?: string;
          judge_id: string;
          round_id: string;
          updated_at?: string;
          value: number;
        };
        Update: {
          application_id?: string;
          comment?: string;
          created_at?: string;
          criterion_id?: string;
          id?: string;
          judge_id?: string;
          round_id?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scores_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_criterion_id_fkey";
            columns: ["criterion_id"];
            isOneToOne: false;
            referencedRelation: "scoring_criteria";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scores_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      scoring_criteria: {
        Row: {
          competition_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          max_score: number;
          name: string;
          sort_order: number;
          weight: number;
        };
        Insert: {
          competition_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_score?: number;
          name: string;
          sort_order?: number;
          weight?: number;
        };
        Update: {
          competition_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_score?: number;
          name?: string;
          sort_order?: number;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_criteria_competition_id_fkey";
            columns: ["competition_id"];
            isOneToOne: false;
            referencedRelation: "competitions";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsors: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          name: string;
          placements: string[];
          sort_order: number;
          tier: string;
          website: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name: string;
          placements?: string[];
          sort_order?: number;
          tier?: string;
          website?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          name?: string;
          placements?: string[];
          sort_order?: number;
          tier?: string;
          website?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          application_id: string;
          created_at: string;
          id: string;
          round_id: string;
          vote_day: string;
          voter_id: string;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          id?: string;
          round_id: string;
          vote_day?: string;
          voter_id: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          id?: string;
          round_id?: string;
          vote_day?: string;
          voter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "votes_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "votes_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "competition_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      advance_application: {
        Args: { _application_id: string; _outcome: string };
        Returns: Json;
      };
      cast_vote: { Args: { _handle: string }; Returns: Json };
      claim_first_admin: { Args: never; Returns: Json };
      grant_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] };
        Returns: Json;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      judge_can_score: {
        Args: { _application_id: string; _judge_id: string };
        Returns: boolean;
      };
      judge_queue: {
        Args: { _competition_slug?: string };
        Returns: {
          application_id: string;
          audition_notes: string;
          audition_url: string;
          bio: string;
          category_name: string;
          display_name: string;
          experience: string;
          handle: string;
          my_scored_criteria: number;
          round_id: string;
          round_name: string;
          status: string;
        }[];
      };
      list_team: {
        Args: never;
        Returns: {
          display_name: string;
          email: string;
          role: string;
          user_id: string;
        }[];
      };
      public_contestants: {
        Args: { _competition_slug?: string };
        Returns: {
          bio: string;
          category_name: string;
          competition_slug: string;
          display_name: string;
          group_name: string;
          handle: string;
          location: string;
          stage: string;
          vote_count: number;
        }[];
      };
      round_leaderboard: {
        Args: { _competition_slug: string; _round_slug: string };
        Returns: {
          category_name: string;
          combined: number;
          display_name: string;
          handle: string;
          judge_score: number;
          public_votes: number;
        }[];
      };
    };
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ADMIN"
        | "JUDGE"
        | "MODERATOR"
        | "SPONSOR_MANAGER"
        | "CONTESTANT"
        | "PUBLIC_USER";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "SUPER_ADMIN",
        "ADMIN",
        "JUDGE",
        "MODERATOR",
        "SPONSOR_MANAGER",
        "CONTESTANT",
        "PUBLIC_USER",
      ],
    },
  },
} as const;
