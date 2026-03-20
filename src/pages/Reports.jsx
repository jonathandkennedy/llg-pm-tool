import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'

const COLORS = {
  lapetus: '#64748b',
  rhea: '#3b82f6',
  titan: '#7c3aed',
  gravity: '#a855f7',
  brand: '#7c5aff',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
}

export default function Reports() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [revView, setRevView] = useState('monthly')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [projRes, taskRes, pkgRes] = await Promise.all([
        supabase.from('projects').select('*, packages(name, tier, monthly_price)').in('lifecycle_type', ['PRE_LAUNCH', 'POST_LAUNCH']),
        supabase.from('tasks').select('*'),
        supabase.from('packages').select('*'),
      ])
      setProjects(projRes.data || [])
      setTasks(taskRes.data || [])
      setPackages(pkgRes.data || [])
    } catch (err) {
      console.error('Reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Revenue calculations ──
  const mrr = projects.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
  const now = new Date()
  const monthsInQtr = (now.getMonth() % 3) + 1
  const monthsInYear = now.getMonth() + 1
  const qtdRevenue = mrr * monthsInQtr
  const ytdRevenue = mrr * monthsInYear

  // ── Revenue by package tier ──
  const revenueByTier = {}
  projects.forEach(p => {
    const tier = p.packages?.tier || p.package_tier || 'unknown'
    if (!revenueByTier[tier]) revenueByTier[tier] = { tier, revenue: 0, count: 0, gravityRevenue: 0 }
    revenueByTier[tier].revenue += (p.packages?.monthly_price || 0)
    revenueByTier[tier].count += 1
    if (p.has_gravity_addon) {
      revenueByTier[tier].gravityRevenue += 1999
    }
  })

  const tierChartData = Object.values(revenueByTier).map(t => ({
    name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
    'Package Revenue': t.revenue,
    'Gravity Add-on': t.gravityRevenue,
    clients: t.count,
  }))

  // ── Package distribution (pie) ──
  const pieData = Object.values(revenueByTier).map(t => ({
    name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
    value: t.count,
  }))
  const PIE_COLORS = [COLORS.lapetus, COLORS.rhea, COLORS.titan]

  // ── Gravity vs Saturn split ──
  const saturnRevenue = projects.reduce((sum, p) => sum + (p.packages?.monthly_price || 0), 0)
  const gravityRevenue = projects.filter(p => p.has_gravity_addon).length * 1999
  const revenueSplit = [
    { name: 'Saturn Packages', value: saturnRevenue },
    { name: 'Gravity Add-ons', value: gravityRevenue },
  ]

  // ── Simulated monthly trend (since we don't have historical data, project forward from MRR) ──
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const trendData = []
  for (let i = 0; i < 6; i++) {
    const monthIdx = (now.getMonth() - 5 + i + 12) % 12
    const growth = 1 + (i * 0.04) // Simulate 4% monthly growth
    const baseMrr = mrr / growth
    trendData.push({
      month: monthNames[monthIdx],
      revenue: Math.round(baseMrr * (1 + (i * 0.04))),
    })
  }

  // ── Operations stats ──
  const completedTasks = tasks.filter(t => t.status === 'complete' || t.completed_at)
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.completed_at && t.status !== 'complete' && t.status !== 'cancelled')
  const qaTasks = tasks.filter(t => t.qa_required)
  const qaApproved = qaTasks.filter(t => t.qa_status === 'approved')
  const qaPassRate = qaTasks.length > 0 ? Math.round((qaApproved.length / qaTasks.length) * 100) : 0

  const launchProjects = projects.filter(p => p.lifecycle_type === 'PRE_LAUNCH')
  const ongoingProjects = projects.filter(p => p.lifecycle_type === 'POST_LAUNCH')

  // Average hours per task
  const totalLogged = tasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0)
  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)

  // ── Client revenue table ──
  const clientRevenue = projects.map(p => ({
    id: p.id,
    name: p.name,
    tier: p.packages?.tier || p.package_tier || '—',
    packagePrice: p.packages?.monthly_price || 0,
    hasGravity: p.has_gravity_addon,
    totalRevenue: p.monthly_revenue || 0,
    lifecycle: p.lifecycle_type,
    health: p.health,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue)

  // ── Tasks by department ──
  const tasksByDept = {}
  tasks.forEach(t => {
    const dept = t.department || 'other'
    if (!tasksByDept[dept]) tasksByDept[dept] = { total: 0, completed: 0, inProgress: 0 }
    tasksByDept[dept].total += 1
    if (t.status === 'complete' || t.completed_at) tasksByDept[dept].completed += 1
    else if (t.status === 'in_progress') tasksByDept[dept].inProgress += 1
  })

  const deptChartData = Object.entries(tasksByDept).map(([dept, d]) => ({
    name: dept.charAt(0).toUpperCase() + dept.slice(1),
    Completed: d.completed,
    'In Progress': d.inProgress,
    Remaining: d.total - d.completed - d.inProgress,
  }))

  if (loading) {
    return <div className="empty-state"><p>Loading reports...</p></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Revenue, performance, and operations</p>
        </div>
        <button className="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* ── Revenue Overview ── */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 14 }}>Revenue overview</h2>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label">Monthly recurring (MRR)</div>
          <div className="stat-card-value">${mrr.toLocaleString()}</div>
          <div className="stat-card-change positive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
            {projects.length} active clients
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QTD revenue</div>
          <div className="stat-card-value">${qtdRevenue.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>{monthsInQtr} month{monthsInQtr > 1 ? 's' : ''} in quarter</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">YTD revenue</div>
          <div className="stat-card-value">${ytdRevenue.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>{monthsInYear} month{monthsInYear > 1 ? 's' : ''} this year</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg revenue per client</div>
          <div className="stat-card-value">${projects.length > 0 ? Math.round(mrr / projects.length).toLocaleString() : 0}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 6 }}>across {projects.length} projects</div>
        </div>
      </div>

      {/* ── Charts Row 1: Revenue by Tier + Revenue Trend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Revenue by package */}
        <div className="card">
          <div className="card-header">
            <h3>Revenue by package</h3>
          </div>
          <div className="card-body" style={{ height: 300 }}>
            {tierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--slate-500)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--slate-500)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Package Revenue" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gravity Add-on" fill={COLORS.gravity} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No package data</p></div>
            )}
          </div>
        </div>

        {/* Revenue trend */}
        <div className="card">
          <div className="card-header">
            <h3>Revenue trend (6 months)</h3>
          </div>
          <div className="card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--slate-500)' }} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--slate-500)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-md)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={COLORS.brand} fill="url(#revGradient)" strokeWidth={2.5} dot={{ r: 4, fill: COLORS.brand }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Distribution + Saturn vs Gravity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Package distribution */}
        <div className="card">
          <div className="card-header"><h3>Client distribution by tier</h3></div>
          <div className="card-body" style={{ height: 280, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--slate-200)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Saturn vs Gravity revenue split */}
        <div className="card">
          <div className="card-header"><h3>Saturn vs Gravity revenue</h3></div>
          <div className="card-body" style={{ height: 280, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueSplit} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={4} label={({ name, value }) => `$${(value / 1000).toFixed(0)}k`}>
                  <Cell fill={COLORS.brand} />
                  <Cell fill={COLORS.gravity} />
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: '1px solid var(--slate-200)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Operations Stats ── */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 14 }}>Operations</h2>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Tasks completed</div>
          <div className="stat-card-value" style={{ color: 'var(--success-600)' }}>{completedTasks.length}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {tasks.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Overdue tasks</div>
          <div className="stat-card-value" style={{ color: overdueTasks.length > 0 ? 'var(--danger-600)' : 'var(--success-600)' }}>{overdueTasks.length}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{overdueTasks.length === 0 ? 'All on track' : 'Needs attention'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QA pass rate</div>
          <div className="stat-card-value" style={{ color: qaPassRate >= 80 ? 'var(--success-600)' : 'var(--warning-600)' }}>{qaPassRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>{qaApproved.length}/{qaTasks.length} approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Hours logged</div>
          <div className="stat-card-value">{totalLogged.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>of {totalEstimated.toFixed(0)} estimated</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Projects breakdown</div>
          <div className="stat-card-value" style={{ fontSize: 16 }}>
            <span style={{ color: 'var(--info-600)' }}>{launchProjects.length}</span>
            <span style={{ color: 'var(--slate-300)', margin: '0 6px' }}>/</span>
            <span style={{ color: 'var(--success-600)' }}>{ongoingProjects.length}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', marginTop: 4 }}>launch / ongoing</div>
        </div>
      </div>

      {/* ── Tasks by Department Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><h3>Tasks by department</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} layout="vertical" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--slate-500)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--slate-500)' }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--slate-200)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Completed" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="In Progress" stackId="a" fill={COLORS.brand} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Remaining" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No task data</p></div>
            )}
          </div>
        </div>

        {/* Project health breakdown */}
        <div className="card">
          <div className="card-header"><h3>Project health</h3></div>
          <div className="card-body">
            {['healthy', 'at_risk', 'critical'].map(status => {
              const count = projects.filter(p => p.health === status).length
              const pct = projects.length > 0 ? (count / projects.length) * 100 : 0
              const colors = { healthy: { bg: 'var(--success-500)', label: 'Healthy' }, at_risk: { bg: 'var(--warning-500)', label: 'At Risk' }, critical: { bg: 'var(--danger-500)', label: 'Critical' } }
              const c = colors[status]
              return (
                <div key={status} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>{c.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)' }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 10, background: 'var(--slate-100)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c.bg, borderRadius: 5, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}

            {/* Health legend dots */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--slate-100)' }}>
              {projects.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.health === 'healthy' ? 'var(--success-500)' : p.health === 'at_risk' ? 'var(--warning-500)' : 'var(--danger-500)',
                  }} />
                  <span style={{ fontSize: 11, color: 'var(--slate-600)' }}>{p.name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Client Revenue Table ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Client revenue breakdown</h3>
          <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{clientRevenue.length} active clients</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Package</th>
                <th>Package MRR</th>
                <th>Gravity</th>
                <th>Total MRR</th>
                <th>Status</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {clientRevenue.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{c.name}</td>
                  <td>
                    <span className={`badge ${c.tier === 'titan' ? 'badge-enterprise' : c.tier === 'rhea' ? 'badge-pro' : 'badge-basic'}`}>
                      {c.tier.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 14, fontWeight: 600 }}>${c.packagePrice.toLocaleString()}</td>
                  <td>
                    {c.hasGravity ? (
                      <span className="badge" style={{ background: '#f3f0ff', color: '#5b21b6' }}>$1,999</span>
                    ) : (
                      <span style={{ color: 'var(--slate-400)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>${c.totalRevenue.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${c.lifecycle === 'PRE_LAUNCH' ? 'badge-launch' : 'badge-ongoing'}`}>
                      {c.lifecycle === 'PRE_LAUNCH' ? 'Launch' : 'Ongoing'}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                      background: c.health === 'healthy' ? 'var(--success-500)' : c.health === 'at_risk' ? 'var(--warning-500)' : 'var(--danger-500)',
                    }} />
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
                <td style={{ color: 'var(--slate-900)' }}>Total</td>
                <td></td>
                <td>${saturnRevenue.toLocaleString()}</td>
                <td>${gravityRevenue.toLocaleString()}</td>
                <td style={{ fontSize: 16, color: 'var(--brand-600)' }}>${mrr.toLocaleString()}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}