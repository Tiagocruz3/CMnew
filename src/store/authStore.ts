import { create } from 'zustand'
import { User } from '../types'
import { supabaseService } from '../services/supabaseService'
import { supabase, testSupabaseConnection } from '../lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
  clearError: () => void
}

const createUser = (profile: any): User => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  avatar: profile.avatar_url || undefined
})

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    
    try {
      const { user: authUser } = await supabaseService.signIn(email, password)
      
      if (!authUser) {
        throw new Error('Authentication failed')
      }

      const profile = await supabaseService.getCurrentUser()
      
      if (!profile) {
        throw new Error('Profile not found')
      }

      set({
        user: createUser(profile),
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ isLoading: false, error: message })
      throw error
    }
  },
  
  logout: async () => {
    try {
      await supabaseService.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  initialize: async () => {
    const state = get()
    if (state.isLoading) return
    
    set({ isLoading: true, error: null })
    
    console.log('Starting auth initialization...')
    
    // Test Supabase connection first
    console.log('Testing Supabase connection...')
    const isConnected = await testSupabaseConnection()
    if (!isConnected) {
      console.warn('Supabase connection test failed, but continuing with auth initialization...')
      // Don't fail completely - continue with auth initialization
      // The connection test might fail due to RLS policies, but auth might still work
    } else {
      console.log('Supabase connection successful, proceeding with auth...')
    }
    
    // Add timeout to prevent infinite loading (increased to 10s for production)
    const timeoutId = setTimeout(() => {
      console.log('Auth initialization timeout - setting as unauthenticated')
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        error: 'Authentication timeout. Please try refreshing the page.' 
      })
    }, 10000) // 10 second timeout
    
    try {
      console.log('Initializing auth...')
      console.log('Calling supabase.auth.getSession()...')
      
      // Add timeout to getSession to prevent hanging
      const getSessionPromise = supabase.auth.getSession()
      const getSessionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getSession timeout')), 8000)
      )
      
      let session, sessionError
      try {
        const result = await Promise.race([
          getSessionPromise,
          getSessionTimeout
        ])
        session = result.data.session
        sessionError = result.error
      } catch (timeoutError) {
        console.warn('getSession timed out, proceeding without session check:', timeoutError.message)
        // Try to get session from localStorage as fallback
        try {
          const storedSession = localStorage.getItem('sb-yvlfextlthmejhnyhapc-auth-token')
          if (storedSession) {
            console.log('Found stored session in localStorage, attempting to use it')
            const parsedSession = JSON.parse(storedSession)
            if (parsedSession && parsedSession.access_token) {
              session = { user: { id: parsedSession.user?.id, email: parsedSession.user?.email } }
              console.log('Using stored session from localStorage')
            }
          }
        } catch (localStorageError) {
          console.warn('Error reading localStorage session:', localStorageError)
        }
        
        if (!session) {
          // Continue without session - user will need to log in
          session = null
          sessionError = null
        }
      }
      
      console.log('getSession completed:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        userEmail: session?.user?.email,
        error: !!sessionError 
      })
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        // Don't throw error, just continue without session
        session = null
      }
      
      console.log('Session:', session?.user?.email || 'No session')
      
      if (session?.user) {
        console.log('Fetching profile for user:', session.user.id)
        const profile = await supabaseService.getCurrentUser()
        console.log('Profile:', profile)
        
        if (profile) {
          clearTimeout(timeoutId)
          set({
            user: createUser(profile),
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          console.log('Auth initialized successfully')
          return
        }
      }
      
      console.log('No session or profile, setting as unauthenticated')
      clearTimeout(timeoutId)
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    } catch (error) {
      console.error('Auth initialization error:', error)
      clearTimeout(timeoutId)
      // Always stop loading even on error
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize authentication'
      })
    }
  },

  clearError: () => set({ error: null })
}))

// Auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
  const state = useAuthStore.getState()
  
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false,
      error: null 
    })
  } else if (event === 'SIGNED_IN' && session && !state.isAuthenticated) {
    try {
      const profile = await supabaseService.getCurrentUser()
      
      if (profile) {
        useAuthStore.setState({
          user: createUser(profile),
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Auth state change error:', error)
      useAuthStore.setState({ 
        isLoading: false,
        error: 'Authentication state change failed'
      })
    }
  }
})