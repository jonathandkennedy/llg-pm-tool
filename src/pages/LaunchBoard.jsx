import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import CreateProjectModal from './CreateProjectModal.jsx'

const LAUNCH_COLUMNS = [
  { id: 'intake_admin', label: 'Intake / Admin', color: '#64748b' },
  { id: 'setup_config', label: 'Setup & Config', color: '#3b82f6' },
  { id: 'design', label: 'Design', color: '#7c5aff' },
  { id: 'development', label: 'Development', color: '#7c3aed' },
  { id: 'internal_qa', label: 'Internal QA', color: '#f59e0b' },
  { id: 'client_review', label: 'Client Review', color: '#22c55e' },
  { id: 'launch_scheduled', label: 'Launch Scheduled', color: '#15803d' },
]

export default function LaunchBoard({ onViewProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedCard, setExpandedCard] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, users!projects_primary_owner_id_fkey(full_name), packages(name, monthly_price)')
        .eq('lifecycle_type', 'PRE_LAUNCH')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching launch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  async function moveProject(projectId, newStage) {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, launch_stage: newStage } : p
    ))

    const { error } = await supabase
      .from('projects')
      .update({ launch_stage: newStage })
      .eq('id', projectId)

    if (error) {
      console.error('Failed to move project:', error)
      fetchProjects() // Revert on failure
    }
  }

  // Drag handlers
  function handleDragStart(e, project) {
    setDragItem(project)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.5'
  }

  function handleDragEnd(e) {
    e.target.style.opacity = '1'
    setDragItem(null)
    setDragOverCol(null)
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colId)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  function handleDrop(e, colId) {
    e.preventDefault()
    setDragOverCol(null)
    if (dragItem && dragItem.launch_stage !== colId) {
      moveProject(dragItem.id, colId)
    }
    setDragItem(null)
  }

  function getColumnProjects(colId) {
    return projects.filter(p => p.launch_stage === colId)
  }

  function getTierColor(tier) {
    const map = { titan: '#7c3aed', rhea: '#2563eb', lapetus: '#64748b' }
    return map[tier?.toLowerCase()] || '#64748b'
  }

  function isOverdue(d) { return d && new Date(d) < new Date() }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Launch Board</h1>
          <p>Manage pre-live client onboarding and approvals</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ New Deal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total in launch</div>
          <div className="stat-card-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Client review</div>
          <div className="stat-card-value" style={{ color: 'var(--warning-600)' }}>
            {projects.filter(p => p.launch_stage === 'client_review').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">QA review</div>
          <div className="stat-card-value" style={{ color: 'var(--info-600)' }}>
            {projects.filter(p => p.launch_stage === 'internal_qa').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">At risk</div>
          <div className="stat-card-value" style={{ color: 'var(--danger-600)' }}>
            {projects.filter(p => p.risk_level === 'high').length}
          </div>
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="empty-state"><p>Loading projects...</p></div>
      ) : (
        <div className="kanban-board">
          {LAUNCH_COLUMNS.map(col => {
            const colProjects = getColumnProjects(col.id)
            const isDragOver = dragOverCol === col.id

            return (
              <div className="kanban-column" key={col.id}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    {col.label}
                    <span className="kanban-column-count">{colProjects.length}</span>
                  </div>
                </div>

                <div
                  className="kanban-column-body"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  style={{
                    borderColor: isDragOver ? 'var(--brand-400)' : undefined,
                    background: isDragOver ? 'var(--brand-50)' : undefined,
                    transition: 'all 150ms ease',
                    minHeight: 120,
                  }}
                >
                  {colProjects.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate-400)', fontSize: 13, fontStyle: 'italic' }}>
                      {isDragOver ? 'Drop here' : 'No projects'}
                    </div>
                  ) : (
                    colProjects.map(project => (
                      <div
                        key={project.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, project)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setExpandedCard(expandedCard === project.id ? null : project.id)}
                        style={{ cursor: 'grab', position: 'relative' }}
                      >
                        {/* Tier + badges */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span className="badge" style={{ background: `${getTierColor(project.package_tier)}15`, color: getTierColor(project.package_tier) }}>
                            {project.package_tier?.toUpperCase() || '—'}
                          </span>
                          {project.bilingual && <span className="badge badge-bilingual">EN/ES</span>}
                          {project.risk_level === 'high' && <span className="badge badge-risk">High Risk</span>}
                          {project.has_gravity_addon && (
                            <span className="badge" style={{ background: '#f3f0ff', color: '#5b21b6' }}>+Gravity</span>
                          )}
                        </div>

                        {/* Name */}
                        <div className="kanban-card-title">{project.name}</div>
                        <div className="kanban-card-subtitle">{project.users?.full_name || 'Unassigned'}</div>

                        {/* Footer */}
                        <div className="kanban-card-footer" style={{ marginTop: 8 }}>
                          {project.target_launch_date && (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: isOverdue(project.target_launch_date) ? 'var(--danger-600)' : 'var(--slate-500)',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {new Date(project.target_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-500)' }}>
                            ${(project.monthly_revenue || project.packages?.monthly_price || 0).toLocaleString()}/mo
                          </span>
                        </div>

                        {/* Expanded detail */}
                        {expandedCard === project.id && (
                          <div style={{
                            marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--slate-100)',
                            animation: 'fadeIn 0.15s ease',
                          }}>
                            <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 8 }}>
                              {project.packages?.name || '—'} · Started {project.started_at ? new Date(project.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                            </div>

                            {/* Quick move buttons */}
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-500)', marginBottom: 6 }}>Move to:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {LAUNCH_COLUMNS.filter(c => c.id !== project.launch_stage).map(c => (
                                <button
                                  key={c.id}
                                  onClick={(e) => { e.stopPropagation(); moveProject(project.id, c.id); setExpandedCard(null) }}
                                  style={{
                                    padding: '3px 8px', borderRadius: 4, border: '1px solid var(--slate-200)',
                                    background: 'white', fontSize: 10, fontWeight: 600, color: c.color,
                                    cursor: 'pointer', transition: 'all 100ms ease',
                                  }}
                                  onMouseEnter={e => { e.target.style.background = c.color; e.target.style.color = 'white' }}
                                  onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.color = c.color }}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>

                            {/* View full project */}
                            <button
                              onClick={(e) => { e.stopPropagation(); onViewProject && onViewProject(project.id) }}
                              className="btn btn-secondary btn-sm"
                              style={{ width: '100%', marginTop: 8, fontSize: 12 }}
                            >
                              Open full project
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchProjects()}
      />
    </div>
  )
}