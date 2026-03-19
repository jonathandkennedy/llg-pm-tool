const pageTitles = {
  dashboard: { title: 'Dashboard', subtitle: "Here's what's happening today" },
  inbox: { title: 'Inbox', subtitle: 'Notifications and updates' },
  launch: { title: 'Launch Board', subtitle: 'Manage pre-live client onboarding and approvals' },
  ongoing: { title: 'Ongoing Board', subtitle: 'Manage post-live recurring work and maintenance' },
  projects: { title: 'Projects', subtitle: 'Master Record' },
  tasks: { title: 'Tasks', subtitle: 'All tasks across projects' },
  workload: { title: 'Workload', subtitle: 'Monitor team capacity and allocations' },
  reports: { title: 'Reports', subtitle: 'Revenue, performance, and operations' },
  settings: { title: 'Settings', subtitle: 'Manage users, roles, and configuration' },
}

export default function TopBar({ currentRoute, onMenuToggle, user, onSignOut }) {
  const page = pageTitles[currentRoute] || { title: 'LegalLeads', subtitle: '' }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div>
          <div className="topbar-title">{page.title}</div>
          {page.subtitle && <div className="topbar-subtitle">{page.subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">
        {/* Search */}
        <button className="topbar-icon-btn" aria-label="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Notifications */}
        <button className="topbar-icon-btn" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="dot" />
        </button>

        {/* User */}
        <div className="topbar-user-avatar" onClick={onSignOut} title="Sign out">
          {initials}
        </div>
      </div>
    </header>
  )
}
