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
const LABEL_WIDTH_DESKTOP = 220
const LABEL_WIDTH_MOBILE = 100
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
  // Handle ISO format "2026-03-26"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }
  // Handle US locale format "1/13/2026, 12:00:00 AM"
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Zoom / scroll helpers                                             */
/* ------------------------------------------------------------------ */

/** How many days the viewport spans at each zoom level */
function getSpanDays(timeframe: Timeframe): number {
  if (timeframe === 'week') return 7
  if (timeframe === 'month') return 30
  return 91 // quarter
}

/** How many days one scroll tick moves */
function getScrollStep(timeframe: Timeframe): number {
  if (timeframe === 'week') return 1
  if (timeframe === 'month') return 3
  return 7 // quarter
}

/* ------------------------------------------------------------------ */
/*  Compute visible date range for the timeframe                      */
/* ------------------------------------------------------------------ */

function getRange(timeframe: Timeframe, dayOffset: number): [Date, Date] {
  const now = new Date()
  let anchor: Date
  if (timeframe === 'week') {
    anchor = startOfWeek(now)
  } else if (timeframe === 'month') {
    anchor = startOfMonth(now)
  } else {
    const qMonth = Math.floor(now.getMonth() / 3) * 3
    anchor = new Date(now.getFullYear(), qMonth, 1)
  }
  const start = addDays(anchor, dayOffset)
  const span = getSpanDays(timeframe)
  return [start, addDays(start, span - 1)]
}

