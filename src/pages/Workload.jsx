import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Workload() {
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('all')
  const [viewMode, setViewMode] = useState('weekly')

  useEffect(() => {
    fetchTeamWorkload()
  }, [])

  async function fetchTeamWorkload() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('active', true)
        .not('role', 'eq', 'client')
        .order('full_name')

      if (error) throw error
      setTeamMembers(data || [])
    } catch (err) {
      console.error('Error fetching team:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = teamMembers.filter(m => {
    if (filterDept === 'all') return true
    return m.department === filterDept
  })

  function getUtilizationColor(pct) {
    if (pct >= 100) return { bg: 'var(--danger-50)', color: 'var(--danger-600)', label: 'Over-utilized', barColor: 'var(--danger-500)' }
    if (pct >= 80) return { bg: 'var(--warning-50)', color: 'var(--warning-600)', label: 'Near capacity', barColor: 'var(--warning-500)' }
    return { bg: 'var(--success-50)', color: 'var(--success-600)', label: 'Available', barColor: 'var(--success-500)' }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Workload</h1>
          <p>Monitor capacity and allocations across teams</p>
        </div>
        <div className="view-toggle">
          <button className={viewMode === 'weekly' ? 'active' : ''} onClick={() => setViewMode('weekly')}>Weekly</button>
          <button className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>Monthly</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select className="input select" style={{ maxWidth: '180px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">All Departments</option>
          <option value="dev">Development</option>
          <option value="design">Design</option>
          <option value="seo">SEO</option>
          <option value="social">Social</option>
          <option value="ppc">PPC</option>
        </select>
        <select className="input select" style={{ maxWidth: '160px' }}>
          <option>All Owners</option>
          <option>Mark</option>
          <option>Juan</option>
        </select>
      </div>

      {/* Team Cards */}
      {loading ? (
        <div className="empty-state"><p>Loading team data...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No team members found</h3>
          <p>Add team members in Settings to see their workload here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(member => {
            // TODO: Replace with real task hour aggregation
            const capacity = member.weekly_capacity_hours || 40
            const allocated = 0 // Will be computed from tasks
            const pct = capacity > 0 ? Math.round((allocated / capacity) * 100) : 0
            const util = getUtilizationColor(pct)

            return (
              <div className="card" key={member.id} style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--slate-100)', position: 'relative' }}>
                  {/* Utilization edge indicator */}
                  <div style={{
                    position: 'absolute', top: 0, right: 0, width: 3, height: '100%',
                    background: util.barColor, borderRadius: '0 0 0 0',
                  }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--brand-100)', color: 'var(--brand-700)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 700,
                      }}>
                        {member.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--slate-900)' }}>
                          {member.full_name || member.email}
                        </div>
                        <span className="badge" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', marginTop: '2px' }}>
                          {member.department || 'Team'}
                        </span>
                      </div>
                    </div>
                    <span className="badge" style={{ background: util.bg, color: util.color }}>
                      {util.label}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Weekly capacity</span>
                      <span style={{ fontWeight: 700, color: util.color }}>{pct}% ({allocated}/{capacity} hrs)</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--slate-100)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: '100%',
                        background: util.barColor,
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Allocations placeholder */}
                <div style={{ padding: '14px 20px', background: 'var(--slate-50)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--slate-400)', marginBottom: '8px' }}>
                    Current allocations
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--slate-500)' }}>
                    No tasks assigned yet. Tasks will appear here once projects have work items.
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
