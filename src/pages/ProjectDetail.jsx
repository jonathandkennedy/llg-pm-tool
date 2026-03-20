import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateTaskModal from './CreateTaskModal.jsx'

export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateTask, setShowCreateTask] = useState(false)

  useEffect(() => {
    if (projectId) fetchAll()
  }, [projectId])

  async function fetchAll() {
    setLoading(true)
    try {
      // Project with package + owner
      const { data: proj } = await supabase
        .from('projects')
        .select('*, packages(name, monthly_price, tier, launch_total_pages, monthly_total_pages, included_services), users!projects_primary_owner_id_fkey(full_name, email, department)')
        .eq('id', projectId)
        .single()
      setProject(proj)

      // Tasks for this project
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, users!tasks_assignee_id_fkey(full_name)')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })
      setTasks(taskData || [])

      // Team members (portal-facing)
      if (proj?.client_id) {
        const { data: team } = await supabase
          .from('team_members')
          .select('*')
          .eq('client_id', proj.client_id)
          .order('sort_order')
        setTeamMembers(team || [])

        const { data: tix } = await supabase
          .from('tickets')
          .select('*')
          .eq('client_id', proj.client_id)
          .order('created_at', { ascending: false })
        setTickets(tix || [])
      }
    } catch (err) {
      console.error('Error loading project:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state"><p>Loading project...</p></div>
    )
  }

  if (!project) {
    return (
      <div className="empty-state">
        <h3>Project not found</h3>
        <button className="btn btn-secondary" onClick={onBack}>Back to Projects</button>
      </div>
    )
  }

  const pkg = project.packages
  const owner = project.users
  const completedTasks = tasks.filter(t => t.status === 'complete' || t.completed_at)
  const activeTasks = tasks.filter(t => t.status !== 'complete' && t.status !== 'cancelled' && !t.completed_at)
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at)
  const totalHoursLogged = tasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0)
  const totalHoursEstimated = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)

  function getLifecycleBadge(type) {
    const map = {
      PRE_LAUNCH: { cls: 'badge-launch', label: 'Launch' },
      POST_LAUNCH: { cls: 'badge-ongoing', label: 'Ongoing' },
      ON_HOLD: { cls: 'badge-on-hold', label: 'On Hold' },
      CLOSED: { cls: 'badge-closed', label: 'Closed' },
    }
    const b = map[type] || { cls: 'badge-basic', label: type }
    return <span className={`badge ${b.cls}`}>{b.label}</span>
  }

  function getTierBadge(tier) {
    const map = { lapetus: 'badge-basic', rhea: 'badge-pro', titan: 'badge-enterprise' }
    return <span className={`badge ${map[tier?.toLowerCase()] || 'badge-basic'}`}>{tier?.toUpperCase()}</span>
  }

  function getStatusBadge(status) {
    const colors = {
      complete: { bg: 'var(--success-50)', color: 'var(--success-600)' },
      in_progress: { bg: 'var(--info-50)', color: 'var(--info-600)' },
      ready_for_qa: { bg: 'var(--warning-50)', color: 'var(--warning-600)' },
      pending_qa: { bg: 'var(--warning-50)', color: 'var(--warning-600)' },
      manager_review: { bg: 'var(--brand-50)', color: 'var(--brand-600)' },
      waiting_on_client: { bg: 'var(--danger-50)', color: 'var(--danger-600)' },
      escalated: { bg: 'var(--danger-50)', color: 'var(--danger-600)' },
      blocked: { bg: 'var(--danger-50)', color: 'var(--danger-600)' },
    }
    const s = colors[status] || { bg: 'var(--slate-100)', color: 'var(--slate-600)' }
    const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{label}</span>
  }

  function isOverdue(d) { return d && new Date(d) < new Date() }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'team', label: 'Team' },
    { id: 'tickets', label: `Tickets (${tickets.length})` },
    { id: 'services', label: 'Services' },
  ]

  return (
    <div>
      {/* Back + header */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          color: 'var(--slate-500)', cursor: 'pointer', padding: '6px 0', background: 'none', border: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to Projects
        </button>
      </div>

      {/* Project header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.health === 'healthy' ? 'var(--success-500)' : project.health === 'at_risk' ? 'var(--warning-500)' : 'var(--danger-500)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em' }}>{project.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {getLifecycleBadge(project.lifecycle_type)}
            {getTierBadge(project.package_tier)}
            {project.bilingual && <span className="badge badge-bilingual">Bilingual</span>}
            {project.risk_level === 'high' && <span className="badge badge-risk">High Risk</span>}
            {project.has_gravity_addon && <span className="badge" style={{ background: '#f3f0ff', color: '#5b21b6' }}>+ Gravity Pack</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 6 }}>
            Started {project.started_at ? new Date(project.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            {project.domain_url && <> · <a href={project.domain_url} target="_blank" rel="noopener" style={{ color: 'var(--brand-600)' }}>{project.domain_url.replace('https://', '')}</a></>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">Share</button>
          <button className="btn btn-primary btn-sm">Edit Project</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Monthly revenue</div>
          <div className="stat-card-value" style={{ fontSize: 22 }}>${(project.monthly_revenue || 0).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{pkg?.name || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Active tasks</div>
          <div className="stat-card-value" style={{ fontSize: 22, color: 'var(--info-600)' }}>{activeTasks.length}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{overdueTasks.length} overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value" style={{ fontSize: 22, color: 'var(--success-600)' }}>{completedTasks.length}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {tasks.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Hours logged</div>
          <div className="stat-card-value" style={{ fontSize: 22 }}>{totalHoursLogged.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {totalHoursEstimated.toFixed(0)} estimated</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">{project.lifecycle_type === 'PRE_LAUNCH' ? 'Target launch' : 'Live since'}</div>
          <div className="stat-card-value" style={{ fontSize: 16 }}>
            {project.lifecycle_type === 'PRE_LAUNCH'
              ? (project.target_launch_date ? new Date(project.target_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—')
              : (project.go_live_date ? new Date(project.go_live_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
            }
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>
            Owner: {owner?.full_name || '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--slate-200)', marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--brand-600)' : 'var(--slate-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Left column */}
          <div>
            {/* Project Summary */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Project summary</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Client name</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{project.client_name || project.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Package</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{pkg?.name || '—'} — ${(pkg?.monthly_price || 0).toLocaleString()}/mo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Primary owner</div>
                    <div style={{ fontSize: 14 }}>{owner?.full_name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Board</div>
                    <div style={{ fontSize: 14 }}>{project.current_board === 'LAUNCH' ? 'Launch Board' : 'Ongoing Board'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Domain</div>
                    <div style={{ fontSize: 14 }}>{project.domain_url || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Slack channel</div>
                    <div style={{ fontSize: 14 }}>{project.slack_channel_name || '—'}</div>
                  </div>
                </div>
                {project.notes && (
                  <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-50)', borderRadius: 8, fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6 }}>
                    {project.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Recent tasks */}
            <div className="card">
              <div className="card-header">
                <h3>Recent tasks</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('tasks')}>View all</button>
              </div>
              <div>
                {activeTasks.slice(0, 5).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--slate-100)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
                        {task.users?.full_name || 'Unassigned'} · {task.department || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {task.due_date && (
                        <span style={{ fontSize: 12, color: isOverdue(task.due_date) ? 'var(--danger-600)' : 'var(--slate-500)', fontWeight: isOverdue(task.due_date) ? 600 : 400 }}>
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                ))}
                {activeTasks.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>No active tasks</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Quick links */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Quick links</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.slack_channel_name && (
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', textDecoration: 'none' }}>
                    <span style={{ fontSize: 16 }}>#</span> {project.slack_channel_name}
                  </a>
                )}
                {project.domain_url && (
                  <a href={project.domain_url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', textDecoration: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    {project.domain_url.replace('https://', '')}
                  </a>
                )}
                <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Google Drive Folder
                </a>
              </div>
            </div>

            {/* Team assigned */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Assigned team</h3></div>
              <div className="card-body">
                {teamMembers.length > 0 ? teamMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--slate-50)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color || 'var(--brand-100)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {m.name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{m.role}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No team assigned yet</div>
                )}
              </div>
            </div>

            {/* Tickets */}
            <div className="card">
              <div className="card-header"><h3>Recent tickets</h3></div>
              <div className="card-body">
                {tickets.slice(0, 3).map(t => (
                  <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--slate-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)' }}>{t.title}</div>
                      <span className="badge" style={{
                        background: t.status === 'open' ? 'var(--warning-50)' : 'var(--success-50)',
                        color: t.status === 'open' ? 'var(--warning-600)' : 'var(--success-600)',
                      }}>{t.status}</span>
                    </div>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No tickets</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasks Tab ── */}
      {activeTab === 'tasks' && (
        <div className="card">
          <div className="card-header">
            <h3>All tasks ({tasks.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>+ Add Task</button>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state"><p>No tasks for this project yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Assignee</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 600, color: 'var(--slate-900)', maxWidth: 300 }}>{task.title}</td>
                      <td style={{ fontSize: 13 }}>{task.users?.full_name || '—'}</td>
                      <td><span className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{task.department || '—'}</span></td>
                      <td>{getStatusBadge(task.status)}</td>
                      <td style={{ fontSize: 13, color: isOverdue(task.due_date) && !task.completed_at ? 'var(--danger-600)' : 'var(--slate-600)', fontWeight: isOverdue(task.due_date) && !task.completed_at ? 600 : 400 }}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--slate-600)' }}>
                        {task.logged_hours || 0}/{task.estimated_hours || 0}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Team Tab ── */}
      {activeTab === 'team' && (
        <div>
          {teamMembers.length === 0 ? (
            <div className="card"><div className="empty-state"><h3>No team assigned</h3><p>Assign team members from the Settings page.</p></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {teamMembers.map(m => (
                <div className="card" key={m.id} style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: m.color || 'var(--brand-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                      {m.name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>{m.name}</div>
                      <span className="badge" style={{ background: `${m.color}18`, color: m.color }}>{m.role}</span>
                    </div>
                  </div>
                  {m.specialty && <div style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: 14 }}>{m.specialty}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}>
                    <span style={{ fontSize: 12, color: m.status === 'available' ? 'var(--success-600)' : 'var(--warning-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.status === 'available' ? 'var(--success-500)' : 'var(--warning-500)' }} />
                      {m.status === 'available' ? 'Available' : 'Busy'}
                    </span>
                    {m.email && (
                      <a href={`mailto:${m.email}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-600)', textDecoration: 'none' }}>Email</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {activeTab === 'tickets' && (
        <div className="card">
          <div className="card-header">
            <h3>Support tickets ({tickets.length})</h3>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state"><p>No tickets for this client.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Title</th><th>Status</th><th>Assigned to</th><th>Created</th></tr></thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>
                        <span className="badge" style={{
                          background: t.status === 'open' ? 'var(--warning-50)' : t.status === 'in_progress' ? 'var(--info-50)' : 'var(--success-50)',
                          color: t.status === 'open' ? 'var(--warning-600)' : t.status === 'in_progress' ? 'var(--info-600)' : 'var(--success-600)',
                        }}>{t.status}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{t.assigned_to || '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                        {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Services Tab ── */}
      {activeTab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><h3>Package details</h3></div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--slate-900)' }}>{pkg?.name || '—'}</div>
                <div style={{ fontSize: 14, color: 'var(--slate-500)', marginTop: 4 }}>${(pkg?.monthly_price || 0).toLocaleString()}/month</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 14, background: 'var(--slate-50)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>Launch pages</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{pkg?.launch_total_pages || '—'}</div>
                </div>
                <div style={{ padding: 14, background: 'var(--slate-50)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>Monthly pages</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{pkg?.monthly_total_pages || '—'}</div>
                </div>
              </div>
              {project.has_gravity_addon && (
                <div style={{ marginTop: 16, padding: 14, background: '#f3f0ff', borderRadius: 8, border: '1px solid #e9e2ff' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#5b21b6', marginBottom: 4 }}>+ Gravity Pack Add-on</div>
                  <div style={{ fontSize: 13, color: '#7c3aed' }}>$1,999/mo (free first 90 days) · GMB, Citations, Directories, LSA</div>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Included services</h3></div>
            <div className="card-body">
              {pkg?.included_services && Array.isArray(pkg.included_services) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {pkg.included_services.map((s, i) => (
                    <span key={i} style={{ padding: '6px 14px', background: 'var(--slate-50)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No services listed</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId}
        boardContext={project?.current_board === 'ONGOING' ? 'ONGOING' : 'LAUNCH'}
        onCreated={() => fetchAll()}
      />
    </div>
  )
}