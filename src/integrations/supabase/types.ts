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
      appointments: {
        Row: {
          coach_id: string
          created_at: string
          ends_at: string
          id: string
          member_id: string | null
          notes: string | null
          starts_at: string
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          ends_at: string
          id?: string
          member_id?: string | null
          notes?: string | null
          starts_at: string
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          starts_at?: string
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_library_assignments: {
        Row: {
          assigned_at: string
          id: string
          member_id: string
          session_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          member_id: string
          session_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          member_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_library_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_library_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coach_library_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_library_programs: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_library_programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_library_sessions: {
        Row: {
          coach_id: string
          created_at: string
          cycle: string | null
          description: string | null
          duration: string | null
          exercise_notes: string | null
          frequency: number
          heart_zone: number | null
          heart_zones: string | null
          id: string
          intensity: string | null
          notes: string | null
          program_id: string | null
          recurrence: string
          rest: string | null
          session_order: number
          sets_reps: string | null
          title: string
          type: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          cycle?: string | null
          description?: string | null
          duration?: string | null
          exercise_notes?: string | null
          frequency?: number
          heart_zone?: number | null
          heart_zones?: string | null
          id?: string
          intensity?: string | null
          notes?: string | null
          program_id?: string | null
          recurrence?: string
          rest?: string | null
          session_order?: number
          sets_reps?: string | null
          title: string
          type?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          cycle?: string | null
          description?: string | null
          duration?: string | null
          exercise_notes?: string | null
          frequency?: number
          heart_zone?: number | null
          heart_zones?: string | null
          id?: string
          intensity?: string | null
          notes?: string | null
          program_id?: string | null
          recurrence?: string
          rest?: string | null
          session_order?: number
          sets_reps?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_library_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_library_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "coach_library_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notifications: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string | null
          payload: Json
          read_at: string | null
          type: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id?: string | null
          payload?: Json
          read_at?: string | null
          type: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string | null
          payload?: Json
          read_at?: string | null
          type?: string
        }
        Relationships: []
      }
      coach_program_week_objectives: {
        Row: {
          created_at: string
          id: string
          objective: string
          program_id: string
          updated_at: string
          week_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          objective: string
          program_id: string
          updated_at?: string
          week_index: number
        }
        Update: {
          created_at?: string
          id?: string
          objective?: string
          program_id?: string
          updated_at?: string
          week_index?: number
        }
        Relationships: []
      }
      daily_task_completions: {
        Row: {
          completion_date: string
          created_at: string
          id: string
          member_id: string
          status: string
          task_id: string
        }
        Insert: {
          completion_date: string
          created_at?: string
          id?: string
          member_id: string
          status?: string
          task_id: string
        }
        Update: {
          completion_date?: string
          created_at?: string
          id?: string
          member_id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_completions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      member_indicators: {
        Row: {
          created_at: string
          current_weight: number | null
          goal_deadline: string | null
          goal_notes: string | null
          id: string
          main_goal: string | null
          max_hr: number | null
          member_id: string
          resting_hr: number | null
          updated_at: string
          zone1_max: number | null
          zone1_min: number | null
          zone2_max: number | null
          zone2_min: number | null
          zone3_max: number | null
          zone3_min: number | null
          zone4_max: number | null
          zone4_min: number | null
          zone5_max: number | null
          zone5_min: number | null
        }
        Insert: {
          created_at?: string
          current_weight?: number | null
          goal_deadline?: string | null
          goal_notes?: string | null
          id?: string
          main_goal?: string | null
          max_hr?: number | null
          member_id: string
          resting_hr?: number | null
          updated_at?: string
          zone1_max?: number | null
          zone1_min?: number | null
          zone2_max?: number | null
          zone2_min?: number | null
          zone3_max?: number | null
          zone3_min?: number | null
          zone4_max?: number | null
          zone4_min?: number | null
          zone5_max?: number | null
          zone5_min?: number | null
        }
        Update: {
          created_at?: string
          current_weight?: number | null
          goal_deadline?: string | null
          goal_notes?: string | null
          id?: string
          main_goal?: string | null
          max_hr?: number | null
          member_id?: string
          resting_hr?: number | null
          updated_at?: string
          zone1_max?: number | null
          zone1_min?: number | null
          zone2_max?: number | null
          zone2_min?: number | null
          zone3_max?: number | null
          zone3_min?: number | null
          zone4_max?: number | null
          zone4_min?: number | null
          zone5_max?: number | null
          zone5_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_indicators_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_programs: {
        Row: {
          active: boolean
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          library_program_id: string | null
          name: string
          objective_key: string
          slug: string
          updated_at: string
          weeks: number
        }
        Insert: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          library_program_id?: string | null
          name: string
          objective_key: string
          slug: string
          updated_at?: string
          weeks?: number
        }
        Update: {
          active?: boolean
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          library_program_id?: string | null
          name?: string
          objective_key?: string
          slug?: string
          updated_at?: string
          weeks?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coach_id: string | null
          created_at: string
          email: string
          id: string
          last_active_at: string
          last_reminder_at: string | null
          name: string
          onboarding_completed_at: string | null
          onboarding_objective: string | null
          onboarding_offer: string | null
          onboarding_program_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
          email: string
          id: string
          last_active_at?: string
          last_reminder_at?: string | null
          name: string
          onboarding_completed_at?: string | null
          onboarding_objective?: string | null
          onboarding_offer?: string | null
          onboarding_program_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          coach_id?: string | null
          created_at?: string
          email?: string
          id?: string
          last_active_at?: string
          last_reminder_at?: string | null
          name?: string
          onboarding_completed_at?: string | null
          onboarding_objective?: string | null
          onboarding_offer?: string | null
          onboarding_program_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_categories: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          subtitle: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          subtitle?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          subtitle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_categories_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_category_assignments: {
        Row: {
          assigned_at: string
          category_id: string
          id: string
          member_id: string
        }
        Insert: {
          assigned_at?: string
          category_id: string
          id?: string
          member_id: string
        }
        Update: {
          assigned_at?: string
          category_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "studio_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_category_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_resources: {
        Row: {
          category_id: string
          coach_id: string
          content: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          title: string
          type: string
          url: string | null
        }
        Insert: {
          category_id: string
          coach_id: string
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          title: string
          type: string
          url?: string | null
        }
        Update: {
          category_id?: string
          coach_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "studio_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_resources_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_video_assignments: {
        Row: {
          assigned_at: string
          id: string
          member_id: string
          video_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          member_id: string
          video_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          member_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_video_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_video_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "studio_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_videos: {
        Row: {
          category: string | null
          category_id: string | null
          coach_id: string
          created_at: string
          description: string | null
          id: string
          member_id: string | null
          title: string
          video_url: string
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          title: string
          video_url: string
        }
        Update: {
          category?: string | null
          category_id?: string | null
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "studio_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_videos_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_videos_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          coach_id: string
          coach_reply: string | null
          coach_seen_at: string | null
          created_at: string
          description: string | null
          duration: string | null
          exercise_notes: string | null
          frequency: number
          heart_zone: number | null
          heart_zones: string | null
          id: string
          intensity: string | null
          member_comment: string | null
          member_followup: string | null
          member_id: string
          notes: string | null
          recurrence: string
          rest: string | null
          sets_reps: string | null
          status: string
          title: string
          type: string
          updated_at: string
          week_start: string
        }
        Insert: {
          coach_id: string
          coach_reply?: string | null
          coach_seen_at?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          exercise_notes?: string | null
          frequency?: number
          heart_zone?: number | null
          heart_zones?: string | null
          id?: string
          intensity?: string | null
          member_comment?: string | null
          member_followup?: string | null
          member_id: string
          notes?: string | null
          recurrence?: string
          rest?: string | null
          sets_reps?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          coach_id?: string
          coach_reply?: string | null
          coach_seen_at?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          exercise_notes?: string | null
          frequency?: number
          heart_zone?: number | null
          heart_zones?: string | null
          id?: string
          intensity?: string | null
          member_comment?: string | null
          member_followup?: string | null
          member_id?: string
          notes?: string | null
          recurrence?: string
          rest?: string | null
          sets_reps?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_objectives: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          member_id: string
          objective: string
          updated_at: string
          week_start: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          member_id: string
          objective: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          member_id?: string
          objective?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_objectives_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_objectives_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_progress: {
        Row: {
          completed_tasks: number
          created_at: string
          id: string
          member_id: string
          percentage: number
          total_tasks: number
          week_start: string
        }
        Insert: {
          completed_tasks?: number
          created_at?: string
          id?: string
          member_id: string
          percentage?: number
          total_tasks?: number
          week_start: string
        }
        Update: {
          completed_tasks?: number
          created_at?: string
          id?: string
          member_id?: string
          percentage?: number
          total_tasks?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_progress_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_coach_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_category_assigned_to_member: {
        Args: { _category_id: string; _member_id: string }
        Returns: boolean
      }
      is_coach_category: {
        Args: { _category_id: string; _coach_id: string }
        Returns: boolean
      }
      is_coach_library_session: {
        Args: { _coach_id: string; _session_id: string }
        Returns: boolean
      }
      is_coach_of: {
        Args: { _coach_id: string; _member_id: string }
        Returns: boolean
      }
      is_coach_video: {
        Args: { _coach_id: string; _video_id: string }
        Returns: boolean
      }
      is_video_assigned_to_member: {
        Args: { _member_id: string; _video_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "coach" | "member"
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
      app_role: ["coach", "member"],
    },
  },
} as const