function rangeLabel(_timeframe: Timeframe, start: Date, end: Date): string {
  return `${fmtDisplay(start)} – ${fmtDisplay(end)}`
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
  const [isMobile, setIsMobile] = useState(false)
  const labelWidth = isMobile ? LABEL_WIDTH_MOBILE : LABEL_WIDTH_DESKTOP

  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const [offset, setOffset] = useState(0)

  const [projectsWithFeatures, setProjectsWithFeatures] = useState<ProjectWithFeatures[]>([])
  const [loading, setLoading] = useState(true)

  // Tooltip (uses viewport coordinates for fixed positioning)
  const [tooltip, setTooltip] = useState<{
    clientX: number
    clientY: number
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
  const didDragRef = useRef(false)
  const [dragDelta, setDragDelta] = useState<{ id: string; dStart: number; dEnd: number } | null>(null)

  // Pan state (drag on chart background to scroll)
  const panRef = useRef<{ startX: number; startOffset: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)

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
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (containerRef.current) {
        const lw = mobile ? LABEL_WIDTH_MOBILE : LABEL_WIDTH_DESKTOP
        setChartWidth(Math.max(containerRef.current.offsetWidth - lw - 32, 200))
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

  /* Compute effective project dates: use project's own dates, but fall back
     to min/max of feature dates when missing, and expand if any feature
     extends beyond the project's date range. */
  function effectiveProjectDates(
    proj: ProjectWithFeatures
  ): { start: Date | null; end: Date | null } {
    let start = parseDate(proj.project_start)
    let end = parseDate(proj.project_end)

    for (const feat of proj.features) {
      const fs = parseDate(feat.start_date)
      const fe = parseDate(feat.end_date)
      if (fs) start = start ? (fs < start ? fs : start) : fs
      if (fe) end = end ? (fe > end ? fe : end) : fe
    }

    return { start, end }
  }

  /* Build rows — include projects if their dates or any feature dates overlap the range.
     Once a project is visible, show ALL its features that have dates. */
  const rows: GanttRow[] = []
  for (const proj of projectsWithFeatures) {
    const { start: effStart, end: effEnd } = effectiveProjectDates(proj)
    const projectInRange = overlapsRange(effStart, effEnd)

    const featuresWithDates = proj.features.filter((feat) =>
      parseDate(feat.start_date) && parseDate(feat.end_date)
    )
    const anyFeatureInRange = featuresWithDates.some((feat) =>
      overlapsRange(parseDate(feat.start_date), parseDate(feat.end_date))
    )

    if (!projectInRange && !anyFeatureInRange) continue

    rows.push({
      type: 'project',
      id: proj.id,
      name: proj.name ?? 'Unnamed Project',
      start: effStart,
      end: effEnd,
      status: proj.status,
      projectId: proj.id,
    })
    for (const feat of featuresWithDates) {
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
      didDragRef.current = false
      setDragDelta({ id: rowId, dStart: 0, dEnd: 0 })
    },
    []
  )

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Handle background pan
      if (panRef.current) {
        const dx = e.clientX - panRef.current.startX
        const dDays = Math.round(dx / pxPerDay)
        if (dDays !== 0) {
          setOffset(panRef.current.startOffset - dDays)
          panRef.current.startX = e.clientX
          panRef.current.startOffset = panRef.current.startOffset - dDays
        }
        return
      }
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
      if (dStart !== 0 || dEnd !== 0) didDragRef.current = true
      dragRef.current.lastDStart = dStart
      dragRef.current.lastDEnd = dEnd
      setDragDelta({ id: rowId, dStart, dEnd })
    }

    async function onMouseUp() {
      if (panRef.current) {
        panRef.current = null
        setIsPanning(false)
        return
      }
      if (!dragRef.current) return
      const { rowId, origStart, origEnd, lastDStart, lastDEnd } = dragRef.current

      dragRef.current = null

      if (lastDStart === 0 && lastDEnd === 0) {
        setDragDelta(null)
        return
      }

      const newStart = addDays(origStart, lastDStart)
      const newEnd = addDays(origEnd, lastDEnd)

      // Don't allow start > end
      if (newStart > newEnd) {
        setDragDelta(null)
        return
      }

      const row = rows.find((r) => r.id === rowId)
      if (!row) {
        setDragDelta(null)
        return
      }

      if (row.type === 'project') {
        // Optimistically update local state BEFORE clearing drag delta
        setProjectsWithFeatures((prev) =>
          prev.map((p) =>
            p.id === rowId
              ? { ...p, project_start: fmtDate(newStart), project_end: fmtDate(newEnd) }
              : p
          )
        )
        setDragDelta(null)

        // Persist to database
        await supabase
          .from('projects')
          .update({ project_start: fmtDate(newStart), project_end: fmtDate(newEnd) })
          .eq('id', rowId)
      } else {
        // Optimistically update local state BEFORE clearing drag delta
        const parentProject = projectsWithFeatures.find((p) => p.id === row.projectId)
        setProjectsWithFeatures((prev) =>
          prev.map((p) => {
            if (p.id !== row.projectId) return p
            const updatedFeatures = p.features.map((f) =>
              f.id === rowId
                ? { ...f, start_date: fmtDate(newStart), end_date: fmtDate(newEnd) }
                : f
            )
            // Also expand parent project dates if feature extends beyond them
            const projStart = parseDate(p.project_start)
            const projEnd = parseDate(p.project_end)
            const newProjStart = projStart && newStart < projStart ? fmtDate(newStart) : p.project_start
            const newProjEnd = projEnd && newEnd > projEnd ? fmtDate(newEnd) : p.project_end
            return { ...p, project_start: newProjStart, project_end: newProjEnd, features: updatedFeatures }
          })
        )
        setDragDelta(null)

        // Persist feature update to database
        await supabase
          .from('features')
          .update({ start_date: fmtDate(newStart), end_date: fmtDate(newEnd) })
          .eq('id', rowId)

        // Check if feature extends beyond parent project dates
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

          // Refresh features to pick up cascaded dependency changes
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

    function onTouchMove(e: TouchEvent) {
      if (panRef.current && e.touches.length === 1) {
        e.preventDefault()
        const dx = e.touches[0].clientX - panRef.current.startX
        const dDays = Math.round(dx / pxPerDay)
        if (dDays !== 0) {
          setOffset(panRef.current.startOffset - dDays)
          panRef.current.startX = e.touches[0].clientX
          panRef.current.startOffset = panRef.current.startOffset - dDays
        }
      }
    }

    function onTouchEnd() {
      if (panRef.current) {
        panRef.current = null
        setIsPanning(false)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
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
    setTooltip({ clientX: e.clientX, clientY: e.clientY, row })
  }
  function handleBarMouseMove(e: React.MouseEvent) {
    if (!tooltip || dragRef.current) return
    setTooltip((prev) => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null)
  }
  function handleBarMouseLeave() {
    if (!dragRef.current) setTooltip(null)
  }

  const svgHeight = rows.length * ROW_HEIGHT

  /* Wheel handler — scroll horizontally to pan through time */
  const wheelRef = useRef<HTMLDivElement>(null)
  const timeframeRef = useRef(timeframe)
  timeframeRef.current = timeframe
  const scrollAccum = useRef(0)
  useEffect(() => {
    const el = wheelRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      if (dragRef.current || panRef.current) return
      // Horizontal swipe, shift+scroll, or plain vertical scroll all pan the chart
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const dx = isHorizontal ? e.deltaX : (e.shiftKey ? (e.deltaX || e.deltaY) : e.deltaY)
      if (Math.abs(dx) < 2) return
      e.preventDefault()
      const step = getScrollStep(timeframeRef.current)
      // Accumulate delta and only step when threshold is reached
      const threshold = step === 1 ? 60 : step === 3 ? 80 : 120
      scrollAccum.current += dx
      if (Math.abs(scrollAccum.current) >= threshold) {
        const steps = Math.sign(scrollAccum.current) * Math.max(1, Math.floor(Math.abs(scrollAccum.current) / threshold))
        setOffset((o) => o + steps * step)
        scrollAccum.current = scrollAccum.current % threshold
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [loading])

  /* Whether today is in the current view */
  const todayInView = today >= rangeStart && today <= rangeEnd

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

  return (
    <div className="bg-surface rounded-xl border border-border p-3 sm:p-5 mb-8 overflow-hidden" ref={containerRef}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Project Timeline
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setOffset((o) => o - getSpanDays(timeframe))}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            &larr;
          </button>
          <span className="text-xs text-text-secondary min-w-[180px] text-center">
            {rangeLabel(timeframe, rangeStart, rangeEnd)}
          </span>
          <button
            onClick={() => setOffset((o) => o + getSpanDays(timeframe))}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            &rarr;
          </button>
          {!todayInView && (
            <button
              onClick={() => {
                // Center today in the visible range
                const now = new Date()
                let anchor: Date
                if (timeframe === 'week') anchor = startOfWeek(now)
                else if (timeframe === 'month') anchor = startOfMonth(now)
                else {
                  const qMonth = Math.floor(now.getMonth() / 3) * 3
                  anchor = new Date(now.getFullYear(), qMonth, 1)
                }
                const todayFromAnchor = diffDays(anchor, today)
                const halfSpan = Math.floor(getSpanDays(timeframe) / 2)
                setOffset(todayFromAnchor - halfSpan)
              }}
              className="text-[11px] px-2.5 py-1 font-medium rounded border border-purple/30 text-purple hover:bg-purple/10 transition-colors"
            >
              Today
            </button>
          )}
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
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-secondary">No active projects for the selected range.</p>
        </div>
      ) : (
      <div ref={wheelRef} className="flex overflow-hidden relative select-none max-w-full">
        {/* Labels column */}
        <div className="flex-shrink-0 overflow-hidden" style={{ width: labelWidth }}>
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
            style={{ minWidth: chartWidth, cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => {
              // Only start pan if clicking on the SVG background (not on a bar)
              if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'line' || (e.target as Element).tagName === 'text') {
                e.preventDefault()
                panRef.current = { startX: e.clientX, startOffset: offset }
                setIsPanning(true)
              }
            }}
            onTouchStart={(e) => {
              if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'line' || (e.target as Element).tagName === 'text') {
                panRef.current = { startX: e.touches[0].clientX, startOffset: offset }
                setIsPanning(true)
              }
            }}
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
                    onClick={() => !didDragRef.current && handleBarClick(row)}
                    onMouseEnter={(e) => handleBarMouseEnter(e, row)}
                    onMouseMove={handleBarMouseMove}
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
                      onClick={() => !didDragRef.current && handleBarClick(row)}
                      onMouseEnter={(e) => handleBarMouseEnter(e, row)}
                      onMouseMove={handleBarMouseMove}
                      onMouseLeave={handleBarMouseLeave}
                    />
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      )}

      {/* Tooltip — fixed position at mouse cursor */}
      {tooltip && (() => {
        const tooltipWidth = 200
        // Position to the right of cursor; flip left if it would overflow viewport
        let leftPos = tooltip.clientX + 12
        if (leftPos + tooltipWidth > window.innerWidth - 8) {
          leftPos = tooltip.clientX - tooltipWidth - 12
        }
        // Position above cursor
        const topPos = tooltip.clientY - 80
        return (
          <div
            className="fixed z-50 pointer-events-none bg-black/90 border border-border rounded-lg px-3 py-2 shadow-lg"
            style={{
              left: leftPos,
              top: Math.max(4, topPos),
              width: tooltipWidth,
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
        )
      })()}
    </div>
  )
}
