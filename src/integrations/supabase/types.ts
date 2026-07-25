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
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          department: string | null
          email: string
          employee_id: number | null
          failed_attempts: number
          full_name: string
          id: number
          is_locked: boolean
          known_ips: Json
          last_login_ip: string | null
          last_seen_at: string | null
          lock_reason: string | null
          locked_at: string | null
          pending_otp_expires_at: string | null
          pending_otp_hash: string | null
          pending_otp_ip: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          total_online_seconds: number
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          employee_id?: number | null
          failed_attempts?: number
          full_name: string
          id?: number
          is_locked?: boolean
          known_ips?: Json
          last_login_ip?: string | null
          last_seen_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          pending_otp_expires_at?: string | null
          pending_otp_hash?: string | null
          pending_otp_ip?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          total_online_seconds?: number
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: number | null
          failed_attempts?: number
          full_name?: string
          id?: number
          is_locked?: boolean
          known_ips?: Json
          last_login_ip?: string | null
          last_seen_at?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          pending_otp_expires_at?: string | null
          pending_otp_hash?: string | null
          pending_otp_ip?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          total_online_seconds?: number
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: number | null
          employee_name: string | null
          id: number
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id?: number | null
          employee_name?: string | null
          id?: never
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: number | null
          employee_name?: string | null
          id?: never
          status?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          auth_user_id: string | null
          category: string | null
          created_at: string
          error: string | null
          from_email: string | null
          id: number
          meta: Json | null
          provider: string | null
          status: string
          subject: string | null
          to_email: string
        }
        Insert: {
          auth_user_id?: string | null
          category?: string | null
          created_at?: string
          error?: string | null
          from_email?: string | null
          id?: number
          meta?: Json | null
          provider?: string | null
          status?: string
          subject?: string | null
          to_email: string
        }
        Update: {
          auth_user_id?: string | null
          category?: string | null
          created_at?: string
          error?: string | null
          from_email?: string | null
          id?: number
          meta?: Json | null
          provider?: string | null
          status?: string
          subject?: string | null
          to_email?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          applicant_signature_date: string | null
          approval_date: string | null
          approval_status: string | null
          approved_by: string | null
          background_check: string | null
          bank_account: string | null
          bank_name: string | null
          basic_salary: number | null
          chk_bank_details: string | null
          chk_cnic_copy: string | null
          chk_edu_certs: string | null
          chk_emergency_form: string | null
          chk_exp_letters: string | null
          chk_medical: string | null
          chk_nda: string | null
          chk_ntn_cert: string | null
          chk_offer_letter: string | null
          chk_photograph: string | null
          chk_police: string | null
          chk_reference_letters: string | null
          city: string | null
          cnic: string | null
          cnic_verified: string | null
          confirmation_date: string | null
          contract_type: string | null
          conveyance_allowance: number | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          district: string | null
          documents: string | null
          documents_verified: string | null
          driving_licence: string | null
          education: string | null
          email: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          emergency_whatsapp: string | null
          employee_code: string | null
          employment_type: string | null
          eobi: number | null
          father_husband_name: string | null
          gender: string | null
          gross_salary: number | null
          head_of_hr_date: string | null
          head_of_hr_name: string | null
          house_rent_allowance: number | null
          hr_officer_date: string | null
          hr_officer_name: string | null
          hr_verification_remarks: string | null
          id: number
          income_tax: number | null
          join_date: string | null
          marital_status: string | null
          md_date: string | null
          md_name: string | null
          medical_allowance: number | null
          medical_check: string | null
          mother_name: string | null
          name: string
          nationality: string | null
          net_salary: number | null
          office_remarks: string | null
          other_allowances: number | null
          other_deductions: number | null
          passport_no: string | null
          permanent_address: string | null
          phone: string | null
          phone2: string | null
          position: string | null
          postal_address: string | null
          probation_period: string | null
          provident_fund: number | null
          province: string | null
          received_by: string | null
          received_date: string | null
          references_checked: string | null
          religion: string | null
          reporting_manager: string | null
          residence_status: string | null
          status: string
          tax_number: string | null
          tehsil: string | null
          verified_by: string | null
          whatsapp: string | null
          work_experience: string | null
          work_location: string | null
        }
        Insert: {
          applicant_signature_date?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          background_check?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          chk_bank_details?: string | null
          chk_cnic_copy?: string | null
          chk_edu_certs?: string | null
          chk_emergency_form?: string | null
          chk_exp_letters?: string | null
          chk_medical?: string | null
          chk_nda?: string | null
          chk_ntn_cert?: string | null
          chk_offer_letter?: string | null
          chk_photograph?: string | null
          chk_police?: string | null
          chk_reference_letters?: string | null
          city?: string | null
          cnic?: string | null
          cnic_verified?: string | null
          confirmation_date?: string | null
          contract_type?: string | null
          conveyance_allowance?: number | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          district?: string | null
          documents?: string | null
          documents_verified?: string | null
          driving_licence?: string | null
          education?: string | null
          email: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          emergency_whatsapp?: string | null
          employee_code?: string | null
          employment_type?: string | null
          eobi?: number | null
          father_husband_name?: string | null
          gender?: string | null
          gross_salary?: number | null
          head_of_hr_date?: string | null
          head_of_hr_name?: string | null
          house_rent_allowance?: number | null
          hr_officer_date?: string | null
          hr_officer_name?: string | null
          hr_verification_remarks?: string | null
          id?: never
          income_tax?: number | null
          join_date?: string | null
          marital_status?: string | null
          md_date?: string | null
          md_name?: string | null
          medical_allowance?: number | null
          medical_check?: string | null
          mother_name?: string | null
          name: string
          nationality?: string | null
          net_salary?: number | null
          office_remarks?: string | null
          other_allowances?: number | null
          other_deductions?: number | null
          passport_no?: string | null
          permanent_address?: string | null
          phone?: string | null
          phone2?: string | null
          position?: string | null
          postal_address?: string | null
          probation_period?: string | null
          provident_fund?: number | null
          province?: string | null
          received_by?: string | null
          received_date?: string | null
          references_checked?: string | null
          religion?: string | null
          reporting_manager?: string | null
          residence_status?: string | null
          status?: string
          tax_number?: string | null
          tehsil?: string | null
          verified_by?: string | null
          whatsapp?: string | null
          work_experience?: string | null
          work_location?: string | null
        }
        Update: {
          applicant_signature_date?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          background_check?: string | null
          bank_account?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          chk_bank_details?: string | null
          chk_cnic_copy?: string | null
          chk_edu_certs?: string | null
          chk_emergency_form?: string | null
          chk_exp_letters?: string | null
          chk_medical?: string | null
          chk_nda?: string | null
          chk_ntn_cert?: string | null
          chk_offer_letter?: string | null
          chk_photograph?: string | null
          chk_police?: string | null
          chk_reference_letters?: string | null
          city?: string | null
          cnic?: string | null
          cnic_verified?: string | null
          confirmation_date?: string | null
          contract_type?: string | null
          conveyance_allowance?: number | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          district?: string | null
          documents?: string | null
          documents_verified?: string | null
          driving_licence?: string | null
          education?: string | null
          email?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          emergency_whatsapp?: string | null
          employee_code?: string | null
          employment_type?: string | null
          eobi?: number | null
          father_husband_name?: string | null
          gender?: string | null
          gross_salary?: number | null
          head_of_hr_date?: string | null
          head_of_hr_name?: string | null
          house_rent_allowance?: number | null
          hr_officer_date?: string | null
          hr_officer_name?: string | null
          hr_verification_remarks?: string | null
          id?: never
          income_tax?: number | null
          join_date?: string | null
          marital_status?: string | null
          md_date?: string | null
          md_name?: string | null
          medical_allowance?: number | null
          medical_check?: string | null
          mother_name?: string | null
          name?: string
          nationality?: string | null
          net_salary?: number | null
          office_remarks?: string | null
          other_allowances?: number | null
          other_deductions?: number | null
          passport_no?: string | null
          permanent_address?: string | null
          phone?: string | null
          phone2?: string | null
          position?: string | null
          postal_address?: string | null
          probation_period?: string | null
          provident_fund?: number | null
          province?: string | null
          received_by?: string | null
          received_date?: string | null
          references_checked?: string | null
          religion?: string | null
          reporting_manager?: string | null
          residence_status?: string | null
          status?: string
          tax_number?: string | null
          tehsil?: string | null
          verified_by?: string | null
          whatsapp?: string | null
          work_experience?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      feedback_calls: {
        Row: {
          call_date: string
          called_by_employee_id: number | null
          called_by_name: string | null
          created_at: string
          customer_id: number | null
          customer_name: string
          email: string | null
          id: number
          notes: string | null
          phone: string | null
          project_ref: string | null
          q1_service: number | null
          q2_communication: number | null
          q3_quality: number | null
          q4_recommend: number | null
          q5_timeline: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          call_date?: string
          called_by_employee_id?: number | null
          called_by_name?: string | null
          created_at?: string
          customer_id?: number | null
          customer_name: string
          email?: string | null
          id?: number
          notes?: string | null
          phone?: string | null
          project_ref?: string | null
          q1_service?: number | null
          q2_communication?: number | null
          q3_quality?: number | null
          q4_recommend?: number | null
          q5_timeline?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          call_date?: string
          called_by_employee_id?: number | null
          called_by_name?: string | null
          created_at?: string
          customer_id?: number | null
          customer_name?: string
          email?: string | null
          id?: number
          notes?: string | null
          phone?: string | null
          project_ref?: string | null
          q1_service?: number | null
          q2_communication?: number | null
          q3_quality?: number | null
          q4_recommend?: number | null
          q5_timeline?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          holiday_date: string
          id: string
          name: string
          recurring: boolean
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
          name: string
          recurring?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
          name?: string
          recurring?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          recipient_id: string
          recipient_name: string
          sender_id: string
          sender_name: string
          subject: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id: string
          recipient_name: string
          sender_id: string
          sender_name: string
          subject?: string | null
          thread_id?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          recipient_id?: string
          recipient_name?: string
          sender_id?: string
          sender_name?: string
          subject?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_notices: {
        Row: {
          attachments: Json
          audience: string
          body: string
          created_at: string
          id: string
          priority: string
          read_by: string[]
          recipient_ids: string[]
          sender_id: string
          sender_name: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          audience?: string
          body: string
          created_at?: string
          id?: string
          priority?: string
          read_by?: string[]
          recipient_ids?: string[]
          sender_id: string
          sender_name: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          audience?: string
          body?: string
          created_at?: string
          id?: string
          priority?: string
          read_by?: string[]
          recipient_ids?: string[]
          sender_id?: string
          sender_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          allocated: number
          carried_forward: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          notes: string | null
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allocated?: number
          carried_forward?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          notes?: string | null
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allocated?: number
          carried_forward?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          notes?: string | null
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          applied_at: string
          attachment_url: string | null
          created_at: string
          days: number
          employee_id: string
          employee_name: string | null
          end_date: string
          half_day: boolean
          id: string
          leave_type_id: string | null
          leave_type_name: string | null
          reason: string | null
          reviewed_at: string | null
          reviewer: string | null
          reviewer_comment: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          attachment_url?: string | null
          created_at?: string
          days?: number
          employee_id: string
          employee_name?: string | null
          end_date: string
          half_day?: boolean
          id?: string
          leave_type_id?: string | null
          leave_type_name?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          reviewer_comment?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          attachment_url?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          employee_name?: string | null
          end_date?: string
          half_day?: boolean
          id?: string
          leave_type_id?: string | null
          leave_type_name?: string | null
          reason?: string | null
          reviewed_at?: string | null
          reviewer?: string | null
          reviewer_comment?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          active: boolean
          code: string | null
          color: string | null
          created_at: string
          default_days: number
          description: string | null
          id: string
          name: string
          paid: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          color?: string | null
          created_at?: string
          default_days?: number
          description?: string | null
          id?: string
          name: string
          paid?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          color?: string | null
          created_at?: string
          default_days?: number
          description?: string | null
          id?: string
          name?: string
          paid?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          host_name: string
          id: string
          meeting_type: string
          participant_ids: string[]
          participant_names: string[]
          recording_url: string | null
          room_name: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          host_name: string
          id?: string
          meeting_type?: string
          participant_ids?: string[]
          participant_names?: string[]
          recording_url?: string | null
          room_name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          host_name?: string
          id?: string
          meeting_type?: string
          participant_ids?: string[]
          participant_names?: string[]
          recording_url?: string | null
          room_name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_logs: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: number
          ip_address: string | null
          message: string | null
          meta: Json | null
          purpose: string
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: number
          ip_address?: string | null
          message?: string | null
          meta?: Json | null
          purpose?: string
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: number
          ip_address?: string | null
          message?: string | null
          meta?: Json | null
          purpose?: string
          status?: string
        }
        Relationships: []
      }
      project_activity_logs: {
        Row: {
          action: string | null
          actor: string | null
          created_at: string | null
          id: number
          meta: Json | null
          project_id: number | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          id?: number
          meta?: Json | null
          project_id?: number | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          id?: number
          meta?: Json | null
          project_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          approved: number | null
          category: string | null
          created_at: string | null
          estimated: number | null
          id: number
          notes: string | null
          project_id: number | null
          spent: number | null
          updated_at: string | null
        }
        Insert: {
          approved?: number | null
          category?: string | null
          created_at?: string | null
          estimated?: number | null
          id?: number
          notes?: string | null
          project_id?: number | null
          spent?: number | null
          updated_at?: string | null
        }
        Update: {
          approved?: number | null
          category?: string | null
          created_at?: string | null
          estimated?: number | null
          id?: number
          notes?: string | null
          project_id?: number | null
          spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string | null
          id: number
          name: string
          path: string | null
          project_id: number | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          path?: string | null
          project_id?: number | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          path?: string | null
          project_id?: number | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          id: number
          note: string | null
          project_id: number | null
          receipt_path: string | null
          spent_on: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: number
          note?: string | null
          project_id?: number | null
          receipt_path?: string | null
          spent_on?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: number
          note?: string | null
          project_id?: number | null
          receipt_path?: string | null
          spent_on?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_meetings: {
        Row: {
          action_items: string | null
          agenda: string | null
          attendees: string[] | null
          created_at: string | null
          duration_min: number | null
          id: number
          meeting_at: string | null
          notes: string | null
          project_id: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_items?: string | null
          agenda?: string | null
          attendees?: string[] | null
          created_at?: string | null
          duration_min?: number | null
          id?: number
          meeting_at?: string | null
          notes?: string | null
          project_id?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_items?: string | null
          agenda?: string | null
          attendees?: string[] | null
          created_at?: string | null
          duration_min?: number | null
          id?: number
          meeting_at?: string | null
          notes?: string | null
          project_id?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          allocation: number | null
          created_at: string | null
          employee_id: number | null
          employee_name: string | null
          id: number
          joined_on: string | null
          project_id: number | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          allocation?: number | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          id?: number
          joined_on?: string | null
          project_id?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          allocation?: number | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          id?: number
          joined_on?: string | null
          project_id?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          budget: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: number
          progress: number | null
          project_id: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          progress?: number | null
          project_id?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: number
          progress?: number | null
          project_id?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_task_checklists: {
        Row: {
          created_at: string | null
          done: boolean | null
          id: number
          label: string
          task_id: number | null
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          id?: number
          label: string
          task_id?: number | null
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          id?: number
          label?: string
          task_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_task_comments: {
        Row: {
          author: string | null
          body: string
          created_at: string | null
          id: number
          task_id: number | null
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string | null
          id?: number
          task_id?: number | null
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string | null
          id?: number
          task_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_timesheets: {
        Row: {
          billable: boolean | null
          created_at: string | null
          employee_id: number | null
          employee_name: string | null
          ended_at: string | null
          entry_date: string | null
          id: number
          minutes: number | null
          note: string | null
          project_id: number | null
          started_at: string | null
          task_id: number | null
          updated_at: string | null
        }
        Insert: {
          billable?: boolean | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          ended_at?: string | null
          entry_date?: string | null
          id?: number
          minutes?: number | null
          note?: string | null
          project_id?: number | null
          started_at?: string | null
          task_id?: number | null
          updated_at?: string | null
        }
        Update: {
          billable?: boolean | null
          created_at?: string | null
          employee_id?: number | null
          employee_name?: string | null
          ended_at?: string | null
          entry_date?: string | null
          id?: number
          minutes?: number | null
          note?: string | null
          project_id?: number | null
          started_at?: string | null
          task_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_timesheets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean | null
          attachment: string | null
          budget: number | null
          category: string | null
          client: string | null
          code: string | null
          color: string | null
          created_at: string
          currency: string | null
          deadline: string | null
          department: string | null
          description: string | null
          estimated_hours: number | null
          favorite: boolean | null
          id: number
          manager: string | null
          name: string
          priority: string | null
          progress: number
          start_date: string | null
          status: string
          status_history: Json
          tags: string[] | null
          team_members: string[] | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          attachment?: string | null
          budget?: number | null
          category?: string | null
          client?: string | null
          code?: string | null
          color?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          estimated_hours?: number | null
          favorite?: boolean | null
          id?: never
          manager?: string | null
          name: string
          priority?: string | null
          progress?: number
          start_date?: string | null
          status?: string
          status_history?: Json
          tags?: string[] | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          attachment?: string | null
          budget?: number | null
          category?: string | null
          client?: string | null
          code?: string | null
          color?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          department?: string | null
          description?: string | null
          estimated_hours?: number | null
          favorite?: boolean | null
          id?: never
          manager?: string | null
          name?: string
          priority?: string | null
          progress?: number
          start_date?: string | null
          status?: string
          status_history?: Json
          tags?: string[] | null
          team_members?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: number
          level: string
          message: string
          meta: Json | null
          source: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: number
          level?: string
          message: string
          meta?: Json | null
          source?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: number
          level?: string
          message?: string
          meta?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee: string | null
          attachment: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: number
          priority: string
          project_id: number | null
          start_date: string | null
          status: string
          status_history: Json
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assignee?: string | null
          attachment?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: never
          priority?: string
          project_id?: number | null
          start_date?: string | null
          status?: string
          status_history?: Json
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assignee?: string | null
          attachment?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: never
          priority?: string
          project_id?: number | null
          start_date?: string | null
          status?: string
          status_history?: Json
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          auth_user_id: string | null
          created_at: string
          description: string | null
          full_name: string | null
          id: number
          ip_address: string | null
          meta: Json | null
          module: string | null
          user_agent: string | null
          username: string | null
        }
        Insert: {
          action: string
          auth_user_id?: string | null
          created_at?: string
          description?: string | null
          full_name?: string | null
          id?: number
          ip_address?: string | null
          meta?: Json | null
          module?: string | null
          user_agent?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          auth_user_id?: string | null
          created_at?: string
          description?: string | null
          full_name?: string | null
          id?: number
          ip_address?: string | null
          meta?: Json | null
          module?: string | null
          user_agent?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_login_logs: {
        Row: {
          auth_user_id: string | null
          browser: string | null
          city: string | null
          country: string | null
          device: string | null
          duration_seconds: number | null
          email: string | null
          full_name: string | null
          id: number
          ip_address: string | null
          login_at: string
          logout_at: string | null
          os: string | null
          status: string
          user_agent: string | null
          username: string | null
        }
        Insert: {
          auth_user_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          duration_seconds?: number | null
          email?: string | null
          full_name?: string | null
          id?: number
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          os?: string | null
          status?: string
          user_agent?: string | null
          username?: string | null
        }
        Update: {
          auth_user_id?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          duration_seconds?: number | null
          email?: string | null
          full_name?: string | null
          id?: number
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          os?: string | null
          status?: string
          user_agent?: string | null
          username?: string | null
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "hr"
        | "finance"
        | "sales"
        | "support"
        | "employee"
        | "viewer"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "hr",
        "finance",
        "sales",
        "support",
        "employee",
        "viewer",
      ],
    },
  },
} as const
