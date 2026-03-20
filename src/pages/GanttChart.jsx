import { useState, useEffect, useRef, useMemo } from 'react'

// ─── Gantt Chart ───────────────────────────────────────────────────────────
// Shows tasks as horizontal bars on a timeline with dependency arrows.
// Props: tasks (array), onTaskClick (fn), onUpdateTask (fn)
// ────────────────────────────────────────────────────────────────────────────

const DEPT_COLORS = {
  seo: { bg: '#ede9fe', bar: '#7c3aed', text: '#5b21b6' },
  dev: { bg: '#dbeafe', bar: '#3b82f6', text: '#1d4ed8' },
  design: { bg: '#fce7f3', bar: '#ec4899', text: '#be185d' },
  content: { bg: '#fef3c7', bar: '#f59e0b', text: '#b45309' },
  social: { bg: '#dcfce7', bar: '#22c55e', text: '#15803d' },
  ppc: { bg: '#fee2e2', bar: '#ef4444', text: '#b91c1c' },
  admin: { bg: '#f1f5f9', bar: '#64748b', text: '#334155' },
}

const ROW_HEIGHT = 44
const HEADER_HEIGHT = 48
const LABEL_WIDTH = 280
const DAY_WIDTH = 36

function getDeptStyle(dept) {
  return DEPT_COLORS[dept] || DEPT_COLORS.admin
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GanttChart({ tasks = [], onTaskClick, onUpdateTask }) {
  const scrollRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [groupBy, setGroupBy] = useState('department')
  const [zoomLevel, setZoomLevel] = useState(1) // 0.5 = week view, 1 = day view, 2 = half-day

  const dayWidth = DAY_WIDTH * zoomLevel

  // Calculate date range
  const { startDate, endDate, totalDays, today } = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    let earliest = now
    let latest = addDays(now, 30)

    tasks.forEach(t => {
      const start = t.gantt_start_date ? new Date(t.gantt_start_date) : (t.due_date ? addDays(t.due_date, -(t.gantt_duration_days || 3)) : now)
      const end = t.due_date ? new Date(t.due_date) : addDays(start, t.gantt_duration_days || 3)
      if (start < earliest) earliest = new Date(start)
      if (end > latest) latest = new Date(end)
    })

    // Add padding
    earliest = addDays(earliest, -3)
    latest = addDays(latest, 7)
    const totalDays = diffDays(earliest, latest)

    return { startDate: earliest, endDate: latest, totalDays, today: now }
  }, [tasks])

  // Group tasks
  const grouped = useMemo(() => {
    const groups = {}
    tasks.forEach(t => {
      const key = groupBy === 'department' ? (t.department || 'other') : (t.status || 'unknown')
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    // Sort tasks within groups by start date
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        const aStart = a.gantt_start_date || a.due_date || '9999'
        const bStart = b.gantt_start_date || b.due_date || '9999'
        return new Date(aStart) - new Date(bStart)
      })
    })
    return groups
  }, [tasks, groupBy])

  // Flat list for rendering (with group headers)
  const rows = useMemo(() => {
    const result = []
    Object.entries(grouped).forEach(([group, groupTasks]) => {
      result.push({ type: 'header', label: group.charAt(0).toUpperCase() + group.slice(1).replace(/_/g, ' '), count: groupTasks.length })
      groupTasks.forEach(t => result.push({ type: 'task', task: t }))
    })
    return result
  }, [grouped])

  // Build dependency map
  const taskMap = useMemo(() => {
    const map = {}
    tasks.forEach(t => { map[t.id] = t })
    return map
  }, [tasks])

  // Get bar position for a task
  function getBarProps(task) {
    const taskStart = task.gantt_start_date ? new Date(task.gantt_start_date) : (task.due_date ? addDays(task.due_date, -(task.gantt_duration_days || 3)) : today)
    const duration = task.gantt_duration_days || Math.max(Math.ceil((task.estimated_hours || 8) / 8), 1)
    const offsetDays = diffDays(startDate, taskStart)
    const left = offsetDays * dayWidth
    const width = Math.max(duration * dayWidth, dayWidth)

    return { left, width, duration, taskStart }
  }

  // Get row index for a task (for drawing dependency lines)
  function getTaskRowIndex(taskId) {
    let idx = 0
    for (const row of rows) {
      if (row.type === 'task' && row.task.id === taskId) return idx
      idx++
    }
    return -1
  }

  // Today marker position
  const todayOffset = diffDays(startDate, today) * dayWidth

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers = []
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(startDate, i)
      headers.push({
        date: d,
        day: d.getDate(),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isFirstOfMonth: d.getDate() === 1,
        isToday: d.toDateString() === today.toDateString(),
      })
    }
    return headers
  }, [startDate, totalDays, today])

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayPos = todayOffset - 200
      scrollRef.current.scrollLeft = Math.max(0, todayPos)
    }
  }, [todayOffset])

  const totalHeight = rows.length * ROW_HEIGHT + HEADER_HEIGHT

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>Group by:</span>
          <button className={`btn btn-sm ${groupBy === 'department' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGroupBy('department')}>Department</button>
          <button className={`btn btn-sm ${groupBy === 'status' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setGroupBy('status')}>Status</button>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-500)' }}>Zoom:</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>−</button>
          <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center', color: 'var(--slate-600)', fontWeight: 600 }}>{Math.round(zoomLevel * 100)}%</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>+</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(DEPT_COLORS).map(([dept, colors]) => (
          <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: colors.bar }} />
            <span style={{ fontSize: 11, color: 'var(--slate-600)', fontWeight: 500 }}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 2, background: 'var(--danger-500)' }} />
          <span style={{ fontSize: 11, color: 'var(--slate-600)', fontWeight: 500 }}>Today</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="10" viewBox="0 0 16 10"><line x1="0" y1="5" x2="12" y2="5" stroke="var(--slate-400)" strokeWidth="1.5"/><polygon points="12,2 16,5 12,8" fill="var(--slate-400)"/></svg>
          <span style={{ fontSize: 11, color: 'var(--slate-600)', fontWeight: 500 }}>Dependency</span>
        </div>
      </div>

      {/* Chart container */}
      <div style={{ display: 'flex', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'white' }}>

        {/* Left label panel (fixed) */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
          {/* Header */}
          <div style={{ height: HEADER_HEIGHT, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Task
          </div>
          {/* Rows */}
          {rows.map((row, i) => (
            <div key={i} style={{
              height: ROW_HEIGHT, display: 'flex', alignItems: 'center', padding: '0 16px',
              borderBottom: '1px solid var(--slate-100)',
              background: row.type === 'header' ? 'var(--slate-100)' : 'transparent',
            }}>
              {row.type === 'header' ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {row.label}
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--slate-400)', background: 'var(--slate-200)', padding: '1px 6px', borderRadius: 4 }}>{row.count}</span>
                </div>
              ) : (
                <div
                  style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}
                  onClick={() => onTaskClick && onTaskClick(row.task.id)}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                    {row.task.users?.full_name || 'Unassigned'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right scrollable timeline */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', position: 'relative' }}>
          <div style={{ minWidth: totalDays * dayWidth, position: 'relative' }}>
            {/* Date header */}
            <div style={{ display: 'flex', height: HEADER_HEIGHT, borderBottom: '1px solid var(--slate-200)', position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
              {dateHeaders.map((h, i) => (
                <div key={i} style={{
                  width: dayWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid var(--slate-100)',
                  background: h.isToday ? 'var(--brand-50)' : h.isWeekend ? 'var(--slate-50)' : 'white',
                  fontSize: 10, color: h.isToday ? 'var(--brand-600)' : 'var(--slate-500)',
                  fontWeight: h.isToday ? 700 : 500,
                }}>
                  {(h.isFirstOfMonth || i === 0) && <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{h.month}</span>}
                  <span>{h.day}</span>
                  <span style={{ fontSize: 9 }}>{h.weekday}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} style={{
                height: ROW_HEIGHT, position: 'relative',
                borderBottom: '1px solid var(--slate-100)',
                background: row.type === 'header' ? 'var(--slate-50)' : 'transparent',
              }}>
                {/* Weekend stripes */}
                {row.type === 'task' && dateHeaders.map((h, i) => (
                  h.isWeekend && <div key={i} style={{ position: 'absolute', left: i * dayWidth, top: 0, width: dayWidth, height: '100%', background: 'rgba(0,0,0,0.015)' }} />
                ))}

                {/* Task bar */}
                {row.type === 'task' && (() => {
                  const { left, width } = getBarProps(row.task)
                  const dept = getDeptStyle(row.task.department)
                  const isOverdue = row.task.due_date && new Date(row.task.due_date) < today && row.task.status !== 'complete'
                  const isComplete = row.task.status === 'complete'
                  const progress = row.task.estimated_hours > 0 ? Math.min((row.task.logged_hours || 0) / row.task.estimated_hours, 1) : 0

                  return (
                    <div
                      style={{
                        position: 'absolute', left, top: 8, height: ROW_HEIGHT - 16,
                        width: Math.max(width, 20), borderRadius: 6,
                        background: isComplete ? 'var(--success-100)' : dept.bg,
                        border: `1.5px solid ${isOverdue ? 'var(--danger-400)' : isComplete ? 'var(--success-400)' : dept.bar}`,
                        cursor: 'pointer', overflow: 'hidden',
                        display: 'flex', alignItems: 'center',
                        transition: 'box-shadow 150ms ease',
                      }}
                      onClick={() => onTaskClick && onTaskClick(row.task.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 2px 8px ${dept.bar}30`
                        setTooltip({
                          x: e.clientX, y: e.clientY,
                          task: row.task,
                        })
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none'
                        setTooltip(null)
                      }}
                    >
                      {/* Progress fill */}
                      {progress > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          width: `${progress * 100}%`,
                          background: isComplete ? 'var(--success-200)' : `${dept.bar}25`,
                          borderRadius: '4px 0 0 4px',
                        }} />
                      )}
                      {/* Label */}
                      {width > 60 && (
                        <span style={{
                          position: 'relative', zIndex: 1, paddingLeft: 8, fontSize: 11,
                          fontWeight: 600, color: isComplete ? 'var(--success-700)' : dept.text,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {isComplete ? '✓ ' : ''}{row.task.title}
                        </span>
                      )}
                      {/* Dependency indicator */}
                      {row.task.depends_on?.length > 0 && (
                        <div style={{
                          position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)',
                          width: 10, height: 10, borderRadius: '50%',
                          background: dept.bar, border: '2px solid white',
                        }} />
                      )}
                    </div>
                  )
                })()}
              </div>
            ))}

            {/* Today marker */}
            <div style={{
              position: 'absolute', left: todayOffset, top: 0, width: 2, height: totalHeight,
              background: 'var(--danger-500)', zIndex: 3, pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: -14, background: 'var(--danger-500)', color: 'white',
                fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
              }}>TODAY</div>
            </div>

            {/* Dependency arrows (SVG overlay) */}
            <svg style={{ position: 'absolute', top: HEADER_HEIGHT, left: 0, width: totalDays * dayWidth, height: rows.length * ROW_HEIGHT, pointerEvents: 'none', zIndex: 4 }}>
              {rows.map((row, rowIdx) => {
                if (row.type !== 'task' || !row.task.depends_on?.length) return null
                return row.task.depends_on.map(depId => {
                  const depTask = taskMap[depId]
                  if (!depTask) return null
                  const depRowIdx = getTaskRowIndex(depId)
                  if (depRowIdx === -1) return null

                  const depBar = getBarProps(depTask)
                  const taskBar = getBarProps(row.task)

                  const fromX = depBar.left + depBar.width
                  const fromY = depRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                  const toX = taskBar.left
                  const toY = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2
                  const midX = fromX + (toX - fromX) / 2

                  return (
                    <g key={`${row.task.id}-${depId}`}>
                      <path
                        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                        fill="none"
                        stroke="var(--slate-400)"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <polygon
                        points={`${toX},${toY - 4} ${toX + 7},${toY} ${toX},${toY + 4}`}
                        fill="var(--slate-400)"
                      />
                    </g>
                  )
                })
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 100,
          background: 'white', border: '1px solid var(--slate-200)', borderRadius: 8,
          padding: '10px 14px', boxShadow: 'var(--shadow-lg)', maxWidth: 280, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-900)', marginBottom: 4 }}>{tooltip.task.title}</div>
          <div style={{ fontSize: 12, color: 'var(--slate-500)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>{tooltip.task.users?.full_name || 'Unassigned'} · {tooltip.task.department || '—'}</span>
            <span>{tooltip.task.gantt_start_date ? formatDate(tooltip.task.gantt_start_date) : '—'} → {tooltip.task.due_date ? formatDate(tooltip.task.due_date) : '—'}</span>
            <span>{tooltip.task.logged_hours || 0}/{tooltip.task.estimated_hours || 0}h logged</span>
            {tooltip.task.depends_on?.length > 0 && <span style={{ color: 'var(--brand-600)', fontWeight: 600 }}>Has {tooltip.task.depends_on.length} dependency</span>}
            <span style={{ fontWeight: 600, color: tooltip.task.status === 'complete' ? 'var(--success-600)' : 'var(--slate-700)' }}>
              {tooltip.task.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}