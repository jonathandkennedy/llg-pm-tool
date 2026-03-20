import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [packages, setPackages] = useState([])
  const [owners, setOwners] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    package_id: '',
    has_gravity_addon: false,
    bilingual: false,
    primary_owner_id: '',
    target_launch_date: '',
    domain_url: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchOptions()
      setForm({
        name: '', package_id: '', has_gravity_addon: false, bilingual: false,
        primary_owner_id: '', target_launch_date: '', domain_url: '',
        client_name: '', client_email: '', client_phone: '', notes: '',
      })
    }
  }, [open])

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

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSaving(true)

    try {
      // Create client record first
      const { data: client, error: clientErr } = await supabase.from('clients').insert([{
        firm_name: form.name,
        contact_name: form.client_name,
        contact_email: form.client_email,
        contact_phone: form.client_phone,
      }]).select().single()

      if (clientErr) throw clientErr

      // Create project
      const { data: project, error: projErr } = await supabase.from('projects').insert([{
        client_id: client.id,
        name: form.name,
        package_id: form.package_id || null,
        has_gravity_addon: form.has_gravity_addon,
        bilingual: form.bilingual,
        primary_owner_id: form.primary_owner_id || null,
        target_launch_date: form.target_launch_date || null,
        domain_url: form.domain_url || null,
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        notes: form.notes,
        lifecycle_type: 'PRE_LAUNCH',
        current_board: 'LAUNCH',
        launch_stage: 'intake_admin',
        health: 'healthy',
        risk_level: 'low',
      }]).select().single()

      if (projErr) throw projErr

      if (onCreated) onCreated(project)
      onClose()
    } catch (err) {
      console.error('Error creating project:', err)
      alert('Failed to create project: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const selectedPkg = packages.find(p => p.id === form.package_id)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-xl)', padding: 0, width: '100%', maxWidth: 640,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>Create new project</h2>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2 }}>New deal handoff — creates client record + launch board entry</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: 18, cursor: 'pointer', border: 'none',
          }}>&times;</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px' }}>

          {/* Client info section */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Client information
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>
                Law firm name *
              </label>
              <input className="input" placeholder="e.g. Smith & Associates Legal"
                value={form.name} onChange={e => update('name', e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Contact name</label>
              <input className="input" placeholder="Primary contact" value={form.client_name} onChange={e => update('client_name', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Contact email</label>
              <input className="input" type="email" placeholder="email@firm.com" value={form.client_email} onChange={e => update('client_email', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Phone</label>
              <input className="input" placeholder="(555) 123-4567" value={form.client_phone} onChange={e => update('client_phone', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Domain URL</label>
              <input className="input" placeholder="https://firmname.com" value={form.domain_url} onChange={e => update('domain_url', e.target.value)} />
            </div>
          </div>

          {/* Package selection */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Package selection
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {packages.map(pkg => (
              <div
                key={pkg.id}
                onClick={() => update('package_id', pkg.id)}
                style={{
                  padding: '16px 14px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  border: form.package_id === pkg.id ? '2px solid var(--brand-500)' : '2px solid var(--slate-200)',
                  background: form.package_id === pkg.id ? 'var(--brand-50)' : 'white',
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>
                  {pkg.name}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-600)' }}>
                  ${pkg.monthly_price?.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate-500)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 6 }}>
                  {pkg.launch_total_pages} launch pages · {pkg.monthly_total_pages}/mo ongoing
                </div>
              </div>
            ))}
          </div>

          {/* Gravity Pack toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 'var(--radius-lg)', marginBottom: 20,
            background: form.has_gravity_addon ? '#f3f0ff' : 'var(--slate-50)',
            border: form.has_gravity_addon ? '1.5px solid #d4c5ff' : '1.5px solid var(--slate-200)',
            cursor: 'pointer', transition: 'all 150ms ease',
          }} onClick={() => update('has_gravity_addon', !form.has_gravity_addon)}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: form.has_gravity_addon ? '#5b21b6' : 'var(--slate-700)' }}>
                + Gravity Pack Add-on
              </div>
              <div style={{ fontSize: 12, color: form.has_gravity_addon ? '#7c3aed' : 'var(--slate-500)', marginTop: 2 }}>
                $1,999/mo · GMB, Citations, Directories, LSA · Free first 90 days
              </div>
            </div>
            <div style={{
              width: 44, height: 24, borderRadius: 12, padding: 2,
              background: form.has_gravity_addon ? 'var(--brand-500)' : 'var(--slate-300)',
              transition: 'background 150ms ease',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                transform: form.has_gravity_addon ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 150ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
          </div>

          {/* Revenue preview */}
          {selectedPkg && (
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-lg)', marginBottom: 20,
              background: 'var(--success-50)', border: '1px solid #bbf7d0',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success-700)', marginBottom: 4 }}>Monthly revenue</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success-700)' }}>
                ${((selectedPkg.monthly_price || 0) + (form.has_gravity_addon ? 0 : 0)).toLocaleString()}/mo
                {form.has_gravity_addon && <span style={{ fontSize: 13, fontWeight: 500 }}> + $1,999 after 90 days</span>}
              </div>
            </div>
          )}

          {/* Assignment */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Assignment & scheduling
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Primary owner</label>
              <select className="input select" value={form.primary_owner_id} onChange={e => update('primary_owner_id', e.target.value)}>
                <option value="">Select owner...</option>
                {owners.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Target launch date</label>
              <input className="input" type="date" value={form.target_launch_date} onChange={e => update('target_launch_date', e.target.value)} />
            </div>
          </div>

          {/* Bilingual toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
            cursor: 'pointer',
          }} onClick={() => update('bilingual', !form.bilingual)}>
            <div style={{
              width: 44, height: 24, borderRadius: 12, padding: 2,
              background: form.bilingual ? 'var(--brand-500)' : 'var(--slate-300)',
              transition: 'background 150ms ease',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                transform: form.bilingual ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 150ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-700)' }}>Bilingual (EN/ES)</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Content will be produced in both English and Spanish</div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Notes</label>
            <textarea className="input" rows={3} placeholder="Any special instructions, practice areas, or notes from the sales handoff..."
              style={{ resize: 'vertical', padding: '10px 14px', height: 'auto' }}
              value={form.notes} onChange={e => update('notes', e.target.value)} />
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
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}