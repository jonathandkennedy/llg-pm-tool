import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const LAUNCH_COLUMNS = [
  { id: 'intake_admin', label: 'Intake / Admin', color: 'var(--slate-500)' },
  { id: 'setup_config', label: 'Setup & Config', color: 'var(--info-500)' },
  { id: 'design', label: 'Design', color: 'var(--brand-500)' },
  { id: 'development', label: 'Development', color: 'var(--tier-enterprise)' },
  { id: 'internal_qa', label: 'Internal QA', color: 'var(--warning-500)' },
  { id: 'client_review', label: 'Client Review', color: 'var(--success-500)' },
  { id: 'launch_scheduled', label: 'Launch Scheduled', color: 'var(--success-700)' },
]

export default function LaunchBoard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('board')

  useEffect(() => {
    fetchLaunchProjects()
  }, [])

  async function fetchLaunchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, users!projects_primary_owner_id_fkey(full_name)')
        .eq('lifecycle_type', 'PRE_LAUNCH')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching launch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  function getColumnProjects(columnId) {
    return projects.filter(p => p.launch_stage === columnId)
  }

  function getTierBadgeClass(tier) {
    const map = {
      enterprise: 'badge-enterprise',
      pro: 'badge-pro',
      premium: 'badge-premium',
      standard: 'badge-standard',
      basic: 'badge-basic',
    }
    return map[tier?.toLowerCase()] || 'badge-basic'
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Launch Board</h1>
          <p>Manage pre-live client onboarding and approvals</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>Board View</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List View</button>
          </div>
          <button className="btn btn-primary btn-sm">+ New Deal</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total in launch</div>
          <div className="stat-card-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Pending approval</div>
          <div className="stat-card-value" style={{ color: 'var(--warning-600)' }}>
            {projects.filter(p => p.launch_stage === 'client_review').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QA review</div>
          <div className="stat-card-value" style={{ color: 'var(--info-600)' }}>
            {projects.filter(p => p.launch_stage === 'internal_qa').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">New deal handoff</div>
          <div className="stat-card-value" style={{ cursor: 'pointer', color: 'var(--brand-600)' }}>Create Project</div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="empty-state">
          <p>Loading projects...</p>
        </div>
      ) : (
        <div className="kanban-board">
          {LAUNCH_COLUMNS.map(col => {
            const colProjects = getColumnProjects(col.id)
            return (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                    <span className="kanban-column-count">{colProjects.length}</span>
                  </div>
                  <button style={{ color: 'var(--slate-400)', fontSize: '16px' }}>···</button>
                </div>
                <div className="kanban-column-body">
                  {colProjects.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                      No projects
                    </div>
                  ) : (
                    colProjects.map(project => (
                      <div className="kanban-card" key={project.id}>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span className={`badge ${getTierBadgeClass(project.package_tier)}`}>
                            {project.package_tier?.toUpperCase() || 'STANDARD'}
                          </span>
                          {project.bilingual && <span className="badge badge-bilingual">Bilingual</span>}
                          {project.risk_level === 'high' && <span className="badge badge-risk">High Risk</span>}
                        </div>
                        <div className="kanban-card-title">{project.name}</div>
                        <div className="kanban-card-subtitle">
                          {project.users?.full_name || 'Unassigned'}
                        </div>
                        <div className="kanban-card-footer">
                          {project.target_launch_date && (
                            <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                              Target: {new Date(project.target_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
