import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ONGOING_COLUMNS = [
  { id: 'new_this_cycle', label: 'New This Cycle', color: 'var(--slate-500)' },
  { id: 'in_progress', label: 'In Progress', color: 'var(--info-500)' },
  { id: 'ready_for_qa', label: 'Ready for QA', color: 'var(--warning-500)' },
  { id: 'manager_review', label: 'Manager Review', color: 'var(--brand-500)' },
  { id: 'waiting_on_client', label: 'Waiting on Client', color: 'var(--danger-500)' },
  { id: 'scheduled', label: 'Scheduled / Publishing', color: 'var(--success-500)' },
  { id: 'complete', label: 'Complete This Cycle', color: 'var(--success-700)' },
]

export default function OngoingBoard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('board')
  const [filterDept, setFilterDept] = useState('all')

  useEffect(() => {
    fetchOngoingTasks()
  }, [])

  async function fetchOngoingTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name, package_tier)')
        .eq('board_context', 'ONGOING')
        .order('due_date', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (err) {
      console.error('Error fetching ongoing tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  function getColumnTasks(columnId) {
    let filtered = tasks.filter(t => t.status === columnId)
    if (filterDept !== 'all') {
      filtered = filtered.filter(t => t.department === filterDept)
    }
    return filtered
  }

  function isOverdue(dueDate) {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Ongoing Board</h1>
          <p>Manage post-live recurring work and maintenance</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={viewMode === 'board' ? 'active' : ''} onClick={() => setViewMode('board')}>Board</button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="input select"
          style={{ maxWidth: '180px', fontSize: '13px', padding: '7px 12px' }}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="seo">SEO</option>
          <option value="social">Social</option>
          <option value="ppc">PPC</option>
          <option value="design">Design</option>
          <option value="dev">Development</option>
          <option value="content">Content</option>
        </select>
        <select className="input select" style={{ maxWidth: '160px', fontSize: '13px', padding: '7px 12px' }}>
          <option>This Week</option>
          <option>This Month</option>
          <option>Next Week</option>
        </select>
        <select className="input select" style={{ maxWidth: '160px', fontSize: '13px', padding: '7px 12px' }}>
          <option>All Assignees</option>
        </select>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="empty-state"><p>Loading tasks...</p></div>
      ) : (
        <div className="kanban-board">
          {ONGOING_COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id)
            return (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                    <span className="kanban-column-count">{colTasks.length}</span>
                  </div>
                  <button style={{ color: 'var(--slate-400)', fontSize: '16px' }}>···</button>
                </div>
                <div className="kanban-column-body">
                  {colTasks.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                      No tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <div className="kanban-card" key={task.id}>
                        <div className="kanban-card-title">{task.title}</div>
                        <div className="kanban-card-subtitle">
                          {task.projects?.name || 'Unknown client'}
                          {task.department && (
                            <span style={{ marginLeft: '6px', padding: '1px 6px', background: 'var(--slate-100)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--slate-600)' }}>
                              {task.department}
                            </span>
                          )}
                        </div>
                        <div className="kanban-card-footer">
                          {task.due_date && (
                            <span style={{
                              fontSize: '12px',
                              color: isOverdue(task.due_date) ? 'var(--danger-600)' : 'var(--slate-500)',
                              fontWeight: isOverdue(task.due_date) ? 600 : 400,
                            }}>
                              {isOverdue(task.due_date) ? '⚠ ' : ''}
                              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {task.qa_status === 'pending' && (
                            <span className="badge" style={{ background: 'var(--warning-50)', color: 'var(--warning-600)' }}>
                              QA Pending
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
