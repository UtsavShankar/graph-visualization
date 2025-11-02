import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Course {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Node {
  id: string
  title: string
  url?: string  // Legacy field - deprecated
  urls?: string[]  // New field for multiple URLs (optional, defaults to empty array)
  author?: string
  year?: number
  publisher?: string
  color?: string
  tags: string[]
  course_id: string
  abstract?: string
  notes?: string
  pos?: { x: number; y: number }
  metadata?: Record<string, string>
  publisher_site?: string
  companion_website?: string
  relevant_media?: string
  created_at: string
  updated_at: string
}

export interface Edge {
  id: string
  source: string
  target: string
  relation?: string
  note?: string  // Computed field, normalized from relation
  weight?: number
  created_at: string
}
