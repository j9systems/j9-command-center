import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Project, Feature, Option } from '@/types/database'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Timeframe = 'week' | 'month' | 'quarter'

interface FeatureWithStatus extends Feature {
  status_option?: Option | null
}

interface ProjectWithFeatures extends Project {
  features: FeatureWithStatus[]
}

interface GanttRow {
  type: 'project' | 'feature'
  id: string
  name: string
  start: Date | null
  end: Date | null
  status: string | null
  projectId: string
  parentProjectId?: string
  followsId?: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const ROW_HEIGHT = 36
const LABEL_WIDTH = 220
const BAR_V_PAD = 6
const MIN_BAR_WIDTH = 12

const statusBarColors: Record<string, string> = {
  active: '#10b981',
  in_progress: '#f59e0b',
  completed: '#3b82f6',
  on_hold: '#f59e0b',
  cancelled: '#ef4444',
  open: '#3b82f6',
  planned: '#8b5cf6',
  not_started: '#6b7280',
}

function barColor(status: string | null): string {
  if (!status) return '#6b7280'
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return statusBarColors[key] ?? '#7C3AED'
}

const statusLabelColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-blue-500/15 text-blue-400',
  on_hold: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
  open: 'bg-blue-500/15 text-blue-400',
  planned: 'bg-purple-500/15 text-purple-400',
  not_started: 'bg-zinc-500/15 text-zinc-400',
}

