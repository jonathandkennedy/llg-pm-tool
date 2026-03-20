import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TaskDetail({ taskId, onBack }) {
  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('comments')

  // Comment form
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Time log form
  const [timeForm, setTimeForm] = useState({ hours: '', date: new Date().toISOString().split('T')[0], notes: '' })
  const [loggingTime, setLoggingTime] = useState(false)

  // Status change
  const [changingStatus, setChangingStatus] = useState(false)

  useEffect(() => {
    if (taskId) fetchAll()
  }, [taskId])

  async function fetchAll() {
    setLoading(true)
    try {
      const [taskRes, commentsRes, timeRes, usersRes] = await Promise.all([
        supabase.from('tasks').select('*, projects(name, package_tier, bilingual, client_id, domain_url, slack_channel_name), users!tasks_assignee_id_fkey(full_name, email, department), qa_reviewer:users!tasks_qa_reviewer_id_fkey(full_name), manager_reviewer:users!tasks_manager_reviewer_id_fkey(full_name)').eq('id', taskId).single(),
        supabase.from('task_comments').select('*, users(full_name, department)').eq('task_id', taskId).order('created_at', { ascending: true }),
        supabase.from('time_entries').select('*, users(full_name)').eq('task_id', taskId).order('date', { ascending: false }),
        supabase.from('users').select('id, full_name, department').neq('role', 'client').eq('active', true).order('full_name'),
      ])

      setTask(taskRes.data)
      setComments(commentsRes.data || [])
      setTimeEntries(timeRes.data || [])
      setAllUsers(usersRes.data || [])
    } catch (err) {
      console.error('Error loading task:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateTaskField(field, value) {
    const updates = { [field]: value }
    if (field === 'status' && value === 'complete') {
      updates.completed_at = new Date().toISOString()
    }

    setTask(prev => ({ ...prev, ...updates }))
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
    if (error) {
      console.error('Update failed:', error)
      fetchAll()
    }
  }

  async function postComment() {
    if (!newComment.trim()) return
    setPostingComment(true)
    try {
      const { error } = await supabase.from('task_comments').insert([{
        task_id: taskId,
        body: newComment.trim(),
      }])
      if (error) throw error
      setNewComment('')
      fetchAll()
    } catch (err) {
      console.error('Comment error:', err)
      alert('Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  async function logTime() {
    if (!timeForm.hours || parseFloat(timeForm.hours) <= 0) return
    setLoggingTime(true)
    try {
      // Get the first user as fallback for demo mode
      const userId = task?.assignee_id || allUsers[0]?.id
      const { error } = await supabase.from('time_entries').insert([{
        task_id: taskId,
        user_id: userId,
        hours: parseFloat(timeForm.hours),
        date: timeForm.date,
        notes: timeForm.notes || null,
      }])
      if (error) throw error
      setTimeForm({ hours: '', date: new Date().toISOString().split('T')[0], notes: '' })
      fetchAll()
    } catch (err) {
      console.error('Time log error:', err)
      alert('Failed to log time')
    } finally {
      setLoggingTime(false)
    }
  }

  if (loading) return <div className="empty-state"><p>Loading task...</p></div>
  if (!task) return <div className="empty-state"><h3>Task not found</h3><button className="btn btn-secondary" onClick={onBack}>Back</button></div>

  const totalLogged = timeEntries.reduce((sum, te) => sum + (te.hours || 0), 0)
  const progress = task.estimated_hours > 0 ? Math.round((totalLogged / task.estimated_hours) * 100) : 0
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed_at

  function getStatusColor(status) {
    const map = {
      complete: { bg: 'var(--success-50)', color: 'var(--success-600)', dot: 'var(--success-500)' },
      in_progress: { bg: 'var(--info-50)', color: 'var(--info-600)', dot: 'var(--info-500)' },
      ready_for_qa: { bg: 'var(--warning-50)', color: 'var(--warning-600)', dot: 'var(--warning-500)' },
      manager_review: { bg: 'var(--brand-50)', color: 'var(--brand-600)', dot: 'var(--brand-500)' },
      waiting_on_client: { bg: 'var(--danger-50)', color: 'var(--danger-600)', dot: 'var(--danger-500)' },
      escalated: { bg: 'var(--danger-50)', color: 'var(--danger-600)', dot: 'var(--danger-500)' },
      new_this_cycle: { bg: 'var(--slate-100)', color: 'var(--slate-600)', dot: 'var(--slate-400)' },
      scheduled: { bg: 'var(--success-50)', color: 'var(--success-600)', dot: 'var(--success-500)' },
    }
    return map[status] || { bg: 'var(--slate-100)', color: 'var(--slate-600)', dot: 'var(--slate-400)' }
  }

  function getPriorityStyle(p) {
    const map = { high: { bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'High' }, medium: { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'Medium' }, low: { bg: 'var(--slate-100)', color: 'var(--slate-600)', label: 'Low' } }
    return map[p] || map.medium
  }

  function getDeptColor(dept) {
    const map = { seo: '#5b21b6', dev: '#2563eb', design: '#ec4899', content: '#f59e0b', social: '#22c55e', ppc: '#ef4444', admin: '#64748b' }
    return map[dept] || '#64748b'
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const sc = getStatusColor(task.status)
  const ps = getPriorityStyle(task.priority)

  const ALL_STATUSES = [
    { id: 'intake_admin', label: 'Intake / Admin' },
    { id: 'setup_config', label: 'Setup & Config' },
    { id: 'design', label: 'Design' },
    { id: 'development', label: 'Development' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'ready_for_qa', label: 'Ready for QA' },
    { id: 'manager_review', label: 'Manager Review' },
    { id: 'waiting_on_client', label: 'Waiting on Client' },
    { id: 'scheduled', label: 'Scheduled' },
    { id: 'complete', label: 'Complete' },
    { id: 'escalated', label: 'Escalated' },
    { id: 'new_this_cycle', label: 'New This Cycle' },
  ]

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          color: 'var(--slate-500)', cursor: 'pointer', padding: '6px 0', background: 'none', border: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>
      </div>

      {/* Task header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            {task.title}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge" style={{ background: sc.bg, color: sc.color }}>
              {task.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            <span className="badge" style={{ background: ps.bg, color: ps.color }}>
              {ps.label} Priority
            </span>
            {task.department && (
              <span className="badge" style={{ background: `${getDeptColor(task.department)}12`, color: getDeptColor(task.department) }}>
                {task.department}
              </span>
            )}
            {task.qa_required && (
              <span className="badge" style={{
                background: task.qa_status === 'approved' ? 'var(--success-50)' : 'var(--warning-50)',
                color: task.qa_status === 'approved' ? 'var(--success-600)' : 'var(--warning-600)',
              }}>
                QA: {task.qa_status?.replace(/_/g, ' ')}
              </span>
            )}
            {isOverdue && <span className="badge badge-risk">Overdue</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 8 }}>
            {task.projects?.name || '—'}
            {task.board_context && <> · {task.board_context === 'LAUNCH' ? 'Launch Board' : 'Ongoing Board'}</>}
          </div>
        </div>

        {/* Status change dropdown */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <select
            className="input select"
            style={{ width: 200, fontSize: 13, padding: '8px 12px' }}
            value={task.status}
            onChange={(e) => updateTaskField('status', e.target.value)}
          >
            {ALL_STATUSES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main layout: left content + right sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

        {/* Left column */}
        <div>
          {/* Description */}
          {task.description && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>Description</h3></div>
              <div className="card-body">
                <div style={{ fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {task.description}
                </div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-700)' }}>Time progress</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: progress > 100 ? 'var(--danger-600)' : 'var(--slate-900)' }}>
                  {totalLogged.toFixed(1)}h / {task.estimated_hours || '—'}h
                  {task.estimated_hours > 0 && <span style={{ fontSize: 12, color: 'var(--slate-500)', marginLeft: 6 }}>({progress}%)</span>}
                </span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'var(--slate-100)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(progress, 100)}%`, height: '100%',
                  background: progress > 100 ? 'var(--danger-500)' : progress > 80 ? 'var(--warning-500)' : 'var(--brand-500)',
                  borderRadius: 5, transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--slate-200)', marginBottom: 16 }}>
            {[
              { id: 'comments', label: `Comments (${comments.length})` },
              { id: 'time', label: `Time Log (${timeEntries.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                  color: activeSection === tab.id ? 'var(--brand-600)' : 'var(--slate-500)',
                  borderBottom: activeSection === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Comments section */}
          {activeSection === 'comments' && (
            <div>
              {/* Comment input */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ padding: 16 }}>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add a comment... Use @name to mention team members"
                    style={{ resize: 'vertical', padding: '10px 14px', height: 'auto', marginBottom: 10 }}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>Ctrl+Enter to submit</span>
                    <button className="btn btn-primary btn-sm" onClick={postComment} disabled={postingComment || !newComment.trim()}>
                      {postingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comment thread */}
              {comments.length === 0 ? (
                <div className="card">
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
                    No comments yet — start the conversation
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {comments.map((comment, i) => (
                    <div key={comment.id} style={{
                      display: 'flex', gap: 12, padding: '16px 20px',
                      background: 'white', border: '1px solid var(--slate-100)',
                      borderRadius: i === 0 ? 'var(--radius-lg) var(--radius-lg) 0 0' : i === comments.length - 1 ? '0 0 var(--radius-lg) var(--radius-lg)' : '0',
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: getDeptColor(comment.users?.department), color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {comment.users?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>
                            {comment.users?.full_name || 'Team Member'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>
                            {timeAgo(comment.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--slate-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {comment.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Time log section */}
          {activeSection === 'time' && (
            <div>
              {/* Log time form */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><h3>Log time</h3></div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Hours</label>
                      <input
                        className="input"
                        type="number"
                        min="0.25"
                        step="0.25"
                        placeholder="0"
                        value={timeForm.hours}
                        onChange={(e) => setTimeForm(prev => ({ ...prev, hours: e.target.value }))}
                        style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Date</label>
                      <input
                        className="input"
                        type="date"
                        value={timeForm.date}
                        onChange={(e) => setTimeForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Notes (optional)</label>
                      <input
                        className="input"
                        placeholder="What did you work on?"
                        value={timeForm.notes}
                        onChange={(e) => setTimeForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    <button className="btn btn-primary" onClick={logTime} disabled={loggingTime || !timeForm.hours} style={{ height: 42 }}>
                      {loggingTime ? '...' : 'Log'}
                    </button>
                  </div>

                  {/* Quick log buttons */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {[0.5, 1, 2, 4, 8].map(h => (
                      <button
                        key={h}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => setTimeForm(prev => ({ ...prev, hours: h.toString() }))}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time entries list */}
              <div className="card">
                <div className="card-header">
                  <h3>Time entries ({timeEntries.length})</h3>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--slate-900)' }}>{totalLogged.toFixed(1)}h total</span>
                </div>
                {timeEntries.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13 }}>
                    No time logged yet
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Person</th>
                          <th>Hours</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeEntries.map(te => (
                          <tr key={te.id}>
                            <td style={{ fontSize: 13, fontWeight: 600 }}>
                              {new Date(te.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </td>
                            <td style={{ fontSize: 13 }}>{te.users?.full_name || '—'}</td>
                            <td>
                              <span style={{
                                fontWeight: 700, fontSize: 14,
                                color: 'var(--slate-900)',
                              }}>
                                {te.hours}h
                              </span>
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--slate-500)' }}>{te.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          {/* Details card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>Details</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Assignee */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Assignee</div>
                <select
                  className="input select"
                  style={{ fontSize: 13, padding: '7px 10px' }}
                  value={task.assignee_id || ''}
                  onChange={(e) => updateTaskField('assignee_id', e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.department})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Priority</div>
                <select
                  className="input select"
                  style={{ fontSize: 13, padding: '7px 10px' }}
                  value={task.priority || 'medium'}
                  onChange={(e) => updateTaskField('priority', e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Department</div>
                <select
                  className="input select"
                  style={{ fontSize: 13, padding: '7px 10px' }}
                  value={task.department || ''}
                  onChange={(e) => updateTaskField('department', e.target.value)}
                >
                  <option value="">None</option>
                  {['seo', 'dev', 'design', 'content', 'social', 'ppc', 'admin'].map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Due date</div>
                <input
                  className="input"
                  type="date"
                  style={{ fontSize: 13, padding: '7px 10px' }}
                  value={task.due_date || ''}
                  onChange={(e) => updateTaskField('due_date', e.target.value || null)}
                />
                {isOverdue && (
                  <div style={{ fontSize: 12, color: 'var(--danger-600)', fontWeight: 600, marginTop: 4 }}>
                    Overdue by {Math.ceil((new Date() - new Date(task.due_date)) / 86400000)} days
                  </div>
                )}
              </div>

              {/* Estimated hours */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Estimated hours</div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.5"
                  style={{ fontSize: 13, padding: '7px 10px' }}
                  value={task.estimated_hours || ''}
                  onChange={(e) => updateTaskField('estimated_hours', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>
          </div>

          {/* QA info card */}
          {task.qa_required && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h3>QA review</h3></div>
              <div className="card-body">
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>QA status</div>
                  <select
                    className="input select"
                    style={{ fontSize: 13, padding: '7px 10px' }}
                    value={task.qa_status || 'not_required'}
                    onChange={(e) => updateTaskField('qa_status', e.target.value)}
                  >
                    <option value="not_required">Not Required</option>
                    <option value="pending_qa">Pending QA</option>
                    <option value="in_review">In Review</option>
                    <option value="changes_needed">Changes Needed</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>

                {task.qa_reviewer && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>QA reviewer</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{task.qa_reviewer.full_name}</div>
                  </div>
                )}

                {task.manager_reviewer && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 4 }}>Manager reviewer</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-900)' }}>{task.manager_reviewer.full_name}</div>
                  </div>
                )}

                {/* QA action buttons */}
                {task.qa_status === 'pending_qa' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-sm" style={{ background: 'var(--success-500)', color: 'white', flex: 1 }}
                      onClick={() => updateTaskField('qa_status', 'approved')}>
                      Approve
                    </button>
                    <button className="btn btn-sm" style={{ background: 'var(--danger-500)', color: 'white', flex: 1 }}
                      onClick={() => updateTaskField('qa_status', 'changes_needed')}>
                      Request Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project info card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h3>Project</h3></div>
            <div className="card-body">
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>
                {task.projects?.name || '—'}
              </div>
              {task.projects?.package_tier && (
                <span className="badge" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', marginBottom: 8, display: 'inline-block' }}>
                  {task.projects.package_tier.toUpperCase()}
                </span>
              )}
              {task.projects?.bilingual && (
                <span className="badge badge-bilingual" style={{ marginLeft: 6 }}>Bilingual</span>
              )}
              {task.projects?.domain_url && (
                <div style={{ fontSize: 12, color: 'var(--brand-600)', marginTop: 8 }}>
                  <a href={task.projects.domain_url} target="_blank" rel="noopener" style={{ color: 'inherit' }}>
                    {task.projects.domain_url.replace('https://', '')}
                  </a>
                </div>
              )}
              {task.projects?.slack_channel_name && (
                <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>
                  {task.projects.slack_channel_name}
                </div>
              )}
            </div>
          </div>

          {/* Dates card */}
          <div className="card">
            <div className="card-header"><h3>Activity</h3></div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--slate-600)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Created</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                  {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Last updated</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                  {task.updated_at ? timeAgo(task.updated_at) : '—'}
                </span>
              </div>
              {task.completed_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Completed</span>
                  <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>
                    {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}