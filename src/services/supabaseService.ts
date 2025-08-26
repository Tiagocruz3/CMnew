import { supabase, STORAGE_BUCKETS } from '../lib/supabase'
import { Case, Communication, Document, CaseNote, SupervisorNote, Stakeholder } from '../types'
import { Database, Json } from '../types/database'

type Tables = Database['public']['Tables']

export class SupabaseService {
  // Database connection test
  async testDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      console.log('Testing database connection with simple query...')
      
      // Prefer an RPC to auth endpoint which doesn't require table access
      // Fallback to a lightweight request to the REST root
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.warn('Auth session check error during DB test:', sessionError.message)
        }
      } catch {}
      
      const url = (import.meta as any).env?.VITE_SUPABASE_URL || ''
      const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (!res.ok) {
        return { connected: false, error: `HTTP ${res.status}` }
      }
      
      console.log('Database connection test successful')
      return { connected: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Database connection test error:', errorMessage)
      return { connected: false, error: errorMessage }
    }
  }

  // Authentication
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    try {
      console.log('Getting current user...')
      
      // Add timeout to getUser to avoid hanging
      const getUserPromise = supabase.auth.getUser()
      const getUserTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getUser timeout')), 5000)
      )
      
      let user: any | null = null
      try {
        const { data } = await Promise.race([getUserPromise, getUserTimeout]) as any
        user = data?.user || null
      } catch (err) {
        console.warn('getUser timed out, attempting localStorage fallback')
        // Try to read a stored session (same key used by Supabase)
        try {
          const storedSession = localStorage.getItem('sb-yvlfextlthmejhnyhapc-auth-token')
          if (storedSession) {
            const parsedSession = JSON.parse(storedSession)
            if (parsedSession?.user?.id) {
              user = { id: parsedSession.user.id, email: parsedSession.user.email }
            }
          }
        } catch {}
      }
      if (!user) return null

      console.log('Fetching profile for user:', user.id)
      
      // Add timeout to profile fetch
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      )
      
      const { data: profile, error } = await Promise.race([profilePromise, profileTimeout])

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      console.log('Profile fetched successfully')
      return profile
    } catch (error) {
      console.error('Error in getCurrentUser:', error)
      return null
    }
  }

  // Cases
  async getCases(): Promise<Case[]> {
    try {
      console.log('Fetching cases...')
      
      // First, test if we can even reach the database
      console.log('Testing database connectivity...')
      const healthCheck = await this.testDatabaseConnection()
      
      if (!healthCheck.connected) {
        console.error('Database connection failed:', healthCheck.error)
        throw new Error(`Database connection failed: ${healthCheck.error}`)
      }
      
      console.log('Database connection successful, proceeding with cases fetch...')
      
      // Add timeout to prevent hanging. Start with a lean query (no joins)
      const casesPromise = supabase
        .from('cases')
        .select(
          'id, worker_data, employer_data, case_manager_id, claim_number, injury_date, injury_description, first_certificate_date, planned_rtw_date, review_dates, rtw_plan, consultant_id, status, claim_type, jurisdiction, agent, wages_salary, piawe_calculation, outcome, created_at, updated_at'
        )
        .order('created_at', { ascending: false })
        .limit(50)
      
      const casesTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cases fetch timeout')), 15000)
      )
      
      const { data, error } = await Promise.race([casesPromise, casesTimeout])
      
      if (error) {
        console.error('Cases query error:', error)
        throw error
      }
      
      console.log(`Fetched ${data?.length || 0} cases`)

      // Skip profile hydration to avoid extra requests; UI will render with IDs
      return data.map(caseItem => this.transformCaseFromDB(caseItem, new Map()))
    } catch (error) {
      console.error('Error fetching cases:', error)
      
      // If cases fetch fails, return empty array with a message
      console.warn('Cases fetch failed, returning empty array. This might be due to:')
      console.warn('1. No cases exist in the database yet')
      console.warn('2. RLS policies blocking access')
      console.warn('3. Database connection issues')
      
      return []
    }
  }

  async getCase(id: string): Promise<Case | null> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          communications(*),
          documents(*),
          case_notes(*),
          supervisor_notes(*),
          stakeholders(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      // Get profiles for case manager and consultant
      const userIds = [data.case_manager_id, data.consultant_id].filter(Boolean)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

      return this.transformCaseFromDB(data, profileMap)
    } catch (error) {
      console.error('Error fetching case:', error)
      return null
    }
  }

  async createCase(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Promise<Case> {
    const dbCase = this.transformCaseForDB(caseData)
    
    const { data, error } = await supabase
      .from('cases')
      .insert(dbCase)
      .select(`
        *,
        communications(*),
        documents(*),
        case_notes(*),
        supervisor_notes(*),
        stakeholders(*)
      `)
      .single()

    if (error) throw error

    // Get profiles for the created case
    const userIds = [data.case_manager_id, data.consultant_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return this.transformCaseFromDB(data, profileMap)
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case> {
    const dbUpdates = this.transformCaseUpdatesForDB(updates)
    
    const { data, error } = await supabase
      .from('cases')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        communications(*),
        documents(*),
        case_notes(*),
        supervisor_notes(*),
        stakeholders(*)
      `)
      .single()

    if (error) throw error

    // Get profiles for the updated case
    const userIds = [data.case_manager_id, data.consultant_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return this.transformCaseFromDB(data, profileMap)
  }

  // Communications
  async addCommunication(caseId: string, communication: Omit<Communication, 'id'>): Promise<Communication> {
    const { data, error } = await supabase
      .from('communications')
      .insert({
        case_id: caseId,
        type: communication.type,
        content: communication.content,
        author: communication.author,
        created_at: communication.date
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      type: data.type,
      date: data.created_at,
      content: data.content,
      author: data.author
    }
  }

  // Documents
  async uploadDocument(file: File, caseId: string, category?: string): Promise<Document> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${caseId}/${Date.now()}.${fileExt}`
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.DOCUMENTS)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKETS.DOCUMENTS)
      .getPublicUrl(fileName)

    // Save document record
    const { data, error } = await supabase
      .from('documents')
      .insert({
        case_id: caseId,
        name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        category: category as any,
        uploaded_by: (await this.getCurrentUser())?.id || 'unknown'
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      type: data.file_type,
      url: publicUrl,
      uploadDate: data.created_at,
      size: data.file_size,
      category: data.category as any
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    // Get document info first
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKETS.DOCUMENTS)
      .remove([doc.file_path])

    if (storageError) throw storageError

    // Delete record
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
  }

  async deleteCase(caseId: string): Promise<void> {
    console.log('Attempting to delete case:', caseId);
    
    try {
      // Delete the case - related records will be automatically deleted due to CASCADE
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId)

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      console.log('Case deleted successfully:', caseId);
    } catch (error) {
      console.error('Error in deleteCase:', error);
      throw error;
    }
  }

  // Case Notes
  async addCaseNote(caseId: string, content: string, author: string): Promise<CaseNote> {
    const { data, error } = await supabase
      .from('case_notes')
      .insert({
        case_id: caseId,
        content,
        author
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      author: data.author
    }
  }

  // Supervisor Notes
  async addSupervisorNote(caseId: string, note: Omit<SupervisorNote, 'id' | 'createdAt'>): Promise<SupervisorNote> {
    const { data, error } = await supabase
      .from('supervisor_notes')
      .insert({
        case_id: caseId,
        content: note.content,
        author: note.author,
        author_role: note.authorRole,
        type: note.type,
        priority: note.priority,
        status: note.status,
        parent_id: note.parentId || null,
        requires_response: note.requiresResponse || false,
        read_by: note.readBy
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      content: data.content,
      author: data.author,
      authorRole: data.author_role,
      createdAt: data.created_at,
      type: data.type,
      priority: data.priority,
      status: data.status,
      parentId: data.parent_id,
      requiresResponse: data.requires_response,
      readBy: data.read_by
    }
  }

  async updateSupervisorNote(id: string, updates: Partial<SupervisorNote>): Promise<void> {
    const dbUpdates: any = {}
    if (updates.status) dbUpdates.status = updates.status
    if (updates.readBy) dbUpdates.read_by = updates.readBy
    if (updates.priority) dbUpdates.priority = updates.priority

    const { error } = await supabase
      .from('supervisor_notes')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error
  }

  // Stakeholders
  async addStakeholder(caseId: string, stakeholder: Omit<Stakeholder, 'id' | 'addedDate'>): Promise<Stakeholder> {
    const { data, error } = await supabase
      .from('stakeholders')
      .insert({
        case_id: caseId,
        type: stakeholder.type,
        name: stakeholder.name,
        organization: stakeholder.organization,
        title: stakeholder.title,
        phone: stakeholder.phone,
        email: stakeholder.email,
        address: stakeholder.address,
        fax: stakeholder.fax,
        specialization: stakeholder.specialization,
        notes: stakeholder.notes,
        is_primary: stakeholder.isPrimary,
        is_active: stakeholder.isActive,
        last_contact_date: stakeholder.lastContactDate
      })
      .select()
      .single()

    if (error) throw error

    return this.transformStakeholderFromDB(data)
  }

  async updateStakeholder(id: string, updates: Partial<Stakeholder>): Promise<void> {
    const dbUpdates: any = {}
    if (updates.name) dbUpdates.name = updates.name
    if (updates.phone) dbUpdates.phone = updates.phone
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
    if (updates.lastContactDate !== undefined) dbUpdates.last_contact_date = updates.lastContactDate

    const { error } = await supabase
      .from('stakeholders')
      .update(dbUpdates)
      .eq('id', id)

    if (error) throw error
  }

  // Notifications
  async createNotification(notification: {
    userId: string
    type: string
    title: string
    message: string
    caseId?: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    actionRequired?: boolean
    metadata?: any
  }) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        case_id: notification.caseId,
        priority: notification.priority || 'medium',
        action_required: notification.actionRequired || false,
        metadata: notification.metadata
      })

    if (error) throw error
  }

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
  }

  // Real-time subscriptions
  subscribeToCase(caseId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`case-${caseId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${caseId}` },
        callback
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'communications', filter: `case_id=eq.${caseId}` },
        callback
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'supervisor_notes', filter: `case_id=eq.${caseId}` },
        callback
      )
      .subscribe()
  }

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        callback
      )
      .subscribe()
  }

  // Helper methods for data transformation
  private transformCaseFromDB(dbCase: any, profileMap?: Map<string, any>): Case {
    // Get case manager profile from map or create fallback
    const caseManagerProfile = profileMap?.get(dbCase.case_manager_id)
    const caseManager = caseManagerProfile ? {
      id: caseManagerProfile.id,
      name: caseManagerProfile.name,
      email: caseManagerProfile.email,
      phone: '', // Not stored in profiles table
      role: caseManagerProfile.role,
      avatar: caseManagerProfile.avatar_url
    } : {
      id: dbCase.case_manager_id,
      name: 'Case Manager',
      email: '',
      phone: '',
      role: 'consultant' as const,
      avatar: undefined
    }

    return {
      id: dbCase.id,
      worker: dbCase.worker_data,
      employer: dbCase.employer_data,
      caseManager,
      claimNumber: dbCase.claim_number,
      injuryDate: dbCase.injury_date,
      injuryDescription: dbCase.injury_description,
      firstCertificateDate: dbCase.first_certificate_date,
      plannedRtwDate: dbCase.planned_rtw_date,
      reviewDates: dbCase.review_dates || [],
      documents: (dbCase.documents || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.file_type,
        url: supabase.storage.from(STORAGE_BUCKETS.DOCUMENTS).getPublicUrl(doc.file_path).data.publicUrl,
        uploadDate: doc.created_at,
        size: doc.file_size,
        category: doc.category
      })),
      communications: (dbCase.communications || []).map((comm: any) => ({
        id: comm.id,
        type: comm.type,
        date: comm.created_at,
        content: comm.content,
        author: comm.author
      })),
      notes: (dbCase.case_notes || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        createdAt: note.created_at,
        author: note.author
      })),
      supervisorNotes: (dbCase.supervisor_notes || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        author: note.author,
        authorRole: note.author_role,
        createdAt: note.created_at,
        type: note.type,
        priority: note.priority,
        status: note.status,
        parentId: note.parent_id,
        requiresResponse: note.requires_response,
        readBy: note.read_by
      })),
      stakeholders: (dbCase.stakeholders || []).map(this.transformStakeholderFromDB),
      rtwPlan: dbCase.rtw_plan,
      consultant: dbCase.consultant_id,
      status: dbCase.status,
      claimType: dbCase.claim_type,
      jurisdiction: dbCase.jurisdiction,
      agent: dbCase.agent,
      wagesSalary: dbCase.wages_salary,
      piaweCalculation: dbCase.piawe_calculation,
      outcome: dbCase.outcome,
      createdAt: dbCase.created_at,
      updatedAt: dbCase.updated_at,
      workcoverType: dbCase.workcover_type
    }
  }

  private transformCaseForDB(caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Tables['cases']['Insert'] {
    return {
      worker_data: caseData.worker as unknown as Json,
      employer_data: caseData.employer as unknown as Json,
      case_manager_id: caseData.caseManager.id,
      claim_number: caseData.claimNumber,
      injury_date: caseData.injuryDate,
      injury_description: caseData.injuryDescription,
      first_certificate_date: caseData.firstCertificateDate,
      planned_rtw_date: caseData.plannedRtwDate,
      review_dates: caseData.reviewDates,
      rtw_plan: caseData.rtwPlan as unknown as Json,
      consultant_id: caseData.consultant,
      status: caseData.status,
      claim_type: caseData.claimType,
      jurisdiction: caseData.jurisdiction,
      agent: caseData.agent,
      wages_salary: caseData.wagesSalary as unknown as Json,
      piawe_calculation: caseData.piaweCalculation as unknown as Json,
      outcome: caseData.outcome as unknown as Json
    }
  }

  private transformCaseUpdatesForDB(updates: Partial<Case>): Tables['cases']['Update'] {
    const dbUpdates: Tables['cases']['Update'] = {
      updated_at: new Date().toISOString()
    }

    if (updates.worker) dbUpdates.worker_data = updates.worker as unknown as Json
    if (updates.employer) dbUpdates.employer_data = updates.employer as unknown as Json
    if (updates.claimNumber) dbUpdates.claim_number = updates.claimNumber
    if (updates.injuryDate) dbUpdates.injury_date = updates.injuryDate
    if (updates.injuryDescription) dbUpdates.injury_description = updates.injuryDescription
    if (updates.firstCertificateDate) dbUpdates.first_certificate_date = updates.firstCertificateDate
    if (updates.plannedRtwDate) dbUpdates.planned_rtw_date = updates.plannedRtwDate
    if (updates.reviewDates) dbUpdates.review_dates = updates.reviewDates
    if (updates.rtwPlan) dbUpdates.rtw_plan = updates.rtwPlan as unknown as Json
    if (updates.status) dbUpdates.status = updates.status
    if (updates.consultant !== undefined) dbUpdates.consultant_id = updates.consultant
    if (updates.claimType !== undefined) dbUpdates.claim_type = updates.claimType
    if (updates.jurisdiction !== undefined) dbUpdates.jurisdiction = updates.jurisdiction
    if (updates.agent !== undefined) dbUpdates.agent = updates.agent
    if (updates.wagesSalary !== undefined) dbUpdates.wages_salary = updates.wagesSalary as unknown as Json
    if (updates.piaweCalculation !== undefined) dbUpdates.piawe_calculation = updates.piaweCalculation as unknown as Json
    if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome as unknown as Json
    if (updates.workcoverType !== undefined) dbUpdates.workcover_type = updates.workcoverType;

    return dbUpdates
  }

  private transformStakeholderFromDB(dbStakeholder: any): Stakeholder {
    return {
      id: dbStakeholder.id,
      type: dbStakeholder.type,
      name: dbStakeholder.name,
      organization: dbStakeholder.organization,
      title: dbStakeholder.title,
      phone: dbStakeholder.phone,
      email: dbStakeholder.email,
      address: dbStakeholder.address,
      fax: dbStakeholder.fax,
      specialization: dbStakeholder.specialization,
      notes: dbStakeholder.notes,
      isPrimary: dbStakeholder.is_primary,
      isActive: dbStakeholder.is_active,
      addedDate: dbStakeholder.created_at,
      lastContactDate: dbStakeholder.last_contact_date
    }
  }
}

export const supabaseService = new SupabaseService()