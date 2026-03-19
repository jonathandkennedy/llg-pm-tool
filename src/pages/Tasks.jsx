import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name, package_tier)')
        .order('due_date', { ascending: true })
        .limit(100)

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  function getPriorityBadge(priority) {
    const map = {
      high: { bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'P1 / High' },
      medium: { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'P2 / Med' },
      low: { bg: 'var(--slate-100)', color: 'var(--slate-600)', label: 'P3 / Low' },
    }
    const p = map[priority?.toLowerCase()] || map.low
    return (
      <span className="badge" style={{ background: p.bg, color: p.color }}>{p.label}</span>
    )
  }

  function getQaStatusBadge(status) {
    const map = {
      pending_qa: { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'Pending QA' },
      in_review: { bg: 'var(--info-50)', color: 'var(--info-600)', label: 'In Review' },
      changes_needed: { bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'Changes Needed' },
      approved: { bg: 'var(--success-50)', color: 'var(--success-600)', label: 'Approved' },
    }
    const s = map[status] || { bg: 'var(--slate-100)', color: 'var(--slate-500)', label: status || '—' }
    return (
      <span className="badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
    )
  }

  function getQaActions(task) {
    switch (task.qa_status) {
      case 'pending_qa':
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-sm" style={{ background: 'var(--success-500)', color: 'white', fontSize: '12px', padding: '4px 10px' }}>Approve</button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}>Request Changes</button>
          </div>
        )
      case 'in_review':
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-sm" style={{ background: 'var(--warning-500)', color: 'white', fontSize: '12px', padding: '4px 10px' }}>Escalate</button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}>View</button>
          </div>
        )
      default:
        return (
          <button className="btn btn-secondary btn-sm" style={{ fontSize: '12px', padding: '4px 10px' }}>View</button>
        )
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>All tasks across projects</p>
        </div>
        <button className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="input select" style={{ maxWidth: '160px' }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="all">All Projects</option>
        </select>
        <select className="input select" style={{ maxWidth: '140px' }}>
          <option>All Owners</option>
        </select>
        <select className="input select" style={{ maxWidth: '140px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading tasks...</p></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks yet</h3>
            <p>Tasks will appear here as projects are created and templates spawn work.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Project / Client</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>QA Status</th>
                  <th>QA Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '14px' }}>
                        {task.title}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{task.projects?.name || '—'}</div>
                      {task.projects?.package_tier && (
                        <span className={`badge badge-${task.projects.package_tier?.toLowerCase() || 'basic'}`} style={{ marginTop: '2px' }}>
                          {task.projects.package_tier?.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>
                      {task.due_date ? (
                        <span style={{
                          fontSize: '13px',
                          color: isOverdue(task.due_date) ? 'var(--danger-600)' : 'var(--slate-700)',
                          fontWeight: isOverdue(task.due_date) ? 600 : 400,
                        }}>
                          {isOverdue(task.due_date) && 'Overdue — '}
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getQaStatusBadge(task.qa_status)}</td>
                    <td>{getQaActions(task)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
