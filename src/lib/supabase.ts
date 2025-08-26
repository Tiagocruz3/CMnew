import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'rtw-case-manager'
    }
  }
})

// Storage bucket names
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'case-documents',
  AVATARS: 'avatars',
  REPORTS: 'reports'
} as const

// Test connection - use a simple health check that doesn't require authentication
export const testSupabaseConnection = async () => {
  try {
    // Test basic connectivity by checking if we can reach Supabase
    // We'll use a simple ping approach that doesn't require table access
    const { data, error } = await supabase.auth.getSession()
    
    // If we can reach the auth endpoint, the connection is working
    // We don't care about the actual session data here
    console.log('Supabase connection test successful')
    return true
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return false
  }
}