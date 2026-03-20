import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState({
    totalProjects: 0,
    inLaunch: 0,
    inOngoing: 0,
    monthlyRevenue: 0,
  })

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      // Total projects
      const { count: total } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      // In launch
      const { count: launch } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('lifecycle_type', 'PRE_LAUNCH')

      // In ongoing
      const { count: ongoing } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('lifecycle_type', 'POST_LAUNCH')

      // Monthly revenue (sum of active project revenues)
      const { data: revenueData } = await supabase
        .from('projects')
        .select('monthly_revenue')
        .in('lifecycle_type', ['PRE_LAUNCH', 'POST_LAUNCH'])

      const mrr = revenueData?.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0) || 0

      setStats({
        totalProjects: total || 0,
        inLaunch: launch || 0,
        inOngoing: ongoing || 0,
        monthlyRevenue: mrr,
      })
    } catch (err) {
      console.error('Dashboard stats error:', err)
    }
  }

  return (
    <div>
      {/* Welcome */}
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
       
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total projects</div>
          <div className="stat-card-value">{stats.totalProjects}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">In launch</div>
          <div className="stat-card-value" style={{ color: 'var(--info-600)' }}>{stats.inLaunch}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Ongoing</div>
          <div className="stat-card-value" style={{ color: 'var(--success-600)' }}>{stats.inOngoing}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Monthly revenue</div>
          <div className="stat-card-value">${stats.monthlyRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--slate-900)' }}>
        Quick actions
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <a href="#launch" className="card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none', transition: 'all 150ms ease' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            </svg>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-700)' }}>Launch Board</div>
        </a>
        <a href="#ongoing" className="card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-700)' }}>Ongoing Board</div>
        </a>
        <a href="#projects" className="card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--warning-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-700)' }}>All Projects</div>
        </a>
        <a href="#tasks" className="card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tier-enterprise)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--slate-700)' }}>My Tasks</div>
        </a>
      </div>
    </div>
  )
}
