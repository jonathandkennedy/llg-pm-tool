import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CreateTaskModal from './CreateTaskModal.jsx'

export default function Tasks({ onViewTask }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [showCreateTask, setShowCreateTask] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name, package_tier), users!tasks_assignee_id_fkey(full_name)')
        .order('due_date', { ascending: true })
        .limit(200)
      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterDept !== 'all' && t.department !== filterDept) return false
    return true
  })

  function isOverdue(d) { return d && new Date(d) < new Date() }

  function getPriorityBadge(priority) {
    const map = {
      high: { bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'P1 / High' },
      medium: { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'P2 / Med' },
      low: { bg: 'var(--slate-100)', color: 'var(--slate-600)', label: 'P3 / Low' },
    }
    const p = map[priority?.toLowerCase()] || map.medium
    return <span className="badge" style={{ background: p.bg, color: p.color }}>{p.label}</span>
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
      new_this_cycle: { bg: 'var(--slate-100)', color: 'var(--slate-600)' },
      scheduled: { bg: 'var(--success-50)', color: 'var(--success-600)' },
    }
    const s = colors[status] || { bg: 'var(--slate-100)', color: 'var(--slate-600)' }
    const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
    return <span className="badge" style={{ background: s.bg, color: s.color }}>{label}</span>
  }

  function getDeptColor(dept) {
    const map = { seo: '#5b21b6', dev: '#2563eb', design: '#ec4899', content: '#f59e0b', social: '#22c55e', ppc: '#ef4444', admin: '#64748b' }
    return map[dept] || '#64748b'
  }

  const departments = [...new Set(tasks.map(t => t.department).filter(Boolean))]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>All tasks across projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total tasks</div>
          <div className="stat-card-value">{tasks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">In progress</div>
          <div className="stat-card-value" style={{ color: 'var(--info-600)' }}>{tasks.filter(t => t.status === 'in_progress').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value" style={{ color: 'var(--success-600)' }}>{tasks.filter(t => t.status === 'complete').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value" style={{ color: 'var(--danger-600)' }}>{tasks.filter(t => isOverdue(t.due_date) && t.status !== 'complete' && !t.completed_at).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Awaiting QA</div>
          <div className="stat-card-value" style={{ color: 'var(--warning-600)' }}>{tasks.filter(t => t.qa_status === 'pending_qa').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input select" style={{ maxWidth: 140, fontSize: 13, padding: '7px 10px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input select" style={{ maxWidth: 160, fontSize: 13, padding: '7px 10px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading tasks...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><h3>No tasks found</h3><p>Adjust your filters or create a new task.</p></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Dept</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr
                    key={task.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewTask && onViewTask(task.id)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: 14, maxWidth: 280 }}>
                        {task.title}
                      </div>
                      {task.qa_status && task.qa_status !== 'not_required' && (
                        <span className="badge" style={{
                          marginTop: 2, fontSize: 10,
                          background: task.qa_status === 'approved' ? 'var(--success-50)' : task.qa_status === 'changes_needed' ? 'var(--danger-50)' : 'var(--warning-50)',
                          color: task.qa_status === 'approved' ? 'var(--success-600)' : task.qa_status === 'changes_needed' ? 'var(--danger-600)' : 'var(--warning-600)',
                        }}>
                          QA: {task.qa_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {task.projects?.name || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {task.users?.full_name ? (
                          <>
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: getDeptColor(task.department), color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                            }}>
                              {task.users.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={{ fontSize: 13 }}>{task.users.full_name}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--slate-400)' }}>Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {task.department && (
                        <span className="badge" style={{ background: `${getDeptColor(task.department)}12`, color: getDeptColor(task.department) }}>
                          {task.department}
                        </span>
                      )}
                    </td>
                    <td>
                      {task.due_date ? (
                        <span style={{
                          fontSize: 13,
                          color: isOverdue(task.due_date) && task.status !== 'complete' ? 'var(--danger-600)' : 'var(--slate-600)',
                          fontWeight: isOverdue(task.due_date) && task.status !== 'complete' ? 600 : 400,
                        }}>
                          {isOverdue(task.due_date) && task.status !== 'complete' ? '⚠ ' : ''}
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getStatusBadge(task.status)}</td>
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

      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onCreated={() => fetchTasks()}
      />
    </div>
  )
}