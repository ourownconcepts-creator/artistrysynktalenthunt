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
      announcements: {
        Row: {
          audience: string
          body: string
          competition_id: string | null
          created_at: string
          id: string
          is_pinned: boolean
          is_published: boolean
          published_at: string
          round_id: string | null
          scheduled_for: string | null
          title: string
        }
        Insert: {
          audience?: string
          body?: string
          competition_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          published_at?: string
          round_id?: string | null
          scheduled_for?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          competition_id?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          published_at?: string
          round_id?: string | null
          scheduled_for?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      application_badges: {
        Row: {
          application_id: string
          awarded_at: string
          badge_id: string
          id: string
        }
        Insert: {
          application_id: string
          awarded_at?: string
          badge_id: string
          id?: string
        }
        Update: {
          application_id?: string
          awarded_at?: string
          badge_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_badges_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          audition_notes: string
          audition_url: string
          bio: string
          category_id: string
          competition_id: string
          created_at: string
          current_round_id: string | null
          date_of_birth: string | null
          display_name: string
          email: string
          experience: string
          full_name: string
          handle: string
          id: string
          is_public: boolean
          location: string
          media_is_public: boolean
          phone: string
          progress_state: string
          reference_code: string | null
          review_decision: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state_reason: string | null
          status: string
          submission_answers: Json
          submission_state: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audition_notes?: string
          audition_url?: string
          bio?: string
          category_id: string
          competition_id: string
          created_at?: string
          current_round_id?: string | null
          date_of_birth?: string | null
          display_name: string
          email?: string
          experience?: string
          full_name?: string
          handle: string
          id?: string
          is_public?: boolean
          location?: string
          media_is_public?: boolean
          phone?: string
          progress_state?: string
          reference_code?: string | null
          review_decision?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_reason?: string | null
          status?: string
          submission_answers?: Json
          submission_state?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audition_notes?: string
          audition_url?: string
          bio?: string
          category_id?: string
          competition_id?: string
          created_at?: string
          current_round_id?: string | null
          date_of_birth?: string | null
          display_name?: string
          email?: string
          experience?: string
          full_name?: string
          handle?: string
          id?: string
          is_public?: boolean
          location?: string
          media_is_public?: boolean
          phone?: string
          progress_state?: string
          reference_code?: string | null
          review_decision?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_reason?: string | null
          status?: string
          submission_answers?: Json
          submission_state?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_current_round_id_fkey"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      artistrysynk_link_intents: {
        Row: {
          claim_url: string | null
          code_verifier: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          external_subject: string
          id: string
          intent_id: string | null
          kind: string
          processing_at: string | null
          redirect_uri: string
          scopes: string[]
          state_hash: string
          user_id: string
        }
        Insert: {
          claim_url?: string | null
          code_verifier?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          external_subject: string
          id?: string
          intent_id?: string | null
          kind?: string
          processing_at?: string | null
          redirect_uri: string
          scopes?: string[]
          state_hash: string
          user_id: string
        }
        Update: {
          claim_url?: string | null
          code_verifier?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          external_subject?: string
          id?: string
          intent_id?: string | null
          kind?: string
          processing_at?: string | null
          redirect_uri?: string
          scopes?: string[]
          state_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      artistrysynk_links: {
        Row: {
          created_at: string
          external_subject: string
          id: string
          identity_id: string
          link_id: string | null
          linked_at: string
          profile_snapshot: Json
          scopes: string[]
          snapshot_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_subject: string
          id?: string
          identity_id: string
          link_id?: string | null
          linked_at?: string
          profile_snapshot?: Json
          scopes?: string[]
          snapshot_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_subject?: string
          id?: string
          identity_id?: string
          link_id?: string | null
          linked_at?: string
          profile_snapshot?: Json
          scopes?: string[]
          snapshot_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          award_condition: string
          competition_id: string | null
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          award_condition?: string
          competition_id?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          award_condition?: string
          competition_id?: string | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          audition_hint: string
          blurb: string
          competition_id: string | null
          created_at: string
          eligibility: string
          group_id: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          audition_hint?: string
          blurb?: string
          competition_id?: string | null
          created_at?: string
          eligibility?: string
          group_id: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          audition_hint?: string
          blurb?: string
          competition_id?: string | null
          created_at?: string
          eligibility?: string
          group_id?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "category_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      category_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_requirements: {
        Row: {
          category_id: string
          created_at: string
          help_text: string
          id: string
          is_active: boolean
          is_required: boolean
          key: string
          kind: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          help_text?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          key: string
          kind?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          help_text?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          key?: string
          kind?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_rounds: {
        Row: {
          advancement_rule: string
          closed_at: string | null
          closes_at: string | null
          competition_id: string
          created_at: string
          decided_at: string | null
          description: string
          id: string
          is_active: boolean
          judging_closes_at: string | null
          judging_enabled: boolean
          judging_opens_at: string | null
          name: string
          opens_at: string | null
          score_deadline_at: string | null
          sequence: number
          slug: string
          status: string
          submission_requirements: string
          voting_enabled: boolean
        }
        Insert: {
          advancement_rule?: string
          closed_at?: string | null
          closes_at?: string | null
          competition_id: string
          created_at?: string
          decided_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          judging_closes_at?: string | null
          judging_enabled?: boolean
          judging_opens_at?: string | null
          name: string
          opens_at?: string | null
          score_deadline_at?: string | null
          sequence: number
          slug: string
          status?: string
          submission_requirements?: string
          voting_enabled?: boolean
        }
        Update: {
          advancement_rule?: string
          closed_at?: string | null
          closes_at?: string | null
          competition_id?: string
          created_at?: string
          decided_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          judging_closes_at?: string | null
          judging_enabled?: boolean
          judging_opens_at?: string | null
          name?: string
          opens_at?: string | null
          score_deadline_at?: string | null
          sequence?: number
          slug?: string
          status?: string
          submission_requirements?: string
          voting_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "competition_rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          cities: number
          consent_requirements: string[]
          created_at: string
          current_round_id: string | null
          description: string
          domain: string
          eligibility: string[]
          ends_at: string | null
          id: string
          is_featured: boolean
          judge_weight: number
          name: string
          participant_type: string
          prize_pool: string
          public_weight: number
          registration_closes_at: string | null
          registration_opens_at: string | null
          requires_authentication: boolean
          rules: string[]
          slug: string
          starts_at: string | null
          status: string
          tagline: string
          type: string
          updated_at: string
          vote_rate_limit_per_minute: number
          votes_per_user_per_day: number
          voting_closes_at: string | null
          voting_model: string
          voting_opens_at: string | null
        }
        Insert: {
          cities?: number
          consent_requirements?: string[]
          created_at?: string
          current_round_id?: string | null
          description?: string
          domain?: string
          eligibility?: string[]
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          judge_weight?: number
          name: string
          participant_type?: string
          prize_pool?: string
          public_weight?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_authentication?: boolean
          rules?: string[]
          slug: string
          starts_at?: string | null
          status?: string
          tagline?: string
          type?: string
          updated_at?: string
          vote_rate_limit_per_minute?: number
          votes_per_user_per_day?: number
          voting_closes_at?: string | null
          voting_model?: string
          voting_opens_at?: string | null
        }
        Update: {
          cities?: number
          consent_requirements?: string[]
          created_at?: string
          current_round_id?: string | null
          description?: string
          domain?: string
          eligibility?: string[]
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          judge_weight?: number
          name?: string
          participant_type?: string
          prize_pool?: string
          public_weight?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          requires_authentication?: boolean
          rules?: string[]
          slug?: string
          starts_at?: string | null
          status?: string
          tagline?: string
          type?: string
          updated_at?: string
          vote_rate_limit_per_minute?: number
          votes_per_user_per_day?: number
          voting_closes_at?: string | null
          voting_model?: string
          voting_opens_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_current_round_fk"
            columns: ["current_round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_assignments: {
        Row: {
          category_id: string | null
          competition_id: string
          created_at: string
          id: string
          judge_id: string
        }
        Insert: {
          category_id?: string | null
          competition_id: string
          created_at?: string
          id?: string
          judge_id: string
        }
        Update: {
          category_id?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          judge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          artistrysynk_identity_ref: string | null
          artistrysynk_provider: string
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          email: string | null
          featured_until: string | null
          handle: string | null
          id: string
          instagram_url: string | null
          is_public: boolean
          location: string
          portfolio_url: string | null
          primary_discipline: string
          secondary_skills: string[]
          updated_at: string
          verification_status: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          artistrysynk_identity_ref?: string | null
          artistrysynk_provider?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          email?: string | null
          featured_until?: string | null
          handle?: string | null
          id: string
          instagram_url?: string | null
          is_public?: boolean
          location?: string
          portfolio_url?: string | null
          primary_discipline?: string
          secondary_skills?: string[]
          updated_at?: string
          verification_status?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          artistrysynk_identity_ref?: string | null
          artistrysynk_provider?: string
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          email?: string | null
          featured_until?: string | null
          handle?: string | null
          id?: string
          instagram_url?: string | null
          is_public?: boolean
          location?: string
          portfolio_url?: string | null
          primary_discipline?: string
          secondary_skills?: string[]
          updated_at?: string
          verification_status?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      round_results: {
        Row: {
          application_id: string
          decided_at: string
          decided_by: string | null
          id: string
          outcome: string
          round_id: string
        }
        Insert: {
          application_id: string
          decided_at?: string
          decided_by?: string | null
          id?: string
          outcome: string
          round_id: string
        }
        Update: {
          application_id?: string
          decided_at?: string
          decided_by?: string | null
          id?: string
          outcome?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_results_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      score_corrections: {
        Row: {
          application_id: string
          corrected_by: string | null
          corrected_value: number
          created_at: string
          criterion_id: string
          id: string
          judge_id: string
          previous_value: number
          reason: string
          round_id: string
          score_id: string
        }
        Insert: {
          application_id: string
          corrected_by?: string | null
          corrected_value: number
          created_at?: string
          criterion_id: string
          id?: string
          judge_id: string
          previous_value: number
          reason: string
          round_id: string
          score_id: string
        }
        Update: {
          application_id?: string
          corrected_by?: string | null
          corrected_value?: number
          created_at?: string
          criterion_id?: string
          id?: string
          judge_id?: string
          previous_value?: number
          reason?: string
          round_id?: string
          score_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_corrections_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_corrections_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "scoring_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_corrections_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_corrections_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          application_id: string
          comment: string
          created_at: string
          criterion_id: string
          id: string
          judge_id: string
          round_id: string
          updated_at: string
          value: number
        }
        Insert: {
          application_id: string
          comment?: string
          created_at?: string
          criterion_id: string
          id?: string
          judge_id: string
          round_id: string
          updated_at?: string
          value: number
        }
        Update: {
          application_id?: string
          comment?: string
          created_at?: string
          criterion_id?: string
          id?: string
          judge_id?: string
          round_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "scoring_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_criteria: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          is_active: boolean
          max_score: number
          name: string
          round_id: string | null
          sort_order: number
          weight: number
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_score?: number
          name: string
          round_id?: string | null
          sort_order?: number
          weight?: number
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_score?: number
          name?: string
          round_id?: string | null
          sort_order?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "scoring_criteria_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_criteria_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          competition_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          placements: string[]
          sort_order: number
          tier: string
          website: string
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          placements?: string[]
          sort_order?: number
          tier?: string
          website?: string
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          placements?: string[]
          sort_order?: number
          tier?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
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
      votes: {
        Row: {
          application_id: string
          created_at: string
          id: string
          round_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          vote_day: string
          voter_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          round_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          vote_day?: string
          voter_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          round_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          vote_day?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "competition_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_competition_id: { Args: never; Returns: string }
      active_competition_slug: { Args: never; Returns: string }
      admin_accounts: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          artistrysynk_status: string
          created_at: string
          display_name: string
          email: string
          email_confirmed_at: string
          entry_category: string
          entry_name: string
          entry_progress_state: string
          entry_reference: string
          entry_submission_state: string
          handle: string
          is_owner: boolean
          last_sign_in_at: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_applications: {
        Args: {
          _competition_slug?: string
          _progress_state?: string
          _submission_state?: string
        }
        Returns: {
          audition_notes: string
          audition_url: string
          bio: string
          category_id: string
          category_name: string
          created_at: string
          display_name: string
          experience: string
          handle: string
          id: string
          location: string
          media_is_public: boolean
          progress_state: string
          review_decision: string
          review_reason: string
          reviewed_at: string
          round_name: string
          status: string
          submission_answers: Json
          submission_state: string
          submitted_at: string
        }[]
      }
      admin_entry_detail: { Args: { _application_id: string }; Returns: Json }
      admin_ops_snapshot: {
        Args: { _competition_slug?: string }
        Returns: Json
      }
      advance_application: {
        Args: { _application_id: string; _outcome: string }
        Returns: Json
      }
      artistrysynk_apply_link: {
        Args: { p_identity_ref: string; p_user: string }
        Returns: number
      }
      audit_feed: {
        Args: {
          _action?: string
          _actor_email?: string
          _entity?: string
          _entity_id?: string
          _from?: string
          _limit?: number
          _to?: string
        }
        Returns: {
          action: string
          actor_email: string
          created_at: string
          detail: Json
          entity: string
          entity_id: string
          id: string
        }[]
      }
      can_manage_progression: { Args: { _user_id: string }; Returns: boolean }
      cast_vote: { Args: { _handle: string }; Returns: Json }
      claim_first_admin: { Args: never; Returns: Json }
      close_voting_now: {
        Args: { _competition_id: string; _reason?: string }
        Returns: Json
      }
      competition_status_allows: {
        Args: { _from: string; _to: string }
        Returns: boolean
      }
      correct_score: {
        Args: { _reason: string; _score_id: string; _value: number }
        Returns: Json
      }
      decide_round_result: {
        Args: { _application_id: string; _outcome: string; _reason?: string }
        Returns: Json
      }
      generate_application_reference: { Args: never; Returns: string }
      grant_role_by_email: {
        Args: {
          _competition_slug?: string
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_owner_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      judge_can_score: {
        Args: { _application_id: string; _judge_id: string }
        Returns: boolean
      }
      judge_can_score_round: {
        Args: { _application_id: string; _judge_id: string; _round_id: string }
        Returns: boolean
      }
      judge_dashboard: { Args: { _competition_slug?: string }; Returns: Json }
      judge_queue: {
        Args: { _competition_slug?: string }
        Returns: {
          application_id: string
          audition_notes: string
          audition_url: string
          bio: string
          category_name: string
          display_name: string
          experience: string
          handle: string
          my_scored_criteria: number
          round_id: string
          round_name: string
          status: string
        }[]
      }
      list_judge_assignments: {
        Args: { _competition_slug?: string }
        Returns: {
          assignment_id: string
          category_id: string
          category_name: string
          competition_id: string
          competition_name: string
          created_at: string
          judge_email: string
          judge_id: string
          judge_name: string
        }[]
      }
      list_score_corrections: {
        Args: { _application_id?: string }
        Returns: {
          application_id: string
          corrected_by_email: string
          corrected_value: number
          created_at: string
          criterion_name: string
          handle: string
          id: string
          judge_email: string
          previous_value: number
          reason: string
        }[]
      }
      list_team: {
        Args: never
        Returns: {
          display_name: string
          email: string
          role: string
          user_id: string
        }[]
      }
      owner_admin_email: { Args: never; Returns: string }
      progress_state_valid: { Args: { _state: string }; Returns: boolean }
      public_contestants: {
        Args: { _competition_slug?: string }
        Returns: {
          bio: string
          category_name: string
          competition_slug: string
          display_name: string
          group_name: string
          handle: string
          location: string
          stage: string
          vote_count: number
        }[]
      }
      review_application: {
        Args: { _application_id: string; _decision: string; _reason?: string }
        Returns: Json
      }
      review_submission: {
        Args: {
          _application_id: string
          _publish?: boolean
          _reason?: string
          _state: string
        }
        Returns: Json
      }
      revoke_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: Json
      }
      round_leaderboard: {
        Args: { _competition_slug: string; _round_slug: string }
        Returns: {
          category_name: string
          combined: number
          display_name: string
          handle: string
          judge_score: number
          public_votes: number
        }[]
      }
      round_progress: { Args: { _round_id: string }; Returns: Json }
      round_results_detail: {
        Args: { _round_id: string }
        Returns: {
          application_id: string
          category_name: string
          combined: number
          decided_at: string
          display_name: string
          handle: string
          judge_score: number
          judges_scored: number
          outcome: string
          progress_state: string
          public_votes: number
        }[]
      }
      round_status_allows: {
        Args: { _from: string; _to: string }
        Returns: boolean
      }
      set_application_state: {
        Args: { _application_id: string; _reason?: string; _state: string }
        Returns: Json
      }
      set_competition_status: {
        Args: { _competition_id: string; _reason?: string; _status: string }
        Returns: Json
      }
      set_round_status: {
        Args: {
          _override?: boolean
          _reason?: string
          _round_id: string
          _status: string
        }
        Returns: Json
      }
      set_voting_window: {
        Args: {
          _closes_at: string
          _competition_id: string
          _opens_at: string
          _reason?: string
        }
        Returns: Json
      }
      suspicious_vote_activity: {
        Args: { _competition_slug?: string; _limit?: number }
        Returns: {
          distinct_contestants: number
          voter_email: string
          voter_id: string
          votes_last_hour: number
          votes_today: number
        }[]
      }
      talent_directory: {
        Args: {
          _discipline?: string
          _featured?: boolean
          _limit?: number
          _location?: string
          _offset?: number
          _q?: string
          _verification?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          featured_until: string
          handle: string
          id: string
          is_featured: boolean
          location: string
          primary_discipline: string
          secondary_skills: string[]
          total_count: number
          verification_status: string
        }[]
      }
      talent_disciplines: {
        Args: never
        Returns: {
          name: string
          talent_count: number
        }[]
      }
      talent_profile: { Args: { _handle: string }; Returns: Json }
      track_application: {
        Args: { _email: string; _reference_code: string }
        Returns: {
          category_name: string
          competition_name: string
          display_name: string
          handle: string
          progress_state: string
          reference_code: string
          round_name: string
          status: string
          submission_state: string
          submitted_at: string
          updated_at: string
        }[]
      }
      void_votes: {
        Args: {
          _application_id?: string
          _reason: string
          _vote_ids?: string[]
          _voter_id?: string
        }
        Returns: Json
      }
      vote_totals: {
        Args: {
          _category_id?: string
          _competition_slug?: string
          _round_id?: string
        }
        Returns: {
          application_id: string
          category_name: string
          display_name: string
          distinct_voters: number
          handle: string
          last_vote_at: string
          round_name: string
          valid_votes: number
          voided_votes: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ADMIN"
        | "JUDGE"
        | "MODERATOR"
        | "SPONSOR_MANAGER"
        | "CONTESTANT"
        | "PUBLIC_USER"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
} as const
