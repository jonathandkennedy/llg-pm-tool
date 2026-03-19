import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import TopBar from './TopBar.jsx'

export default function Layout({ currentRoute, onNavigate, user, onSignOut, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — gets 'open' class on mobile */}
      <div className={sidebarOpen ? 'sidebar-mobile-open' : ''}>
        <Sidebar
          currentRoute={currentRoute}
          onNavigate={(route) => {
            onNavigate(route)
            setSidebarOpen(false)
          }}
          user={user}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="main-area">
        <TopBar
          currentRoute={currentRoute}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          user={user}
          onSignOut={onSignOut}
        />
        <div className="page-content fade-in" key={currentRoute}>
          {children}
        </div>
      </div>

      {/* Mobile sidebar open state override */}
      <style>{`
        .sidebar-mobile-open .sidebar {
          transform: translateX(0) !important;
        }
      `}</style>
    </div>
  )
}
