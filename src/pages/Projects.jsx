import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateProjectModal from './CreateProjectModal.jsx'
import { exportCSV } from '../exportCSV.jsx'

export default function Projects({ onViewProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, users!projects_primary_owner_id_fkey(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = projects.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.lifecycle_type === filterStatus
    const matchesSearch = !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const counts = {
    total: projects.length,
    launch: projects.filter(p => p.lifecycle_type === 'PRE_LAUNCH').length,
    ongoing: projects.filter(p => p.lifecycle_type === 'POST_LAUNCH').length,
  }

  function getLifecycleBadge(type) {
    const map = {
      PRE_LAUNCH: { className: 'badge-launch', label: 'Launch' },
      POST_LAUNCH: { className: 'badge-ongoing', label: 'Ongoing' },
      ON_HOLD: { className: 'badge-on-hold', label: 'On Hold' },
      CLOSED: { className: 'badge-closed', label: 'Closed' },
    }
    const badge = map[type] || { className: 'badge-basic', label: type || 'Unknown' }
    return <span className={`badge ${badge.className}`}>{badge.label}</span>
  }

  function getTierBadge(tier) {
    const map = { lapetus: 'badge-basic', rhea: 'badge-pro', titan: 'badge-enterprise' }
    const cls = map[tier?.toLowerCase()] || 'badge-basic'
    return <span className={`badge ${cls}`}>{tier?.toUpperCase() || '—'}</span>
  }

  function getHealthDot(health) {
    const colors = { healthy: 'var(--success-500)', at_risk: 'var(--warning-500)', critical: 'var(--danger-500)' }
    return <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors[health] || 'var(--slate-300)', display: 'inline-block' }} />
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Master record — all client files</p>
        </div>
        <button className="btn btn-secondary" onClick={() => exportCSV('llg_projects', ['Client Name', 'Status', 'Package Tier', 'Primary Owner', 'Launch Date', 'Health', 'Monthly Revenue'], filtered.map(p => [p.name, p.lifecycle_type, p.package_tier, p.users?.full_name || '', p.target_launch_date || '', p.health, p.monthly_revenue || 0]))}>Export CSV</button>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Project
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card"><div className="stat-card-label">Total projects</div><div className="stat-card-value">{counts.total}</div></div>
        <div className="stat-card"><div className="stat-card-label">In launch phase</div><div className="stat-card-value" style={{ color: 'var(--info-600)' }}>{counts.launch}</div></div>
        <div className="stat-card"><div className="stat-card-label">In ongoing phase</div><div className="stat-card-value" style={{ color: 'var(--success-600)' }}>{counts.ongoing}</div></div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setShowCreateModal(true)}>
          <div className="stat-card-label">New deal handoff</div>
          <div className="stat-card-value" style={{ color: 'var(--brand-600)', fontSize: '16px' }}>Create Project</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '14px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input" style={{ maxWidth: '260px', fontSize: '13px', padding: '8px 12px' }} placeholder="Filter projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <select className="input select" style={{ maxWidth: '140px', fontSize: '13px', padding: '8px 12px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="PRE_LAUNCH">Launch</option>
            <option value="POST_LAUNCH">Ongoing</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading projects...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><h3>No projects found</h3><p>Create a project or adjust your filters.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Client Name</th><th>Status</th><th>Package Tier</th><th>Primary Owner</th><th>Launch Date</th><th>Health</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(project => (
                  <tr key={project.id} style={{ cursor: 'pointer' }} onClick={() => onViewProject && onViewProject(project.id)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {project.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '14px' }}>{project.name}</div>
                          {project.bilingual && <span className="badge badge-bilingual" style={{ marginTop: '2px' }}>Bilingual</span>}
                        </div>
                      </div>
                    </td>
                    <td>{getLifecycleBadge(project.lifecycle_type)}</td>
                    <td>{getTierBadge(project.package_tier)}</td>
                    <td style={{ fontSize: '13px' }}>{project.users?.full_name || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{project.target_launch_date ? new Date(project.target_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                    <td>{getHealthDot(project.health)}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onViewProject && onViewProject(project.id) }}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(proj) => {
          fetchProjects()
          if (onViewProject) onViewProject(proj.id)
        }}
      />
    </div>
  )
}