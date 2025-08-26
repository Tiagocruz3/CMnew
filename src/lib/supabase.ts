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
    console.log('Connection test: Starting...')
    
    // Test basic connectivity by making a simple request to Supabase
    // We'll use a timeout to prevent hanging
    const connectionPromise = fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    // Add a 5-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    )
    
    const response = await Promise.race([connectionPromise, timeoutPromise])
    
    console.log('Connection test: Response received', { status: response.status })
    
    // If we get any response, the connection is working
    console.log('Supabase connection test successful')
    return true
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return false
  }
}