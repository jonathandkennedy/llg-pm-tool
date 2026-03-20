import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function EditProjectModal({ open, onClose, project, onSaved }) {
  const [packages, setPackages] = useState([])
  const [owners, setOwners] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (open && project) {
      fetchOptions()
      setForm({
        name: project.name || '',
        package_id: project.package_id || '',
        has_gravity_addon: project.has_gravity_addon || false,
        bilingual: project.bilingual || false,
        primary_owner_id: project.primary_owner_id || '',
        target_launch_date: project.target_launch_date || '',
        go_live_date: project.go_live_date || '',
        domain_url: project.domain_url || '',
        client_name: project.client_name || '',
        client_email: project.client_email || '',
        client_phone: project.client_phone || '',
        lifecycle_type: project.lifecycle_type || 'PRE_LAUNCH',
        health: project.health || 'healthy',
        risk_level: project.risk_level || 'low',
        slack_channel_name: project.slack_channel_name || '',
        google_drive_folder_id: project.google_drive_folder_id || '',
        notes: project.notes || '',
      })
    }
  }, [open, project])

  async function fetchOptions() {
    const { data: pkgs } = await supabase.from('packages').select('*').eq('is_addon', false).order('monthly_price')
    setPackages(pkgs || [])
    const { data: users } = await supabase.from('users').select('id, full_name, department')
      .in('role', ['admin', 'manager']).eq('active', true).order('full_name')
    setOwners(users || [])
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updates = { ...form }
      // Clean empty strings to nulls
      Object.keys(updates).forEach(k => {
        if (updates[k] === '') updates[k] = null
      })
      // Booleans stay as-is
      updates.has_gravity_addon = form.has_gravity_addon
      updates.bilingual = form.bilingual

      const { error } = await supabase.from('projects').update(updates).eq('id', project.id)
      if (error) throw error
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleLifecycleChange(newType) {
    update('lifecycle_type', newType)
    if (newType === 'POST_LAUNCH') {
      update('go_live_date', update('go_live_date') || new Date().toISOString().split('T')[0])
    }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 640,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>Edit project</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: 18, cursor: 'pointer', border: 'none',
          }}>&times;</button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Lifecycle + Health */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Lifecycle</label>
              <select className="input select" value={form.lifecycle_type} onChange={e => update('lifecycle_type', e.target.value)}>
                <option value="PRE_LAUNCH">Pre-Launch</option>
                <option value="POST_LAUNCH">Post-Launch (Live)</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Health</label>
              <select className="input select" value={form.health} onChange={e => update('health', e.target.value)}>
                <option value="healthy">Healthy</option>
                <option value="at_risk">At Risk</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Risk level</label>
              <select className="input select" value={form.risk_level} onChange={e => update('risk_level', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Client info */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Client information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Project name</label>
              <input className="input" value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Contact name</label>
              <input className="input" value={form.client_name || ''} onChange={e => update('client_name', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Contact email</label>
              <input className="input" value={form.client_email || ''} onChange={e => update('client_email', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Phone</label>
              <input className="input" value={form.client_phone || ''} onChange={e => update('client_phone', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Domain URL</label>
              <input className="input" value={form.domain_url || ''} onChange={e => update('domain_url', e.target.value)} />
            </div>
          </div>

          {/* Package */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Package
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Saturn package</label>
              <select className="input select" value={form.package_id || ''} onChange={e => update('package_id', e.target.value)}>
                <option value="">None</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.monthly_price?.toLocaleString()}/mo</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                borderRadius: 8, cursor: 'pointer', width: '100%',
                background: form.has_gravity_addon ? '#f3f0ff' : 'var(--slate-50)',
                border: form.has_gravity_addon ? '1.5px solid #d4c5ff' : '1.5px solid var(--slate-200)',
              }} onClick={() => update('has_gravity_addon', !form.has_gravity_addon)}>
                <div style={{
                  width: 36, height: 20, borderRadius: 10, padding: 2,
                  background: form.has_gravity_addon ? 'var(--brand-500)' : 'var(--slate-300)',
                  transition: 'background 150ms',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    transform: form.has_gravity_addon ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.has_gravity_addon ? '#5b21b6' : 'var(--slate-600)' }}>
                  Gravity Pack
                </span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Assignment & dates
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Primary owner</label>
              <select className="input select" value={form.primary_owner_id || ''} onChange={e => update('primary_owner_id', e.target.value)}>
                <option value="">Unassigned</option>
                {owners.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.department})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Target launch date</label>
              <input className="input" type="date" value={form.target_launch_date || ''} onChange={e => update('target_launch_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Go-live date</label>
              <input className="input" type="date" value={form.go_live_date || ''} onChange={e => update('go_live_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Slack channel</label>
              <input className="input" placeholder="#client-name" value={form.slack_channel_name || ''} onChange={e => update('slack_channel_name', e.target.value)} />
            </div>
          </div>

          {/* Bilingual + Drive */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              borderRadius: 8, cursor: 'pointer',
              background: form.bilingual ? 'var(--brand-50)' : 'var(--slate-50)',
              border: form.bilingual ? '1.5px solid var(--brand-200)' : '1.5px solid var(--slate-200)',
            }} onClick={() => update('bilingual', !form.bilingual)}>
              <div style={{
                width: 36, height: 20, borderRadius: 10, padding: 2,
                background: form.bilingual ? 'var(--brand-500)' : 'var(--slate-300)',
                transition: 'background 150ms',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: 'white',
                  transform: form.bilingual ? 'translateX(16px)' : 'translateX(0)',
                  transition: 'transform 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: form.bilingual ? 'var(--brand-600)' : 'var(--slate-600)' }}>
                Bilingual (EN/ES)
              </span>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Google Drive folder ID</label>
              <input className="input" placeholder="Paste Drive folder ID" value={form.google_drive_folder_id || ''} onChange={e => update('google_drive_folder_id', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>Notes</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical', padding: '10px 14px', height: 'auto' }}
              value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          position: 'sticky', bottom: 0, background: 'white',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}