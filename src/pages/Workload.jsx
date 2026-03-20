import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CapacitySurvey from './CapacitySurvey.jsx'

export default function Workload() {
  const [teamMembers, setTeamMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [showSurvey, setShowSurvey] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [usersRes, tasksRes, timeRes] = await Promise.all([
        supabase.from('users').select('*').neq('role', 'client').eq('active', true).order('department, full_name'),
        supabase.from('tasks').select('*, projects(name)').not('status', 'in', '("complete","cancelled")'),
        supabase.from('time_entries').select('*').gte('date', getWeekStart()),
      ])
      setTeamMembers(usersRes.data || [])
      setTasks(tasksRes.data || [])
      setTimeEntries(timeRes.data || [])
    } catch (err) {
      console.error('Workload fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  function getWeekStart() {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().split('T')[0]
  }

  // Calculate per-member stats
  function getMemberStats(member) {
    const memberTasks = tasks.filter(t => t.assignee_id === member.id)
    const memberTime = timeEntries.filter(te => te.user_id === member.id)
    const hoursThisWeek = memberTime.reduce((sum, te) => sum + (te.hours || 0), 0)
    const totalEstimated = memberTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
    const totalLogged = memberTasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0)
    const capacity = member.weekly_capacity_hours || 40
    const utilization = capacity > 0 ? Math.round((hoursThisWeek / capacity) * 100) : 0
    const overdueTasks = memberTasks.filter(t => t.due_date && new Date(t.due_date) < new Date())

    return {
      activeTasks: memberTasks.length,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      totalEstimated: Math.round(totalEstimated * 10) / 10,
      totalLogged: Math.round(totalLogged * 10) / 10,
      capacity,
      utilization: Math.min(utilization, 150),
      overdue: overdueTasks.length,
      tasks: memberTasks,
    }
  }

  function getUtilColor(pct) {
    if (pct >= 100) return { bg: 'var(--danger-50)', color: 'var(--danger-600)', bar: 'var(--danger-500)', label: 'Over capacity' }
    if (pct >= 80) return { bg: 'var(--warning-50)', color: 'var(--warning-600)', bar: 'var(--warning-500)', label: 'Near capacity' }
    if (pct >= 40) return { bg: 'var(--success-50)', color: 'var(--success-600)', bar: 'var(--success-500)', label: 'On track' }
    return { bg: 'var(--slate-50)', color: 'var(--slate-500)', bar: 'var(--slate-400)', label: 'Available' }
  }

  function getDeptColor(dept) {
    const map = { seo: '#5b21b6', dev: '#2563eb', design: '#ec4899', content: '#f59e0b', social: '#22c55e', ppc: '#ef4444', admin: '#64748b', executive: '#1e293b', systems: '#0ea5e9', sales: '#f97316', intakes: '#8b5cf6', operations: '#14b8a6', qa: '#06b6d4' }
    return map[dept] || '#64748b'
  }

  function hasCapacityData(member) {
    return member.department === 'seo' || member.daily_homepage_capacity > 5 || member.daily_parent_page_capacity > 10
  }

  const filtered = teamMembers.filter(m => {
    if (filterDept === 'all') return true
    return m.department === filterDept
  })

  const departments = [...new Set(teamMembers.map(m => m.department).filter(Boolean))]

  // Department summary stats
  const deptSummary = departments.map(dept => {
    const members = teamMembers.filter(m => m.department === dept)
    const deptTasks = tasks.filter(t => t.department === dept)
    const totalCapacity = members.reduce((sum, m) => sum + (m.weekly_capacity_hours || 40), 0)
    const totalHours = members.reduce((sum, m) => {
      const hrs = timeEntries.filter(te => te.user_id === m.id).reduce((s, te) => s + (te.hours || 0), 0)
      return sum + hrs
    }, 0)
    return { dept, members: members.length, tasks: deptTasks.length, capacity: totalCapacity, hours: Math.round(totalHours * 10) / 10, utilization: totalCapacity > 0 ? Math.round((totalHours / totalCapacity) * 100) : 0 }
  }).sort((a, b) => b.utilization - a.utilization)

  // Capacity data status
  const membersWithCapacity = teamMembers.filter(m => hasCapacityData(m)).length
  const membersWithoutCapacity = teamMembers.length - membersWithCapacity

  if (loading) return <div className="empty-state"><p>Loading workload data...</p></div>

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Workload</h1>
          <p>Monitor capacity and allocations across teams</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="view-toggle">
            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>Team Cards</button>
            <button className={viewMode === 'dept' ? 'active' : ''} onClick={() => setViewMode('dept')}>By Department</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSurvey(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Set Capacity
          </button>
        </div>
      </div>

      {/* Capacity data warning */}
      {membersWithoutCapacity > 0 && (
        <div style={{
          padding: '12px 18px', borderRadius: 'var(--radius-lg)', marginBottom: 16,
          background: 'var(--warning-50)', border: '1px solid #fde68a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning-700)' }}>
              {membersWithoutCapacity} team member{membersWithoutCapacity > 1 ? 's' : ''} missing capacity data — workload estimates may be incomplete
            </span>
          </div>
          <button className="btn btn-sm" onClick={() => setShowSurvey(true)} style={{ background: 'var(--warning-600)', color: 'white', fontSize: 12 }}>
            Fill out survey
          </button>
        </div>
      )}

      {/* Department overview stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card-label">Team members</div>
          <div className="stat-card-value">{teamMembers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Active tasks</div>
          <div className="stat-card-value" style={{ color: 'var(--info-600)' }}>{tasks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total weekly capacity</div>
          <div className="stat-card-value">{teamMembers.reduce((s, m) => s + (m.weekly_capacity_hours || 40), 0)}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Hours logged this week</div>
          <div className="stat-card-value">{Math.round(timeEntries.reduce((s, te) => s + (te.hours || 0), 0))}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Departments</div>
          <div className="stat-card-value">{departments.length}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${filterDept === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterDept('all')}>
          All ({teamMembers.length})
        </button>
        {departments.map(dept => {
          const count = teamMembers.filter(m => m.department === dept).length
          return (
            <button
              key={dept}
              className={`btn btn-sm ${filterDept === dept ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterDept(dept)}
              style={filterDept !== dept ? { borderColor: getDeptColor(dept), color: getDeptColor(dept) } : {}}
            >
              {dept.charAt(0).toUpperCase() + dept.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Department View ── */}
      {viewMode === 'dept' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {deptSummary.filter(d => filterDept === 'all' || d.dept === filterDept).map(dept => {
            const util = getUtilColor(dept.utilization)
            return (
              <div className="card" key={dept.dept}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: getDeptColor(dept.dept) }} />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>
                        {dept.dept.charAt(0).toUpperCase() + dept.dept.slice(1)}
                      </h3>
                      <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{dept.members} member{dept.members > 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>{dept.tasks}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Tasks</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>{dept.hours}h</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>This week</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>{dept.capacity}h</div>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Capacity</div>
                      </div>
                      <span className="badge" style={{ background: util.bg, color: util.color }}>{dept.utilization}%</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'var(--slate-100)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(dept.utilization, 100)}%`, height: '100%', background: util.bar, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Team Cards View ── */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(member => {
            const stats = getMemberStats(member)
            const util = getUtilColor(stats.utilization)

            return (
              <div className="card" key={member.id} style={{ overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid var(--slate-100)', position: 'relative' }}>
                  {/* Edge indicator */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: util.bar }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: getDeptColor(member.department), color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700,
                      }}>
                        {member.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--slate-900)' }}>{member.full_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span className="badge" style={{ background: `${getDeptColor(member.department)}12`, color: getDeptColor(member.department) }}>
                            {member.department || 'Team'}
                          </span>
                          {member.is_manager && <span className="badge" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>Manager</span>}
                          {member.is_qa_reviewer && <span className="badge" style={{ background: 'var(--info-50)', color: 'var(--info-600)' }}>QA</span>}
                        </div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: util.bg, color: util.color }}>{util.label}</span>
                  </div>

                  {/* Utilization bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Weekly capacity</span>
                      <span style={{ fontWeight: 700, color: util.color }}>{stats.utilization}% ({stats.hoursThisWeek}/{stats.capacity}h)</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--slate-100)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(stats.utilization, 100)}%`, height: '100%', background: util.bar, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--info-600)' }}>{stats.activeTasks}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Active tasks</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: stats.overdue > 0 ? 'var(--danger-600)' : 'var(--success-600)' }}>{stats.overdue}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Overdue</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>{stats.totalLogged}h</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>Logged</div>
                    </div>
                  </div>

                  {/* SEO capacity (only for SEO team) */}
                  {member.department === 'seo' && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--slate-100)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: 6 }}>Daily production capacity</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ padding: '6px 10px', background: 'var(--slate-50)', borderRadius: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{member.daily_homepage_capacity || 5}</span>
                          <span style={{ color: 'var(--slate-500)' }}> homepages</span>
                        </div>
                        <div style={{ padding: '6px 10px', background: 'var(--slate-50)', borderRadius: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{member.daily_parent_page_capacity || 10}</span>
                          <span style={{ color: 'var(--slate-500)' }}> parent</span>
                        </div>
                        <div style={{ padding: '6px 10px', background: 'var(--slate-50)', borderRadius: 6, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{member.daily_child_page_capacity || 15}</span>
                          <span style={{ color: 'var(--slate-500)' }}> child</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Task list */}
                <div style={{ padding: '12px 20px', background: 'var(--slate-50)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--slate-400)', marginBottom: 8 }}>
                    Current assignments
                  </div>
                  {stats.tasks.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--slate-400)', fontStyle: 'italic' }}>No active tasks</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {stats.tasks.slice(0, 4).map(task => (
                        <div key={task.id} style={{
                          background: 'white', padding: '8px 12px', borderRadius: 6,
                          border: '1px solid var(--slate-200)', fontSize: 13,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{task.title}</span>
                            {task.due_date && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: task.due_date && new Date(task.due_date) < new Date() ? 'var(--danger-600)' : 'var(--slate-500)',
                              }}>
                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>
                            {task.projects?.name || '—'}
                            {task.estimated_hours && <> · {task.logged_hours || 0}/{task.estimated_hours}h</>}
                          </div>
                        </div>
                      ))}
                      {stats.tasks.length > 4 && (
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', textAlign: 'center', padding: 4 }}>
                          +{stats.tasks.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Capacity Survey Modal */}
      <CapacitySurvey
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSaved={() => fetchAll()}
      />
    </div>
  )
}