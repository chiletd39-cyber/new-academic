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
      activity_scores: {
        Row: {
          column_id: string
          created_at: string
          id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_scores_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "grading_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          broadcast_type: string
          class_name: string | null
          created_at: string
          id: string
          message: string
          sender_id: string
          target_student_id: string | null
          task_id: string | null
        }
        Insert: {
          broadcast_type?: string
          class_name?: string | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          target_student_id?: string | null
          task_id?: string | null
        }
        Update: {
          broadcast_type?: string
          class_name?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          target_student_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_analytics"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "broadcast_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      class_posts: {
        Row: {
          attachments: Json | null
          author_id: string
          class_name: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_type: string | null
          target_class: string | null
          visibility: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          class_name: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_type?: string | null
          target_class?: string | null
          visibility?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          class_name?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_type?: string | null
          target_class?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "class_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_switch_requests: {
        Row: {
          created_at: string
          from_class: string | null
          id: string
          reviewed_by: string | null
          status: string | null
          student_card: string | null
          student_id: string
          student_name: string
          to_class: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_class?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          student_card?: string | null
          student_id: string
          student_name: string
          to_class: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_class?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string | null
          student_card?: string | null
          student_id?: string
          student_name?: string
          to_class?: string
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          parent_id: string
          parent_type: string
          visibility: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          parent_id: string
          parent_type: string
          visibility?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string
          parent_type?: string
          visibility?: string
        }
        Relationships: []
      }
      exam_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_heartbeat: string | null
          student_id: string
          task_id: string
          warning_details: Json | null
          warnings: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          student_id: string
          task_id: string
          warning_details?: Json | null
          warnings?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          student_id?: string
          task_id?: string
          warning_details?: Json | null
          warnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_analytics"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "exam_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_columns: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          label: string
          max_score: number
          subject_id: string
          teacher_id: string
          term_id: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          id?: string
          label: string
          max_score?: number
          subject_id: string
          teacher_id: string
          term_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          label?: string
          max_score?: number
          subject_id?: string
          teacher_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_columns_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_columns_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          full_name: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parent_children: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      parent_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          class_history: Json | null
          created_at: string
          current_class: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          student_card: string | null
          teacher_mcode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          class_history?: Json | null
          created_at?: string
          current_class?: string | null
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_card?: string | null
          teacher_mcode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          class_history?: Json | null
          created_at?: string
          current_class?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_card?: string | null
          teacher_mcode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registered_students: {
        Row: {
          age: number | null
          batch_name: string | null
          class_name: string | null
          created_at: string
          full_name: string
          id: string
          is_registered: boolean | null
          registered_user_id: string | null
          student_card: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          age?: number | null
          batch_name?: string | null
          class_name?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_registered?: boolean | null
          registered_user_id?: string | null
          student_card: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          age?: number | null
          batch_name?: string | null
          class_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_registered?: boolean | null
          registered_user_id?: string | null
          student_card?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      student_scores: {
        Row: {
          created_at: string
          id: string
          max_score: number | null
          score: number | null
          score_type: string | null
          student_id: string
          subject_id: string | null
          task_id: string | null
          term_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_score?: number | null
          score?: number | null
          score_type?: string | null
          student_id: string
          subject_id?: string | null
          task_id?: string | null
          term_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_score?: number | null
          score?: number | null
          score_type?: string | null
          student_id?: string
          subject_id?: string | null
          task_id?: string | null
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scores_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_analytics"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "student_scores_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scores_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scores_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_name: string
          code: string | null
          created_at: string
          id: string
          level: number | null
          module: string | null
          name: string
          teacher_id: string | null
        }
        Insert: {
          class_name: string
          code?: string | null
          created_at?: string
          id?: string
          level?: number | null
          module?: string | null
          name: string
          teacher_id?: string | null
        }
        Update: {
          class_name?: string
          code?: string | null
          created_at?: string
          id?: string
          level?: number | null
          module?: string | null
          name?: string
          teacher_id?: string | null
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          answers: Json | null
          created_at: string
          id: string
          score: number | null
          status: string | null
          student_id: string
          submitted_at: string | null
          task_id: string
          warnings: number | null
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          task_id: string
          warnings?: number | null
        }
        Update: {
          answers?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          task_id?: string
          warnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_analytics"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          class_name: string
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          max_warnings: number | null
          questions: Json | null
          required_fields: Json | null
          scores_published: boolean | null
          security_settings: Json | null
          starts_at: string | null
          subject_id: string | null
          task_type: string
          term_id: string | null
          title: string
          total_marks: number | null
        }
        Insert: {
          class_name: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_warnings?: number | null
          questions?: Json | null
          required_fields?: Json | null
          scores_published?: boolean | null
          security_settings?: Json | null
          starts_at?: string | null
          subject_id?: string | null
          task_type: string
          term_id?: string | null
          title: string
          total_marks?: number | null
        }
        Update: {
          class_name?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          max_warnings?: number | null
          questions?: Json | null
          required_fields?: Json | null
          scores_published?: boolean | null
          security_settings?: Json | null
          starts_at?: string | null
          subject_id?: string | null
          task_type?: string
          term_id?: string | null
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          name: string
          starts_at: string | null
          term_number: number
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          starts_at?: string | null
          term_number: number
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          starts_at?: string | null
          term_number?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      exam_analytics: {
        Row: {
          avg_score: number | null
          avg_warnings: number | null
          class_name: string | null
          completed_submissions: number | null
          completion_rate: number | null
          high_warning_count: number | null
          in_progress: number | null
          task_created_at: string | null
          task_id: string | null
          task_title: string | null
          task_type: string | null
          total_marks: number | null
          total_submissions: number | null
          total_warnings: number | null
        }
        Relationships: []
      }
      tasks_safe: {
        Row: {
          class_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          ends_at: string | null
          id: string | null
          is_active: boolean | null
          max_warnings: number | null
          questions: Json | null
          required_fields: Json | null
          security_settings: Json | null
          starts_at: string | null
          task_type: string | null
          title: string | null
          total_marks: number | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          max_warnings?: number | null
          questions?: never
          required_fields?: Json | null
          security_settings?: Json | null
          starts_at?: string | null
          task_type?: string | null
          title?: string | null
          total_marks?: number | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          id?: string | null
          is_active?: boolean | null
          max_warnings?: number | null
          questions?: never
          required_fields?: Json | null
          security_settings?: Json | null
          starts_at?: string | null
          task_type?: string | null
          title?: string | null
          total_marks?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_score: {
        Args: { _mode?: string; _subject_id: string; _task_id: string }
        Returns: boolean
      }
      check_student_card_exists: {
        Args: { card_number: string }
        Returns: boolean
      }
      create_profile_with_role: {
        Args: {
          _admin_code?: string
          _current_class?: string
          _full_name: string
          _phone?: string
          _role: Database["public"]["Enums"]["user_role"]
          _student_card?: string
          _user_id: string
        }
        Returns: undefined
      }
      find_teacher_by_mcode: {
        Args: { _code: string }
        Returns: {
          avatar_url: string
          full_name: string
          teacher_mcode: string
          user_id: string
        }[]
      }
      generate_class_gen_name: {
        Args: {
          _level: number
          _module: string
          _section: string
          _year_letter: string
        }
        Returns: string
      }
      get_exam_questions: { Args: { _task_id: string }; Returns: Json }
      get_my_children: {
        Args: never
        Returns: {
          avatar_url: string
          class_history: Json
          current_class: string
          full_name: string
          student_card: string
          user_id: string
        }[]
      }
      get_own_role: { Args: never; Returns: string }
      get_public_profiles: {
        Args: { _class_name?: string; _role_filter?: string; _search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          current_class: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_student_registration_info: {
        Args: { card_number: string }
        Returns: {
          class_name: string
          full_name: string
          student_card: string
        }[]
      }
      is_main_admin: { Args: { _user_id: string }; Returns: boolean }
      search_students_for_parent: {
        Args: { _search: string; _search_by?: string }
        Returns: {
          avatar_url: string
          current_class: string
          full_name: string
          source: string
          student_card: string
          user_id: string
        }[]
      }
      verify_admin_code: { Args: { input_code: string }; Returns: boolean }
    }
    Enums: {
      user_role: "student" | "teacher" | "admin" | "parent"
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
      user_role: ["student", "teacher", "admin", "parent"],
    },
  },
} as const
