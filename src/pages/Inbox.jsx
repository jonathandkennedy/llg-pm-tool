import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Inbox({ user }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  async function markAllRead() {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Error marking all read:', err)
    }
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  function getNotificationIcon(type) {
    const iconStyle = { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }
    switch (type) {
      case 'approval':
        return <div style={{ ...iconStyle, background: 'var(--success-50)', color: 'var(--success-600)' }}>✓</div>
      case 'ticket':
        return <div style={{ ...iconStyle, background: 'var(--info-50)', color: 'var(--info-600)' }}>●</div>
      case 'alert':
        return <div style={{ ...iconStyle, background: 'var(--warning-50)', color: 'var(--warning-600)' }}>!</div>
      case 'slack':
        return <div style={{ ...iconStyle, background: 'var(--brand-50)', color: 'var(--brand-600)' }}>#</div>
      default:
        return <div style={{ ...iconStyle, background: 'var(--slate-100)', color: 'var(--slate-500)' }}>•</div>
    }
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inbox</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread</button>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading notifications...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: '32px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h3>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p>Approval requests, ticket updates, and Slack activity will show up here.</p>
          </div>
        ) : (
          <div>
            {filtered.map(notif => (
              <div
                key={notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--slate-100)',
                  background: notif.read ? 'transparent' : 'var(--brand-50)',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                {getNotificationIcon(notif.type)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: notif.read ? 400 : 600, color: 'var(--slate-900)' }}>
                    {notif.message || 'Notification'}
                  </div>
                  {notif.details && (
                    <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '2px' }}>
                      {notif.details}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--slate-400)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {notif.created_at ? timeAgo(notif.created_at) : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
