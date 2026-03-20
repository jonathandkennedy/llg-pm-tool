import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function CreateTaskModal({ open, onClose, onCreated, projectId, boardContext }) {
  const [team, setTeam] = useState([])
  const [projects, setProjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: projectId || '',
    department: '',
    assignee_id: '',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    qa_required: false,
    board_context: boardContext || 'LAUNCH',
  })

  useEffect(() => {
    if (open) {
      fetchOptions()
      setForm(prev => ({
        ...prev,
        title: '', description: '', department: '', assignee_id: '',
        priority: 'medium', due_date: '', estimated_hours: '', qa_required: false,
        project_id: projectId || prev.project_id,
        board_context: boardContext || prev.board_context,
      }))
    }
  }, [open, projectId, boardContext])

  async function fetchOptions() {
    const { data: users } = await supabase.from('users').select('id, full_name, department')
      .neq('role', 'client').eq('active', true).order('full_name')
    setTeam(users || [])

    if (!projectId) {
      const { data: projs } = await supabase.from('projects').select('id, name, lifecycle_type')
        .in('lifecycle_type', ['PRE_LAUNCH', 'POST_LAUNCH']).order('name')
      setProjects(projs || [])
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Map department to initial task status
  function getInitialStatus(board) {
    return board === 'ONGOING' ? 'new_this_cycle' : 'intake_admin'
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.project_id) return
    setSaving(true)

    try {
      const { data, error } = await supabase.from('tasks').insert([{
        project_id: form.project_id,
        title: form.title,
        description: form.description || null,
        board_context: form.board_context,
        status: getInitialStatus(form.board_context),
        priority: form.priority,
        department: form.department || null,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        qa_required: form.qa_required,
        qa_status: form.qa_required ? 'pending_qa' : 'not_required',
      }]).select().single()

      if (error) throw error
      if (onCreated) onCreated(data)
      onClose()
    } catch (err) {
      console.error('Error creating task:', err)
      alert('Failed to create task: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const departments = ['seo', 'dev', 'design', 'content', 'social', 'ppc', 'admin']
  const filteredTeam = form.department
    ? team.filter(u => u.department === form.department)
    : team

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-xl)', padding: 0, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate-900)' }}>Create task</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--slate-100)', color: 'var(--slate-500)', fontSize: 18, cursor: 'pointer', border: 'none',
          }}>&times;</button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px 28px' }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Task title *</label>
            <input className="input" placeholder="e.g. Build homepage — WordPress"
              value={form.title} onChange={e => update('title', e.target.value)} autoFocus />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Description</label>
            <textarea className="input" rows={2} placeholder="Task details..."
              style={{ resize: 'vertical', padding: '10px 14px', height: 'auto' }}
              value={form.description} onChange={e => update('description', e.target.value)} />
          </div>

          {/* Project (if not preset) */}
          {!projectId && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Project *</label>
              <select className="input select" value={form.project_id} onChange={e => update('project_id', e.target.value)}>
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.lifecycle_type === 'PRE_LAUNCH' ? 'Launch' : 'Ongoing'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Board context */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Board</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['LAUNCH', 'ONGOING'].map(b => (
                <button key={b} onClick={() => update('board_context', b)}
                  className={`btn btn-sm ${form.board_context === b ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {b === 'LAUNCH' ? 'Launch Board' : 'Ongoing Board'}
                </button>
              ))}
            </div>
          </div>

          {/* Department + Assignee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Department</label>
              <select className="input select" value={form.department} onChange={e => update('department', e.target.value)}>
                <option value="">Select...</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Assignee</label>
              <select className="input select" value={form.assignee_id} onChange={e => update('assignee_id', e.target.value)}>
                <option value="">Unassigned</option>
                {filteredTeam.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.department})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority + Due date + Hours */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Priority</label>
              <select className="input select" value={form.priority} onChange={e => update('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Due date</label>
              <input className="input" type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>Est. hours</label>
              <input className="input" type="number" min="0" step="0.5" placeholder="0"
                value={form.estimated_hours} onChange={e => update('estimated_hours', e.target.value)} />
            </div>
          </div>

          {/* QA toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }} onClick={() => update('qa_required', !form.qa_required)}>
            <div style={{
              width: 44, height: 24, borderRadius: 12, padding: 2,
              background: form.qa_required ? 'var(--brand-500)' : 'var(--slate-300)',
              transition: 'background 150ms ease',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                transform: form.qa_required ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 150ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate-700)' }}>QA review required</div>
              <div style={{ fontSize: 12, color: 'var(--slate-500)' }}>Task will require QA approval before completion</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid var(--slate-200)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.project_id}>
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}