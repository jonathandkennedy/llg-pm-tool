import { useAuth } from './hooks/useAuth.jsx'
import { useHashRoute } from './hooks/useHashRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LaunchBoard from './pages/LaunchBoard.jsx'
import OngoingBoard from './pages/OngoingBoard.jsx'
import Projects from './pages/Projects.jsx'
import Tasks from './pages/Tasks.jsx'
import Workload from './pages/Workload.jsx'
import Reports from './pages/Reports.jsx'
import Inbox from './pages/Inbox.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const { session, user, userRole, loading, signInWithEmail, signOut, isAdmin, isManager } = useAuth()
  const { route, navigate } = useHashRoute('dashboard')

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--slate-50)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, background: 'var(--brand-600)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 18, margin: '0 auto 16px',
          }}>
            LL
          </div>
          <div style={{ color: 'var(--slate-500)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Not logged in — show login
  if (!session) {
    return <Login onSignIn={signInWithEmail} />
  }

  // Render the correct page
  function renderPage() {
    switch (route) {
      case 'dashboard':
        return <Dashboard user={user} />
      case 'inbox':
        return <Inbox user={user} />
      case 'launch':
        return <LaunchBoard />
      case 'ongoing':
        return <OngoingBoard />
      case 'projects':
        return <Projects />
      case 'tasks':
        return <Tasks />
      case 'workload':
        return <Workload />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings user={user} isAdmin={isAdmin} />
      default:
        return <Dashboard user={user} />
    }
  }

  return (
    <Layout
      currentRoute={route}
      onNavigate={navigate}
      user={user}
      onSignOut={signOut}
    >
      {renderPage()}
    </Layout>
  )
}
