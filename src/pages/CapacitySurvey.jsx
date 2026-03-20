import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const DEPARTMENT_QUESTIONS = {
  seo: {
    label: 'SEO',
    color: '#5b21b6',
    questions: [
      { key: 'daily_homepage_capacity', label: 'Homepages created per day', default: 5, unit: 'pages' },
      { key: 'daily_parent_page_capacity', label: 'Parent pages created per day', default: 10, unit: 'pages' },
      { key: 'daily_child_page_capacity', label: 'Child pages created per day', default: 15, unit: 'pages' },
      { key: 'daily_qa_capacity_units', label: 'Pages QA reviewed per day', default: 20, unit: 'pages' },
      { key: 'custom_blog_posts_per_day', label: 'Blog posts written per day', default: 2, unit: 'posts' },
      { key: 'custom_faq_posts_per_day', label: 'FAQ/AI search posts per day', default: 4, unit: 'posts' },
    ],
  },
  dev: {
    label: 'Development',
    color: '#2563eb',
    questions: [
      { key: 'custom_wp_homepage_hours', label: 'Hours for a WordPress homepage build', default: 16, unit: 'hours' },
      { key: 'custom_wp_inner_page_hours', label: 'Hours for an inner page build', default: 4, unit: 'hours' },
      { key: 'custom_simultaneous_sites', label: 'Sites worked on simultaneously', default: 3, unit: 'sites' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
  design: {
    label: 'Design',
    color: '#ec4899',
    questions: [
      { key: 'custom_figma_pages_per_day', label: 'Figma page mockups per day', default: 3, unit: 'pages' },
      { key: 'custom_homepage_design_hours', label: 'Hours for a homepage design', default: 8, unit: 'hours' },
      { key: 'custom_inner_page_design_hours', label: 'Hours for an inner page template', default: 3, unit: 'hours' },
      { key: 'custom_revision_rounds', label: 'Average revision rounds per client', default: 2, unit: 'rounds' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
  social: {
    label: 'Social Media',
    color: '#22c55e',
    questions: [
      { key: 'custom_posts_per_day', label: 'Social posts created per day', default: 8, unit: 'posts' },
      { key: 'custom_gmb_posts_per_week', label: 'GMB posts created per week', default: 15, unit: 'posts' },
      { key: 'custom_accounts_managed', label: 'Max accounts managed simultaneously', default: 10, unit: 'accounts' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
  ppc: {
    label: 'PPC / Paid Ads',
    color: '#ef4444',
    questions: [
      { key: 'custom_accounts_managed', label: 'Ad accounts managed simultaneously', default: 8, unit: 'accounts' },
      { key: 'custom_hours_per_account_week', label: 'Hours per account per week (optimization)', default: 3, unit: 'hours' },
      { key: 'custom_new_campaign_setup_hours', label: 'Hours to set up a new campaign', default: 12, unit: 'hours' },
      { key: 'custom_lsa_accounts', label: 'LSA accounts managed', default: 6, unit: 'accounts' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
  content: {
    label: 'Content (Video/Press)',
    color: '#f59e0b',
    questions: [
      { key: 'custom_videos_per_week', label: 'YouTube videos produced per week', default: 4, unit: 'videos' },
      { key: 'custom_video_hours', label: 'Average hours per video', default: 4, unit: 'hours' },
      { key: 'custom_press_per_week', label: 'Press releases per week', default: 3, unit: 'releases' },
      { key: 'custom_press_hours', label: 'Hours per press release', default: 3, unit: 'hours' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
  admin: {
    label: 'Admin',
    color: '#64748b',
    questions: [
      { key: 'custom_intakes_per_day', label: 'Client intakes processed per day', default: 4, unit: 'intakes' },
      { key: 'custom_onboarding_hours', label: 'Hours per new client onboarding', default: 6, unit: 'hours' },
      { key: 'weekly_capacity_hours', label: 'Available work hours per week', default: 40, unit: 'hours' },
    ],
  },
}

export default function CapacitySurvey({ open, onClose, onSaved }) {
  const [members, setMembers] = useState([])
  const [selectedDept, setSelectedDept] = useState('seo')
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMembers()
      setSaved(false)
    }
  }, [open])

  async function fetchMembers() {
    const { data } = await supabase.from('users').select('*').neq('role', 'client').eq('active', true).order('full_name')
    setMembers(data || [])

    // Pre-populate answers from existing data
    const ans = {}
    ;(data || []).forEach(m => {
      ans[m.id] = {}
      const deptQ = DEPARTMENT_QUESTIONS[m.department]
      if (deptQ) {
        deptQ.questions.forEach(q => {
          ans[m.id][q.key] = m[q.key] || q.default
        })
      }
    })
    setAnswers(ans)
  }

  function updateAnswer(userId, key, value) {
    setAnswers(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: value === '' ? '' : parseFloat(value) || 0 },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const deptMembers = members.filter(m => m.department === selectedDept)
      for (const member of deptMembers) {
        const memberAnswers = answers[member.id] || {}
        // Separate standard columns from custom JSON
        const standardFields = {}
        const customFields = {}

        Object.entries(memberAnswers).forEach(([key, val]) => {
          if (['weekly_capacity_hours', 'daily_homepage_capacity', 'daily_parent_page_capacity', 'daily_child_page_capacity', 'daily_qa_capacity_units'].includes(key)) {
            standardFields[key] = val
          } else {
            customFields[key] = val
          }
        })

        const { error } = await supabase.from('users').update(standardFields).eq('id', member.id)
        if (error) console.error('Error updating', member.full_name, error)
      }

      setSaved(true)
      setTimeout(() => {
        if (onSaved) onSaved()
      }, 1000)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const deptConfig = DEPARTMENT_QUESTIONS[selectedDept]
  const deptMembers = members.filter(m => m.department === selectedDept)
  const allDepts = Object.keys(DEPARTMENT_QUESTIONS)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 800,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>Team capacity survey</h2>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2 }}>Set production capacity for each team member by department</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: 18, cursor: 'pointer', border: 'none',
          }}>&times;</button>
        </div>

        {/* Department tabs */}
        <div style={{ padding: '16px 28px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allDepts.map(dept => {
            const cfg = DEPARTMENT_QUESTIONS[dept]
            const count = members.filter(m => m.department === dept).length
            return (
              <button
                key={dept}
                onClick={() => { setSelectedDept(dept); setSaved(false) }}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: selectedDept === dept ? `2px solid ${cfg.color}` : '2px solid var(--slate-200)',
                  background: selectedDept === dept ? `${cfg.color}10` : 'white',
                  color: selectedDept === dept ? cfg.color : 'var(--slate-600)',
                  transition: 'all 150ms ease',
                }}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Questions per member */}
        <div style={{ padding: '20px 28px' }}>
          {deptMembers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-400)' }}>
              No team members in this department
            </div>
          ) : (
            deptMembers.map(member => (
              <div key={member.id} style={{
                marginBottom: 20, padding: 20, borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)', background: 'var(--slate-50)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: deptConfig.color,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {member.full_name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>{member.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>{member.email}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {deptConfig.questions.map(q => (
                    <div key={q.key}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--slate-600)', marginBottom: 4 }}>
                        {q.label}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          style={{ padding: '6px 10px', fontSize: 14, fontWeight: 600 }}
                          value={answers[member.id]?.[q.key] ?? q.default}
                          onChange={e => updateAnswer(member.id, q.key, e.target.value)}
                        />
                        <span style={{ fontSize: 12, color: 'var(--slate-400)', whiteSpace: 'nowrap' }}>{q.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', bottom: 0, background: 'white',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--slate-500)' }}>
            {saved ? (
              <span style={{ color: 'var(--success-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved successfully
              </span>
            ) : (
              `Editing ${deptConfig.label} department — ${deptMembers.length} member${deptMembers.length !== 1 ? 's' : ''}`
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || deptMembers.length === 0}>
              {saving ? 'Saving...' : `Save ${deptConfig.label} Capacity`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}