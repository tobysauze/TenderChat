import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if we're using placeholder credentials
const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export a flag to check if we're in demo mode
export const isDemoMode = isPlaceholder

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          role: string
          experience: string
          age: number
          nationality: string
          languages: string[]
          certifications: string[]
          interests: string[]
          bio: string
          availability: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          role: string
          experience: string
          age: number
          nationality: string
          languages: string[]
          certifications: string[]
          interests: string[]
          bio: string
          availability: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          role?: string
          experience?: string
          age?: number
          nationality?: string
          languages?: string[]
          certifications?: string[]
          interests?: string[]
          bio?: string
          availability?: string
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          profile_id: string
          url: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          url: string
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          url?: string
          order?: number
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          match_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}
