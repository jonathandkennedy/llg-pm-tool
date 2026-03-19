import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user) {
          fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserRole(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setUser(data)
      setUserRole(data?.role || 'member')
    } catch (err) {
      console.error('Error fetching user profile:', err)
      // User exists in auth but not in users table yet
      setUser({ id: userId, email: session?.user?.email })
      setUserRole('member')
    } finally {
      setLoading(false)
    }
  }

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSession(null)
      setUser(null)
      setUserRole(null)
    }
    return { error }
  }

  return {
    session,
    user,
    userRole,
    loading,
    signInWithEmail,
    signOut,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager' || userRole === 'admin',
  }
}
