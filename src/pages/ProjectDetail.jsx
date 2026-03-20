import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateTaskModal from './CreateTaskModal.jsx'
import EditProjectModal from './EditProjectModal.jsx'
import GanttChart from './GanttChart.jsx'

export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [tickets, setTickets] = useState([])
  const [approvals, setApprovals] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)

  useEffect(() => { if (projectId) fetchAll() }, [projectId])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data: proj } = await supabase.from('projects')
        .select('*, packages(name, monthly_price, tier, launch_total_pages, monthly_total_pages, included_services), users!projects_primary_owner_id_fkey(full_name, email, department)')
        .eq('id', projectId).single()
      setProject(proj)

      const { data: taskData } = await supabase.from('tasks')
        .select('*, users!tasks_assignee_id_fkey(full_name)')
        .eq('project_id', projectId).order('due_date', { ascending: true })
      setTasks(taskData || [])

      if (proj?.client_id) {
        const [teamRes, tixRes, appRes] = await Promise.all([
          supabase.from('team_members').select('*').eq('client_id', proj.client_id).order('sort_order'),
          supabase.from('tickets').select('*').eq('client_id', proj.client_id).order('created_at', { ascending: false }),
          supabase.from('approvals').select('*').eq('client_id', proj.client_id).order('created_at', { ascending: false }),
        ])
        setTeamMembers(teamRes.data || [])
        setTickets(tixRes.data || [])
        setApprovals(appRes.data || [])
      }

      // Activity log for timeline
      const { data: logs } = await supabase.from('activity_log')
        .select('*').eq('entity_id', projectId).order('created_at', { ascending: false }).limit(30)
      setActivityLog(logs || [])
    } catch (err) { console.error('Error loading project:', err) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="empty-state"><p>Loading project...</p></div>
  if (!project) return <div className="empty-state"><h3>Project not found</h3><button className="btn btn-secondary" onClick={onBack}>Back</button></div>

  const pkg = project.packages
  const owner = project.users
  const completedTasks = tasks.filter(t => t.status === 'complete' || t.completed_at)
  const activeTasks = tasks.filter(t => t.status !== 'complete' && t.status !== 'cancelled' && !t.completed_at)
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at)
  const totalLogged = tasks.reduce((s, t) => s + (t.logged_hours || 0), 0)
  const totalEstimated = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)

  function isOverdue(d) { return d && new Date(d) < new Date() }
  function getStatusBadge(status) {
    const c = { complete: { bg: 'var(--success-50)', c: 'var(--success-600)' }, in_progress: { bg: 'var(--info-50)', c: 'var(--info-600)' }, ready_for_qa: { bg: 'var(--warning-50)', c: 'var(--warning-600)' }, manager_review: { bg: 'var(--brand-50)', c: 'var(--brand-600)' }, waiting_on_client: { bg: 'var(--danger-50)', c: 'var(--danger-600)' }, escalated: { bg: 'var(--danger-50)', c: 'var(--danger-600)' } }
    const s = c[status] || { bg: 'var(--slate-100)', c: 'var(--slate-600)' }
    return <span className="badge" style={{ background: s.bg, color: s.c }}>{status?.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) || '—'}</span>
  }
  function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
    { id: 'approvals', label: `Approvals (${approvals.length})` },
    { id: 'team', label: 'Team' },
    { id: 'tickets', label: `Tickets (${tickets.length})` },
    { id: 'timeline', label: 'Timeline' },
    { id: 'files', label: 'Files' },
    { id: 'services', label: 'Services' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', cursor: 'pointer', padding: '6px 0', background: 'none', border: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to Projects
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: project.health === 'healthy' ? 'var(--success-500)' : project.health === 'at_risk' ? 'var(--warning-500)' : 'var(--danger-500)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--slate-900)' }}>{project.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge badge-${project.lifecycle_type === 'PRE_LAUNCH' ? 'launch' : project.lifecycle_type === 'POST_LAUNCH' ? 'ongoing' : 'on-hold'}`}>
              {project.lifecycle_type === 'PRE_LAUNCH' ? 'Launch' : project.lifecycle_type === 'POST_LAUNCH' ? 'Ongoing' : project.lifecycle_type?.replace(/_/g, ' ')}
            </span>
            <span className={`badge ${project.package_tier === 'titan' ? 'badge-enterprise' : project.package_tier === 'rhea' ? 'badge-pro' : 'badge-basic'}`}>{project.package_tier?.toUpperCase()}</span>
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowEditProject(true)}>Edit Project</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-card-label">Monthly revenue</div><div className="stat-card-value" style={{ fontSize: 22 }}>${(project.monthly_revenue || 0).toLocaleString()}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{pkg?.name || '—'}</div></div>
        <div className="stat-card"><div className="stat-card-label">Active tasks</div><div className="stat-card-value" style={{ fontSize: 22, color: 'var(--info-600)' }}>{activeTasks.length}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{overdueTasks.length} overdue</div></div>
        <div className="stat-card"><div className="stat-card-label">Completed</div><div className="stat-card-value" style={{ fontSize: 22, color: 'var(--success-600)' }}>{completedTasks.length}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {tasks.length} total</div></div>
        <div className="stat-card"><div className="stat-card-label">Hours logged</div><div className="stat-card-value" style={{ fontSize: 22 }}>{totalLogged.toFixed(0)}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {totalEstimated.toFixed(0)} est.</div></div>
        <div className="stat-card"><div className="stat-card-label">{project.lifecycle_type === 'PRE_LAUNCH' ? 'Target launch' : 'Live since'}</div><div className="stat-card-value" style={{ fontSize: 16 }}>{project.lifecycle_type === 'PRE_LAUNCH' ? (project.target_launch_date ? new Date(project.target_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—') : (project.go_live_date ? new Date(project.go_live_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>Owner: {owner?.full_name || '—'}</div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--slate-200)', marginBottom: 20, overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            color: activeTab === tab.id ? 'var(--brand-600)' : 'var(--slate-500)',
            borderBottom: activeTab === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent', marginBottom: '-1px',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Project summary</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Client</div><div style={{ fontSize: 14, fontWeight: 600 }}>{project.client_name || project.name}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Package</div><div style={{ fontSize: 14, fontWeight: 600 }}>{pkg?.name || '—'} — ${(pkg?.monthly_price || 0).toLocaleString()}/mo</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Owner</div><div style={{ fontSize: 14 }}>{owner?.full_name || '—'}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Board</div><div style={{ fontSize: 14 }}>{project.current_board === 'LAUNCH' ? 'Launch Board' : 'Ongoing Board'}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Domain</div><div style={{ fontSize: 14 }}>{project.domain_url || '—'}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 4 }}>Slack</div><div style={{ fontSize: 14 }}>{project.slack_channel_name || '—'}</div></div>
                </div>
                {project.notes && <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-50)', borderRadius: 8, fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6 }}>{project.notes}</div>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Recent tasks</h3><button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('tasks')}>View all</button></div>
              <div>
                {activeTasks.slice(0, 5).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--slate-100)' }}>
                    <div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{task.title}</div><div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>{task.users?.full_name || 'Unassigned'} · {task.department || '—'}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {task.due_date && <span style={{ fontSize: 12, color: isOverdue(task.due_date) ? 'var(--danger-600)' : 'var(--slate-500)', fontWeight: isOverdue(task.due_date) ? 600 : 400 }}>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>
                ))}
                {activeTasks.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>No active tasks</div>}
              </div>
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}><div className="card-header"><h3>Quick links</h3></div><div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {project.slack_channel_name && <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}><span style={{ fontSize: 16 }}>#</span>{project.slack_channel_name}</a>}
              {project.domain_url && <a href={project.domain_url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>🌐 {project.domain_url.replace('https://', '')}</a>}
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--slate-50)', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>📁 Google Drive Folder</a>
            </div></div>
            <div className="card" style={{ marginBottom: 16 }}><div className="card-header"><h3>Assigned team</h3></div><div className="card-body">
              {teamMembers.length > 0 ? teamMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--slate-50)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color || 'var(--brand-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{m.name?.split(' ').map(n => n[0]).join('')}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 11, color: 'var(--slate-500)' }}>{m.role}</div></div>
                </div>
              )) : <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No team assigned</div>}
            </div></div>
            {approvals.filter(a => a.status === 'pending').length > 0 && (
              <div className="card" style={{ border: '1.5px solid var(--warning-200)', background: 'var(--warning-50)' }}><div className="card-body">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning-700)', marginBottom: 8 }}>⏳ {approvals.filter(a => a.status === 'pending').length} pending approval{approvals.filter(a => a.status === 'pending').length > 1 ? 's' : ''}</div>
                {approvals.filter(a => a.status === 'pending').slice(0, 2).map(a => (
                  <div key={a.id} style={{ fontSize: 13, color: 'var(--warning-700)', marginBottom: 4 }}>• {a.title}</div>
                ))}
                <button className="btn btn-sm" style={{ marginTop: 8, background: 'var(--warning-600)', color: 'white' }} onClick={() => setActiveTab('approvals')}>View approvals</button>
              </div></div>
            )}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {activeTab === 'tasks' && (
        <div className="card">
          <div className="card-header"><h3>All tasks ({tasks.length})</h3><button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>+ Add Task</button></div>
          {tasks.length === 0 ? <div className="empty-state"><p>No tasks yet.</p></div> : (
            <div className="table-wrapper"><table className="table"><thead><tr><th>Task</th><th>Assignee</th><th>Dept</th><th>Status</th><th>Due</th><th>Hours</th></tr></thead><tbody>
              {tasks.map(t => (
                <tr key={t.id}><td style={{ fontWeight: 600, color: 'var(--slate-900)', maxWidth: 300 }}>{t.title}</td><td style={{ fontSize: 13 }}>{t.users?.full_name || '—'}</td><td><span className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>{t.department || '—'}</span></td><td>{getStatusBadge(t.status)}</td>
                <td style={{ fontSize: 13, color: isOverdue(t.due_date) && !t.completed_at ? 'var(--danger-600)' : 'var(--slate-600)', fontWeight: isOverdue(t.due_date) && !t.completed_at ? 600 : 400 }}>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                <td style={{ fontSize: 13 }}>{t.logged_hours || 0}/{t.estimated_hours || 0}h</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === 'approvals' && (
        <div>
          {/* Pending */}
          {approvals.filter(a => a.status === 'pending').length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 12 }}>Pending approval ({approvals.filter(a => a.status === 'pending').length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {approvals.filter(a => a.status === 'pending').map(a => (
                  <div key={a.id} className="card" style={{ padding: 20, border: '1.5px solid var(--warning-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="badge" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}>Pending</span>
                      <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{a.category?.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 6 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 12 }}>
                      Submitted by {a.submitted_by || '—'}
                      {a.due_date && <> · Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                    </div>
                    {a.preview_url && <a href={a.preview_url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginBottom: 10, display: 'inline-block' }}>Preview</a>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" style={{ background: 'var(--success-500)', color: 'white', flex: 1 }}
                        onClick={async () => { await supabase.from('approvals').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', a.id); fetchAll() }}>
                        Approve
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--danger-500)', color: 'white', flex: 1 }}
                        onClick={async () => { await supabase.from('approvals').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', a.id); fetchAll() }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* History */}
          <div className="card">
            <div className="card-header"><h3>Approval history</h3></div>
            {approvals.filter(a => a.status !== 'pending').length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>No past approvals</div>
            ) : (
              <div className="table-wrapper"><table className="table"><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Submitted by</th><th>Reviewed</th></tr></thead><tbody>
                {approvals.filter(a => a.status !== 'pending').map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td style={{ fontSize: 13 }}>{a.category?.replace(/_/g, ' ') || '—'}</td>
                    <td><span className="badge" style={{ background: a.status === 'approved' ? 'var(--success-50)' : 'var(--danger-50)', color: a.status === 'approved' ? 'var(--success-600)' : 'var(--danger-600)' }}>{a.status}</span></td>
                    <td style={{ fontSize: 13 }}>{a.submitted_by || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--slate-500)' }}>{a.reviewed_at ? timeAgo(a.reviewed_at) : '—'}</td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {activeTab === 'team' && (
        teamMembers.length === 0 ? <div className="card"><div className="empty-state"><h3>No team assigned</h3></div></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {teamMembers.map(m => (
              <div className="card" key={m.id} style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: m.color || 'var(--brand-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{m.name?.split(' ').map(n => n[0]).join('')}</div>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</div><span className="badge" style={{ background: `${m.color}18`, color: m.color }}>{m.role}</span></div>
                </div>
                {m.specialty && <div style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: 14 }}>{m.specialty}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}>
                  <span style={{ fontSize: 12, color: m.status === 'available' ? 'var(--success-600)' : 'var(--warning-600)', fontWeight: 600 }}>{m.status === 'available' ? '● Available' : '● Busy'}</span>
                  {m.email && <a href={`mailto:${m.email}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-600)' }}>Email</a>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TICKETS TAB ── */}
      {activeTab === 'tickets' && (
        <div className="card">
          <div className="card-header"><h3>Support tickets ({tickets.length})</h3></div>
          {tickets.length === 0 ? <div className="empty-state"><p>No tickets</p></div> : (
            <div className="table-wrapper"><table className="table"><thead><tr><th>Title</th><th>Status</th><th>Assigned</th><th>Created</th></tr></thead><tbody>
              {tickets.map(t => (
                <tr key={t.id}><td style={{ fontWeight: 600 }}>{t.title}</td>
                <td><span className="badge" style={{ background: t.status === 'open' ? 'var(--warning-50)' : 'var(--success-50)', color: t.status === 'open' ? 'var(--warning-600)' : 'var(--success-600)' }}>{t.status}</span></td>
                <td style={{ fontSize: 13 }}>{t.assigned_to || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--slate-500)' }}>{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === 'timeline' && (
        <div>
          {/* Gantt Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3>Gantt chart</h3></div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              {tasks.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>No tasks to display — add tasks to see the Gantt chart</div>
              ) : (
                <GanttChart tasks={tasks} onTaskClick={(id) => { /* could navigate to task detail */ }} />
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="card">
            <div className="card-header"><h3>Milestones</h3></div>
            <div className="card-body">
              <div style={{ position: 'relative', paddingLeft: 30 }}>
                <div style={{ position: 'absolute', left: 11, top: 6, bottom: 6, width: 2, background: 'var(--slate-200)' }} />
                <TimelineItem color="var(--brand-500)" title="Project created" date={project.created_at} detail={`${pkg?.name || 'Package'} — Owner: ${owner?.full_name || '—'}`} />
                {project.started_at && <TimelineItem color="var(--info-500)" title="Work started" date={project.started_at} detail={`${project.bilingual ? 'Bilingual ' : ''}${project.has_gravity_addon ? '+ Gravity Pack' : ''}`} />}
                {completedTasks.slice(0, 5).map(t => (
                  <TimelineItem key={t.id} color="var(--success-500)" title={`Completed: ${t.title}`} date={t.completed_at || t.updated_at} detail={`${t.users?.full_name || 'Team'} · ${t.logged_hours || 0}h`} />
                ))}
                {project.go_live_date && <TimelineItem color="var(--success-700)" title="🚀 Went live" date={project.go_live_date} detail={project.domain_url || ''} />}
                {project.target_launch_date && !project.go_live_date && <TimelineItem color="var(--slate-400)" title="Target launch" date={project.target_launch_date} detail="Upcoming" dashed />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FILES TAB ── */}
      {activeTab === 'files' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Project files</h3>
              <button className="btn btn-secondary btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload
              </button>
            </div>
            <div className="card-body">
              {project.google_drive_folder_id ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ marginBottom: 12 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--brand-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 4 }}>Google Drive connected</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>Folder ID: {project.google_drive_folder_id}</div>
                  <a href={`https://drive.google.com/drive/folders/${project.google_drive_folder_id}`} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
                    Open in Google Drive
                  </a>
                </div>
              ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ marginBottom: 12 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>No files folder linked</div>
                  <div style={{ fontSize: 13, color: 'var(--slate-500)', marginBottom: 16 }}>Connect a Google Drive folder to manage client assets, reports, and contracts.</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowEditProject(true)}>
                    Link Drive Folder
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Suggested folder structure */}
          <div className="card">
            <div className="card-header"><h3>Recommended folder structure</h3></div>
            <div className="card-body">
              <div style={{ fontSize: 13, color: 'var(--slate-600)', lineHeight: 2 }}>
                <div>📁 <strong>{project.name}</strong></div>
                <div style={{ paddingLeft: 20 }}>📁 Assets — Logos, headshots, brand files</div>
                <div style={{ paddingLeft: 20 }}>📁 Content — Blog posts, SEO pages, press releases</div>
                <div style={{ paddingLeft: 20 }}>📁 Design — Figma exports, mockups, revisions</div>
                <div style={{ paddingLeft: 20 }}>📁 Reports — Monthly SEO reports, analytics</div>
                <div style={{ paddingLeft: 20 }}>📁 Contracts — Signed agreements, proposals</div>
                <div style={{ paddingLeft: 20 }}>📁 Videos — YouTube content, thumbnails</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICES TAB ── */}
      {activeTab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header"><h3>Package details</h3></div>
            <div className="card-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{pkg?.name || '—'}</div>
                <div style={{ fontSize: 14, color: 'var(--slate-500)', marginTop: 4 }}>${(pkg?.monthly_price || 0).toLocaleString()}/month</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 14, background: 'var(--slate-50)', borderRadius: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>Launch pages</div><div style={{ fontSize: 20, fontWeight: 700 }}>{pkg?.launch_total_pages || '—'}</div></div>
                <div style={{ padding: 14, background: 'var(--slate-50)', borderRadius: 8 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: 4 }}>Monthly pages</div><div style={{ fontSize: 20, fontWeight: 700 }}>{pkg?.monthly_total_pages || '—'}</div></div>
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
                    <span key={i} style={{ padding: '6px 14px', background: 'var(--slate-50)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}>{s}</span>
                  ))}
                </div>
              ) : <div style={{ fontSize: 13, color: 'var(--slate-400)' }}>No services listed</div>}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal open={showCreateTask} onClose={() => setShowCreateTask(false)} projectId={projectId} boardContext={project?.current_board === 'ONGOING' ? 'ONGOING' : 'LAUNCH'} onCreated={() => fetchAll()} />
      <EditProjectModal open={showEditProject} onClose={() => setShowEditProject(false)} project={project} onSaved={() => fetchAll()} />
    </div>
  )
}

// Timeline item component
function TimelineItem({ color, title, date, detail, dashed }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, position: 'relative' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, zIndex: 1,
        background: 'white', border: `3px solid ${color}`,
        borderStyle: dashed ? 'dashed' : 'solid',
      }} />
      <div style={{ paddingTop: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 2 }}>
          {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          {detail && <> · {detail}</>}
        </div>
      </div>
    </div>
  )
}