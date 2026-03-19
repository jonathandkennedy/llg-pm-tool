import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Reports() {
  const [revenueData, setRevenueData] = useState({ mtd: 0, qtd: 0, ytd: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRevenueData()
  }, [])

  async function fetchRevenueData() {
    try {
      const { data } = await supabase
        .from('projects')
        .select('monthly_revenue, lifecycle_type, created_at')
        .in('lifecycle_type', ['PRE_LAUNCH', 'POST_LAUNCH'])

      if (data) {
        const mrr = data.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0)
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const qtrStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        const yearStart = new Date(now.getFullYear(), 0, 1)

        // Simple estimate: MRR × months elapsed
        const monthsInQtr = (now.getMonth() - qtrStart.getMonth()) + 1
        const monthsInYear = now.getMonth() + 1

        setRevenueData({
          mtd: mrr,
          qtd: mrr * monthsInQtr,
          ytd: mrr * monthsInYear,
        })
      }
    } catch (err) {
      console.error('Revenue fetch error:', err)
    } finally {
      setLoading(false)
    }
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* Revenue Overview */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '14px' }}>Revenue overview</h2>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label">MTD revenue</div>
          <div className="stat-card-value">${revenueData.mtd.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QTD revenue</div>
          <div className="stat-card-value">${revenueData.qtd.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">YTD revenue</div>
          <div className="stat-card-value">${revenueData.ytd.toLocaleString()}</div>
        </div>
      </div>

      {/* Placeholder charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3>Revenue by package</h3>
            <div className="view-toggle">
              <button className="active">Monthly</button>
              <button>Quarterly</button>
            </div>
          </div>
          <div className="card-body" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>Revenue chart will render here once projects have package data.</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Package distribution</h3></div>
          <div className="card-body" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>Distribution chart will render here with live data.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operations stats placeholder */}
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-900)', marginBottom: '14px' }}>Operations</h2>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-label">Tasks completed this month</div>
          <div className="stat-card-value">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg. launch time (days)</div>
          <div className="stat-card-value">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Overdue tasks</div>
          <div className="stat-card-value" style={{ color: 'var(--danger-600)' }}>—</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QA pass rate</div>
          <div className="stat-card-value">—</div>
        </div>
      </div>
    </div>
  )
}
