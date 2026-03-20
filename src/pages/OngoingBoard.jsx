import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ONGOING_COLUMNS = [
  { id: 'new_this_cycle', label: 'New This Cycle', color: '#64748b' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'ready_for_qa', label: 'Ready for QA', color: '#f59e0b' },
  { id: 'manager_review', label: 'Manager Review', color: '#7c5aff' },
  { id: 'waiting_on_client', label: 'Waiting on Client', color: '#ef4444' },
  { id: 'scheduled', label: 'Scheduled', color: '#22c55e' },
  { id: 'complete', label: 'Complete', color: '#15803d' },
]

export default function OngoingBoard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('all')
  const [expandedCard, setExpandedCard] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name, package_tier, bilingual), users!tasks_assignee_id_fkey(full_name)')
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

  async function moveTask(taskId, newStatus) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : t.completed_at } : t
    ))

    const updateData = { status: newStatus }
    if (newStatus === 'complete') updateData.completed_at = new Date().toISOString()

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId)
    if (error) {
      console.error('Failed to move task:', error)
      fetchTasks()
    }
  }

  // Drag handlers
  function handleDragStart(e, task) {
    setDragItem(task)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.5'
  }

  function handleDragEnd(e) {
    e.target.style.opacity = '1'
    setDragItem(null)
    setDragOverCol(null)
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colId)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  function handleDrop(e, colId) {
    e.preventDefault()
    setDragOverCol(null)
    if (dragItem && dragItem.status !== colId) {
      moveTask(dragItem.id, colId)
    }
    setDragItem(null)
  }

  function getColumnTasks(colId) {
    let filtered = tasks.filter(t => t.status === colId)
    if (filterDept !== 'all') {
      filtered = filtered.filter(t => t.department === filterDept)
    }
    return filtered
  }

  function isOverdue(d) { return d && new Date(d) < new Date() }

  function getPriorityDot(priority) {
    const colors = { high: '#ef4444', medium: '#f59e0b', low: '#64748b' }
    return <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[priority] || '#64748b', display: 'inline-block' }} />
  }

  function getDeptColor(dept) {
    const map = { seo: '#5b21b6', dev: '#2563eb', design: '#ec4899', content: '#f59e0b', social: '#22c55e', ppc: '#ef4444', admin: '#64748b' }
    return map[dept] || '#64748b'
  }

  // Count totals for each column including escalated
  const escalatedTasks = tasks.filter(t => t.status === 'escalated')
  const allDepts = [...new Set(tasks.map(t => t.department).filter(Boolean))]

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Ongoing Board</h1>
          <p>Manage post-live recurring work and maintenance</p>
        </div>
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
          <div className="stat-card-label">Awaiting QA</div>
          <div className="stat-card-value" style={{ color: 'var(--warning-600)' }}>{tasks.filter(t => t.status === 'ready_for_qa').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Waiting on client</div>
          <div className="stat-card-value" style={{ color: 'var(--danger-600)' }}>{tasks.filter(t => t.status === 'waiting_on_client').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Escalated</div>
          <div className="stat-card-value" style={{ color: 'var(--danger-600)' }}>{escalatedTasks.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${filterDept === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterDept('all')}
        >All</button>
        {allDepts.map(dept => (
          <button
            key={dept}
            className={`btn btn-sm ${filterDept === dept ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterDept(dept)}
            style={filterDept === dept ? {} : { borderColor: getDeptColor(dept), color: getDeptColor(dept) }}
          >
            {dept.charAt(0).toUpperCase() + dept.slice(1)}
          </button>
        ))}
      </div>

      {/* Escalated bar */}
      {escalatedTasks.length > 0 && (
        <div style={{
          marginBottom: 16, padding: '12px 18px', borderRadius: 'var(--radius-lg)',
          background: 'var(--danger-50)', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger-600)' }}>
              {escalatedTasks.length} escalated task{escalatedTasks.length > 1 ? 's' : ''}:
            </span>
            {escalatedTasks.map((t, i) => (
              <span key={t.id} style={{ fontSize: 13, color: 'var(--danger-600)' }}>
                {i > 0 ? ', ' : ' '}{t.title} ({t.projects?.name})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="empty-state"><p>Loading tasks...</p></div>
      ) : (
        <div className="kanban-board">
          {ONGOING_COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.id)
            const isDragOver = dragOverCol === col.id

            return (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                    <span className="kanban-column-count">{colTasks.length}</span>
                  </div>
                </div>

                <div
                  className="kanban-column-body"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  style={{
                    borderColor: isDragOver ? 'var(--brand-400)' : undefined,
                    background: isDragOver ? 'var(--brand-50)' : undefined,
                    transition: 'all 150ms ease',
                    minHeight: 120,
                  }}
                >
                  {colTasks.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13, fontStyle: 'italic' }}>
                      {isDragOver ? 'Drop here' : 'No tasks'}
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setExpandedCard(expandedCard === task.id ? null : task.id)}
                        style={{ cursor: 'grab', position: 'relative' }}
                      >
                        {/* Title */}
                        <div className="kanban-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getPriorityDot(task.priority)}
                          {task.title}
                        </div>

                        {/* Client + dept */}
                        <div className="kanban-card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {task.projects?.name || '—'}
                          {task.department && (
                            <span style={{
                              padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: `${getDeptColor(task.department)}12`, color: getDeptColor(task.department),
                            }}>
                              {task.department}
                            </span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="kanban-card-footer" style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {task.due_date && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: isOverdue(task.due_date) && col.id !== 'complete' ? 'var(--danger-600)' : 'var(--slate-500)',
                              }}>
                                {isOverdue(task.due_date) && col.id !== 'complete' ? '⚠ ' : ''}
                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {task.logged_hours > 0 && (
                              <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>
                                {task.logged_hours}/{task.estimated_hours || '?'}h
                              </span>
                            )}
                          </div>
                          {task.users?.full_name && (
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', background: getDeptColor(task.department),
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700,
                            }}>
                              {task.users.full_name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                        </div>

                        {/* QA badge */}
                        {task.qa_status && task.qa_status !== 'not_required' && (
                          <div style={{ marginTop: 6 }}>
                            <span className="badge" style={{
                              background: task.qa_status === 'approved' ? 'var(--success-50)' : task.qa_status === 'pending_qa' ? 'var(--warning-50)' : 'var(--info-50)',
                              color: task.qa_status === 'approved' ? 'var(--success-600)' : task.qa_status === 'pending_qa' ? 'var(--warning-600)' : 'var(--info-600)',
                              fontSize: 10,
                            }}>
                              QA: {task.qa_status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {/* Expanded detail */}
                        {expandedCard === task.id && (
                          <div style={{
                            marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--slate-100)',
                            animation: 'fadeIn 0.15s ease',
                          }}>
                            {task.description && (
                              <div style={{ fontSize: 12, color: 'var(--slate-600)', marginBottom: 8, lineHeight: 1.5 }}>
                                {task.description}
                              </div>
                            )}

                            <div style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 4 }}>
                              Assignee: {task.users?.full_name || 'Unassigned'}
                              {task.estimated_hours && <> · Est: {task.estimated_hours}h</>}
                              {task.logged_hours > 0 && <> · Logged: {task.logged_hours}h</>}
                            </div>

                            {/* Quick move buttons */}
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 6, marginTop: 8 }}>Move to:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {ONGOING_COLUMNS.filter(c => c.id !== task.status).map(c => (
                                <button
                                  key={c.id}
                                  onClick={(e) => { e.stopPropagation(); moveTask(task.id, c.id); setExpandedCard(null) }}
                                  style={{
                                    padding: '3px 8px', borderRadius: 4, border: '1px solid var(--slate-200)',
                                    background: 'white', fontSize: 10, fontWeight: 600, color: c.color,
                                    cursor: 'pointer', transition: 'all 100ms ease',
                                  }}
                                  onMouseEnter={e => { e.target.style.background = c.color; e.target.style.color = 'white' }}
                                  onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.color = c.color }}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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