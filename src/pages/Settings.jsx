import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Settings({ user, isAdmin }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
  }, [activeTab])

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'users', label: 'User Management' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'config', label: 'Global Configuration' },
  ]

  function getRoleBadge(role) {
    const map = {
      admin: { bg: 'var(--brand-100)', color: 'var(--brand-700)' },
      manager: { bg: 'var(--info-50)', color: 'var(--info-600)' },
      member: { bg: 'var(--slate-100)', color: 'var(--slate-600)' },
      qa_analyst: { bg: 'var(--warning-50)', color: 'var(--warning-600)' },
    }
    const style = map[role] || map.member
    const label = role ? role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Member'
    return <span className="badge" style={{ background: style.bg, color: style.color }}>{label}</span>
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    return `${Math.floor(diff / 86400)} days ago`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage users, roles, and global configurations</p>
        </div>
        {activeTab === 'users' && isAdmin && (
          <button className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '1px solid var(--slate-200)', marginBottom: '24px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 500,
              color: activeTab === tab.id ? 'var(--brand-600)' : 'var(--slate-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--brand-600)' : '2px solid transparent',
              transition: 'all 150ms ease',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', gap: '12px' }}>
            <input className="input" placeholder="Search users by name or email..." style={{ maxWidth: '300px', fontSize: '13px' }} />
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading users...</p></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <h3>No users yet</h3>
              <p>Add team members to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--brand-100)', color: 'var(--brand-700)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {u.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '14px' }}>
                              {u.full_name || 'Unnamed'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td style={{ fontSize: '13px', color: 'var(--slate-600)' }}>
                        {u.department || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          fontSize: '13px', color: u.active ? 'var(--success-600)' : 'var(--slate-500)',
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: u.active ? 'var(--success-500)' : 'var(--slate-300)',
                          }} />
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--slate-500)' }}>
                        {timeAgo(u.last_activity_at)}
                      </td>
                      <td>
                        <button style={{ color: 'var(--slate-400)', fontSize: '18px', padding: '4px' }}>⋮</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 20px', fontSize: '13px', color: 'var(--slate-500)', borderTop: '1px solid var(--slate-100)' }}>
                Showing {users.length} user{users.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <h3>Roles & permissions</h3>
              <p>Configure role-based access for Admin, Manager, Member, and QA Analyst. Coming soon.</p>
            </div>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <h3>Global configuration</h3>
              <p>Package tiers, recurring templates, Slack channels, and integration settings. Coming soon.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