function statusBadgeClass(status: string | null): string {
  if (!status) return 'bg-zinc-500/15 text-zinc-400'
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return statusLabelColors[key] ?? 'bg-purple-500/15 text-purple-400'
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday start
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}
function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
function clampDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function fmtDisplay(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function parseDate(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

/* ------------------------------------------------------------------ */
/*  Compute visible date range for the timeframe                      */
/* ------------------------------------------------------------------ */

function getRange(timeframe: Timeframe, offset: number): [Date, Date] {
  const now = new Date()
  if (timeframe === 'week') {
    const base = startOfWeek(now)
    const s = addDays(base, offset * 7)
    return [s, addDays(s, 6)]
  }
  if (timeframe === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return [startOfMonth(base), endOfMonth(base)]
  }
  // quarter
  const qMonth = Math.floor(now.getMonth() / 3) * 3
  const base = new Date(now.getFullYear(), qMonth + offset * 3, 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 3, 0)
  return [base, end]
}

function rangeLabel(timeframe: Timeframe, start: Date, end: Date): string {
  if (timeframe === 'week') {
    return `${fmtDisplay(start)} – ${fmtDisplay(end)}`
  }
  if (timeframe === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const q = Math.floor(start.getMonth() / 3) + 1
  return `Q${q} ${start.getFullYear()}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function GanttChart({
  projects,
  accountId,
}: {
  projects: Project[]
  accountId: string
}) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(600)

  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [offset, setOffset] = useState(0)

  const [projectsWithFeatures, setProjectsWithFeatures] = useState<ProjectWithFeatures[]>([])
  const [loading, setLoading] = useState(true)

  // Tooltip
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    row: GanttRow
  } | null>(null)

  // Drag state
  const dragRef = useRef<{
    rowId: string
    mode: 'left' | 'right' | 'move'
    startX: number
    origStart: Date
    origEnd: Date
    lastDStart: number
    lastDEnd: number
  } | null>(null)
  const [dragDelta, setDragDelta] = useState<{ id: string; dStart: number; dEnd: number } | null>(null)

  /* Fetch features for all projects */
  useEffect(() => {
    async function fetchFeatures() {
      setLoading(true)
      const projectIds = projects.map((p) => p.id)
      if (projectIds.length === 0) {
        setProjectsWithFeatures([])
        setLoading(false)
        return
      }

      const { data: featuresData } = await supabase
        .from('features')
        .select('*, options(id, option_key, option_label)')
        .in('project_id', projectIds)

      const featuresByProject: Record<string, FeatureWithStatus[]> = {}
      if (featuresData) {
        for (const f of featuresData) {
          const feat: FeatureWithStatus = {
            ...f,
            status_option: f.options as Option | null,
            options: undefined,
          } as FeatureWithStatus
          const pid = f.project_id!
          if (!featuresByProject[pid]) featuresByProject[pid] = []
          featuresByProject[pid].push(feat)
        }
      }

      setProjectsWithFeatures(
        projects.map((p) => ({
          ...p,
          features: featuresByProject[p.id] ?? [],
        }))
      )
      setLoading(false)
    }
    fetchFeatures()
  }, [projects])

  /* Measure container */
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setChartWidth(Math.max(containerRef.current.offsetWidth - LABEL_WIDTH - 32, 200))
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /* Date range */
  const [rangeStart, rangeEnd] = getRange(timeframe, offset)

  /* Check if a date range overlaps the visible range */
  function overlapsRange(start: Date | null, end: Date | null): boolean {
    if (!start || !end) return false
    return start <= rangeEnd && end >= rangeStart
  }

  /* Build rows — only include projects that have dates in range or features in range */
  const rows: GanttRow[] = []
  for (const proj of projectsWithFeatures) {
    const projStart = parseDate(proj.project_start)
    const projEnd = parseDate(proj.project_end)
    const projectInRange = overlapsRange(projStart, projEnd)

    const visibleFeatures = proj.features.filter((feat) =>
      overlapsRange(parseDate(feat.start_date), parseDate(feat.end_date))
    )

    if (!projectInRange && visibleFeatures.length === 0) continue

    rows.push({
      type: 'project',
      id: proj.id,
      name: proj.name ?? 'Unnamed Project',
      start: projStart,
      end: projEnd,
      status: proj.status,
      projectId: proj.id,
    })
    for (const feat of visibleFeatures) {
      rows.push({
        type: 'feature',
        id: feat.id,
        name: feat.name ?? 'Unnamed Feature',
        start: parseDate(feat.start_date),
        end: parseDate(feat.end_date),
        status: feat.status_option?.option_key ?? null,
        projectId: proj.id,
        parentProjectId: proj.id,
        followsId: feat.follows_id,
      })
    }
  }
  const totalDays = diffDays(rangeStart, rangeEnd) + 1
  const pxPerDay = chartWidth / totalDays

  /* Position a bar */
  function barPos(start: Date | null, end: Date | null, deltaStart = 0, deltaEnd = 0) {
    if (!start || !end) return null
    const s = addDays(start, deltaStart)
    const e = addDays(end, deltaEnd)
    const x = diffDays(rangeStart, s) * pxPerDay
    const w = (diffDays(s, e) + 1) * pxPerDay
    if (x + w < 0 || x > chartWidth) return null
    return {
      x: Math.max(x, 0),
      w: Math.min(Math.max(w - Math.max(-x, 0), MIN_BAR_WIDTH), chartWidth - Math.max(x, 0)),
    }
  }

  /* Column markers */
  const columns: { x: number; label: string; isToday?: boolean }[] = []
  const today = clampDate(new Date())
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(rangeStart, i)
    const isFirst = i === 0
    const isMonday = d.getDay() === 1
    const isFirstOfMonth = d.getDate() === 1

    if (timeframe === 'week' || (timeframe === 'month' && (isFirst || isMonday)) || (timeframe === 'quarter' && (isFirst || isFirstOfMonth))) {
      columns.push({
        x: i * pxPerDay,
        label:
          timeframe === 'quarter'
            ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        isToday: fmtDate(d) === fmtDate(today),
      })
    }
  }
  const todayX = diffDays(rangeStart, today) * pxPerDay

  /* Drag handlers */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, rowId: string, mode: 'left' | 'right' | 'move', start: Date, end: Date) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = { rowId, mode, startX: e.clientX, origStart: start, origEnd: end, lastDStart: 0, lastDEnd: 0 }
      setDragDelta({ id: rowId, dStart: 0, dEnd: 0 })
    },
    []
  )

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dDays = Math.round(dx / pxPerDay)
      const { mode, rowId } = dragRef.current
      let dStart = 0, dEnd = 0
      if (mode === 'left') {
        dStart = dDays
      } else if (mode === 'right') {
        dEnd = dDays
      } else {
        dStart = dDays
        dEnd = dDays
      }
      dragRef.current.lastDStart = dStart
      dragRef.current.lastDEnd = dEnd
      setDragDelta({ id: rowId, dStart, dEnd })
    }

    async function onMouseUp() {
      if (!dragRef.current) return
      const { rowId, origStart, origEnd, lastDStart, lastDEnd } = dragRef.current

      dragRef.current = null
      setDragDelta(null)

      if (lastDStart === 0 && lastDEnd === 0) return

      const newStart = addDays(origStart, lastDStart)
      const newEnd = addDays(origEnd, lastDEnd)

      // Don't allow start > end
      if (newStart > newEnd) return

      const row = rows.find((r) => r.id === rowId)
      if (!row) return

      if (row.type === 'project') {
        // Update project dates
        await supabase
          .from('projects')
          .update({ project_start: fmtDate(newStart), project_end: fmtDate(newEnd) })
          .eq('id', rowId)

        // Update local state
        setProjectsWithFeatures((prev) =>
          prev.map((p) =>
            p.id === rowId
              ? { ...p, project_start: fmtDate(newStart), project_end: fmtDate(newEnd) }
              : p
          )
        )
      } else {
        // Feature update
        await supabase
          .from('features')
          .update({ start_date: fmtDate(newStart), end_date: fmtDate(newEnd) })
          .eq('id', rowId)

        // Check if feature extends beyond parent project dates
        const parentProject = projectsWithFeatures.find((p) => p.id === row.projectId)
        if (parentProject) {
          const projStart = parseDate(parentProject.project_start)
          const projEnd = parseDate(parentProject.project_end)
          const updates: Record<string, string> = {}
          if (projStart && newStart < projStart) updates.project_start = fmtDate(newStart)
          if (projEnd && newEnd > projEnd) updates.project_end = fmtDate(newEnd)

          if (Object.keys(updates).length > 0) {
            await supabase.from('projects').update(updates).eq('id', row.projectId)
          }

          // Handle dependency cascading: push features that follow this one
          await cascadeDependencies(rowId, newEnd, row.projectId)

          // Refresh features
          const { data: freshFeatures } = await supabase
            .from('features')
            .select('*, options(id, option_key, option_label)')
            .eq('project_id', row.projectId)

          // Also refresh the project in case dates changed
          const { data: freshProject } = await supabase
            .from('projects')
            .select('*')
            .eq('id', row.projectId)
            .single()

          setProjectsWithFeatures((prev) =>
            prev.map((p) => {
              if (p.id !== row.projectId) return p
              return {
                ...(freshProject ?? p),
                features: freshFeatures
                  ? freshFeatures.map((f) => ({
                      ...f,
                      status_option: f.options as Option | null,
                      options: undefined,
                    })) as FeatureWithStatus[]
                  : p.features,
              } as ProjectWithFeatures
            })
          )
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [pxPerDay, rows, projectsWithFeatures])

  /* Cascade dependencies: if feature A precedes feature B, and A's end
     moves past B's start, push B so B.start = A.end, then recurse. */
  async function cascadeDependencies(changedFeatureId: string, newEnd: Date, projectId: string) {
    // Find features in this project that follow the changed feature
    const project = projectsWithFeatures.find((p) => p.id === projectId)
    if (!project) return

    const dependents = project.features.filter((f) => f.follows_id === changedFeatureId)
    for (const dep of dependents) {
      const depStart = parseDate(dep.start_date)
      const depEnd = parseDate(dep.end_date)
      if (!depStart || !depEnd) continue

      // If the predecessor's new end is past (or equal to) the dependent's start, push it
      if (newEnd >= depStart) {
        const duration = diffDays(depStart, depEnd)
        const newDepStart = addDays(newEnd, 1)
        const newDepEnd = addDays(newDepStart, duration)

        await supabase
          .from('features')
          .update({ start_date: fmtDate(newDepStart), end_date: fmtDate(newDepEnd) })
          .eq('id', dep.id)

        // Also check if this pushes the parent project end
        const projEnd = parseDate(project.project_end)
        if (projEnd && newDepEnd > projEnd) {
          await supabase
            .from('projects')
            .update({ project_end: fmtDate(newDepEnd) })
            .eq('id', projectId)
        }

        // Recurse for chain dependencies
        await cascadeDependencies(dep.id, newDepEnd, projectId)
      }
    }
  }

  /* Click handler */
  function handleBarClick(row: GanttRow) {
    if (row.type === 'project') {
      navigate(`/accounts/${accountId}/projects/${row.projectId}`)
    } else {
      navigate(`/accounts/${accountId}/projects/${row.projectId}/features/${row.id}`)
    }
  }

  /* Tooltip handlers */
  function handleBarMouseEnter(e: React.MouseEvent, row: GanttRow) {
    if (dragRef.current) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 8, row })
  }
  function handleBarMouseLeave() {
    if (!dragRef.current) setTooltip(null)
  }

  const svgHeight = rows.length * ROW_HEIGHT

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 mb-8">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-border rounded mb-4" />
          <div className="h-48 bg-border/50 rounded" />
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5 mb-8" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Project Timeline
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            &larr;
          </button>
          <span className="text-xs text-text-secondary min-w-[140px] text-center">
            {rangeLabel(timeframe, rangeStart, rangeEnd)}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            &rarr;
          </button>
          <div className="flex ml-2 border border-border rounded overflow-hidden">
            {(['week', 'month', 'quarter'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf)
                  setOffset(0)
                }}
                className={`text-[11px] px-2.5 py-1 font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-purple text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex overflow-x-auto relative select-none">
        {/* Labels column */}
        <div className="flex-shrink-0" style={{ width: LABEL_WIDTH }}>
          {rows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center gap-2 h-[${ROW_HEIGHT}px] truncate cursor-pointer hover:text-purple transition-colors`}
              style={{ height: ROW_HEIGHT, paddingLeft: row.type === 'feature' ? 20 : 0 }}
              onClick={() => handleBarClick(row)}
            >
              {row.type === 'project' ? (
                <span className="text-xs font-semibold text-text-primary truncate">
                  {row.name}
                </span>
              ) : (
                <span className="text-xs text-text-secondary truncate">{row.name}</span>
              )}
            </div>
          ))}
        </div>

        {/* SVG area */}
        <div className="flex-1 min-w-0 relative">
          <svg
            width={chartWidth}
            height={svgHeight}
            className="block"
            style={{ minWidth: chartWidth }}
          >
            {/* Grid columns */}
            {columns.map((col, i) => (
              <g key={i}>
                <line
                  x1={col.x}
                  y1={0}
                  x2={col.x}
                  y2={svgHeight}
                  stroke={col.isToday ? '#7C3AED' : '#222'}
                  strokeWidth={col.isToday ? 2 : 1}
                  strokeDasharray={col.isToday ? undefined : '2,2'}
                />
                <text
                  x={col.x + 4}
                  y={12}
                  fill={col.isToday ? '#7C3AED' : '#666'}
                  fontSize={10}
                >
                  {col.label}
                </text>
              </g>
            ))}

            {/* Today line */}
            {todayX >= 0 && todayX <= chartWidth && (
              <line
                x1={todayX}
                y1={0}
                x2={todayX}
                y2={svgHeight}
                stroke="#7C3AED"
                strokeWidth={2}
              />
            )}

            {/* Row separators */}
            {rows.map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={(i + 1) * ROW_HEIGHT}
                x2={chartWidth}
                y2={(i + 1) * ROW_HEIGHT}
                stroke="#1a1a1a"
                strokeWidth={1}
              />
            ))}

            {/* Bars */}
            {rows.map((row, i) => {
              const dd =
                dragDelta && dragDelta.id === row.id
                  ? { dStart: dragDelta.dStart, dEnd: dragDelta.dEnd }
                  : { dStart: 0, dEnd: 0 }
              const pos = barPos(row.start, row.end, dd.dStart, dd.dEnd)
              if (!pos) return null

              const y = i * ROW_HEIGHT + BAR_V_PAD
              const h = ROW_HEIGHT - BAR_V_PAD * 2
              const color = barColor(row.status)
              const isDragging = dragDelta?.id === row.id
              const isProject = row.type === 'project'

              return (
                <g key={row.id}>
                  {/* Bar body */}
                  <rect
                    x={pos.x}
                    y={y}
                    width={pos.w}
                    height={h}
                    rx={4}
                    fill={color}
                    opacity={isProject ? 0.6 : 0.85}
                    className="cursor-pointer"
                    onClick={() => !isDragging && handleBarClick(row)}
                    onMouseEnter={(e) => handleBarMouseEnter(e, row)}
                    onMouseLeave={handleBarMouseLeave}
                  />

                  {/* Bar name label (if wide enough) */}
                  {pos.w > 60 && (
                    <text
                      x={pos.x + 6}
                      y={y + h / 2 + 1}
                      fill="white"
                      fontSize={10}
                      fontWeight={isProject ? 600 : 400}
                      dominantBaseline="middle"
                      className="pointer-events-none"
                    >
                      {row.name.length > Math.floor(pos.w / 6)
                        ? row.name.slice(0, Math.floor(pos.w / 6) - 2) + '…'
                        : row.name}
                    </text>
                  )}

                  {/* Left drag handle */}
                  {row.start && row.end && (
                    <rect
                      x={pos.x}
                      y={y}
                      width={8}
                      height={h}
                      rx={4}
                      fill="transparent"
                      className="cursor-ew-resize"
                      onMouseDown={(e) =>
                        handleMouseDown(e, row.id, 'left', row.start!, row.end!)
                      }
                    />
                  )}

                  {/* Right drag handle */}
                  {row.start && row.end && (
                    <rect
                      x={pos.x + pos.w - 8}
                      y={y}
                      width={8}
                      height={h}
                      rx={4}
                      fill="transparent"
                      className="cursor-ew-resize"
                      onMouseDown={(e) =>
                        handleMouseDown(e, row.id, 'right', row.start!, row.end!)
                      }
                    />
                  )}

                  {/* Center drag area */}
                  {row.start && row.end && pos.w > 16 && (
                    <rect
                      x={pos.x + 8}
                      y={y}
                      width={Math.max(pos.w - 16, 0)}
                      height={h}
                      fill="transparent"
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) =>
                        handleMouseDown(e, row.id, 'move', row.start!, row.end!)
                      }
                      onClick={() => !isDragging && handleBarClick(row)}
                      onMouseEnter={(e) => handleBarMouseEnter(e, row)}
                      onMouseLeave={handleBarMouseLeave}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-black/90 border border-border rounded-lg px-3 py-2 shadow-lg"
          style={{
            left: Math.min(tooltip.x, (containerRef.current?.offsetWidth ?? 400) - 220),
            top: tooltip.y - 70,
          }}
        >
          <p className="text-xs font-semibold text-text-primary mb-1">{tooltip.row.name}</p>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadgeClass(tooltip.row.status)}`}
            >
              {tooltip.row.status?.replace(/_/g, ' ') ?? 'Unknown'}
            </span>
            <span className="text-[10px] text-text-secondary capitalize">{tooltip.row.type}</span>
          </div>
          {tooltip.row.start && tooltip.row.end && (
            <p className="text-[10px] text-text-secondary">
              {fmtDisplay(tooltip.row.start)} – {fmtDisplay(tooltip.row.end)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
