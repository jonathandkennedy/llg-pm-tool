import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useHashRoute } from './hooks/useHashRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LaunchBoard from './pages/LaunchBoard.jsx'
import OngoingBoard from './pages/OngoingBoard.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import Tasks from './pages/Tasks.jsx'
import Workload from './pages/Workload.jsx'
import Reports from './pages/Reports.jsx'
import Inbox from './pages/Inbox.jsx'
import Settings from './pages/Settings.jsx'

const DEMO_USER = {
  id: 'demo',
  email: 'nick@lucrativelegal.com',
  full_name: 'Nick',
  role: 'admin',
  department: 'executive',
  is_manager: true,
}

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [user, setUser] = useState(null)
  const [isDemo, setIsDemo] = useState(false)
  const { route, navigate } = useHashRoute('dashboard')

  useEffect(() => {
    if (window.location.hash.includes('demo') || localStorage.getItem('llg_demo') === 'true') {
      setUser(DEMO_USER)
      setIsDemo(true)
      setAuthState('authenticated')
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setAuthState('unauthenticated')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserProfile(session.user)
        } else if (!isDemo) {
          setUser(null)
          setAuthState('unauthenticated')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(authUser) {
    try {
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      setUser(data || { id: authUser.id, email: authUser.email, role: 'member' })
    } catch {
      setUser({ id: authUser.id, email: authUser.email, role: 'member' })
    }
    setAuthState('authenticated')
  }

  async function signInWithEmail(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error }
  }

  function enterDemo() {
    localStorage.setItem('llg_demo', 'true')
    setUser(DEMO_USER)
    setIsDemo(true)
    setAuthState('authenticated')
    navigate('dashboard')
  }

  async function handleSignOut() {
    localStorage.removeItem('llg_demo')
    setIsDemo(false)
    await supabase.auth.signOut()
    setUser(null)
    setAuthState('unauthenticated')
    navigate('dashboard')
  }

  if (authState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--slate-50)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, background: 'var(--brand-600)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 18, margin: '0 auto 16px',
          }}>LL</div>
          <div style={{ color: 'var(--slate-500)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <Login onSignIn={signInWithEmail} onDemo={enterDemo} />
  }

  // Parse route — support "project/UUID" pattern
  const routeParts = route.split('/')
  const basePage = routeParts[0]
  const subId = routeParts[1] || null

  function renderPage() {
    // Project detail view
    if (basePage === 'project' && subId) {
      return <ProjectDetail projectId={subId} onBack={() => navigate('projects')} />
    }

    switch (basePage) {
      case 'dashboard': return <Dashboard user={user} />
      case 'inbox': return <Inbox user={user} />
      case 'launch': return <LaunchBoard onViewProject={(id) => navigate(`project/${id}`)} />
      case 'ongoing': return <OngoingBoard />
      case 'projects': return <Projects onViewProject={(id) => navigate(`project/${id}`)} />
      case 'tasks': return <Tasks />
      case 'workload': return <Workload />
      case 'reports': return <Reports />
      case 'settings': return <Settings user={user} isAdmin={user?.role === 'admin'} />
      default: return <Dashboard user={user} />
    }
  }

  // Figure out which sidebar item to highlight
  const sidebarRoute = basePage === 'project' ? 'projects' : basePage

  return (
    <>
      {isDemo && (
        <div style={{
          background: 'linear-gradient(90deg, var(--brand-600), var(--brand-700))',
          color: 'white', textAlign: 'center', padding: '8px 16px',
          fontSize: 13, fontWeight: 600, position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{ opacity: 0.9 }}>You're viewing the demo — data shown is sample only</span>
          <button onClick={handleSignOut} style={{
            background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Exit Demo
          </button>
        </div>
      )}
      <Layout currentRoute={sidebarRoute} onNavigate={navigate} user={user} onSignOut={handleSignOut}>
        {renderPage()}
      </Layout>
    </>
  )
}