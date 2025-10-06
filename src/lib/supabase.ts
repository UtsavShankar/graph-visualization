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
  url?: string
  author?: string
  year?: number
  color?: string
  tags: string[]
  course_id: string
  abstract?: string
  notes?: string
  pos?: { x: number; y: number }
  created_at: string
  updated_at: string
}

export interface Edge {
  id: string
  source: string
  target: string
  relation?: string
  weight?: number
  created_at: string
}
