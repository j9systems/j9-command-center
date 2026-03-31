import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Coffee,
  Play,
  Square,
  ChevronUp,
  ChevronDown,
  X,
  Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useActiveTimeLog } from '@/hooks/useActiveTimeLog'
import { calculateNetSeconds, calculateNetHours, formatElapsed } from '@/utils/timeLogHelpers'

export default function ActiveTimeLogWidget() {
  const { activeLog, refresh, setActiveLog } = useActiveTimeLog()
  const [expanded, setExpanded] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [showEndPanel, setShowEndPanel] = useState(false)
  const [endTime, setEndTime] = useState('')
  const [endDescription, setEndDescription] = useState('')
  const [ending, setEnding] = useState(false)

  // Break time override
  const [showBreakTimeOverride, setShowBreakTimeOverride] = useState(false)
  const [breakTimeOverride, setBreakTimeOverride] = useState('')
  const [breakLoading, setBreakLoading] = useState(false)

  // Tick every second
  useEffect(() => {
    if (!activeLog?.log.start_date_time) return
    const tick = () => setElapsed(calculateNetSeconds(activeLog.log.start_date_time!, activeLog.breaks))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeLog?.log.start_date_time, activeLog?.breaks])

  if (!activeLog) return null

  const activeBreak = activeLog.breaks.find((b) => !b.break_end)
  const isOnBreak = !!activeBreak
  const statusColor = isOnBreak ? '#FFB547' : '#01B574'
  const statusLabel = isOnBreak ? 'On Break' : 'Working'

  async function handleStartBreak() {
    setBreakLoading(true)
    const breakStart = showBreakTimeOverride && breakTimeOverride
      ? new Date(breakTimeOverride).toISOString()
      : new Date().toISOString()

    await supabase.from('time_log_breaks').insert({
      time_log_id: activeLog!.log.id,
      break_start: breakStart,
    })
    setShowBreakTimeOverride(false)
    setBreakTimeOverride('')
    await refresh()
    setBreakLoading(false)
  }

  async function handleEndBreak() {
    if (!activeBreak) return
    setBreakLoading(true)
    const breakEnd = showBreakTimeOverride && breakTimeOverride
      ? new Date(breakTimeOverride).toISOString()
      : new Date().toISOString()

    await supabase
      .from('time_log_breaks')
      .update({ break_end: breakEnd })
      .eq('id', activeBreak.id)
    setShowBreakTimeOverride(false)
    setBreakTimeOverride('')
    await refresh()
    setBreakLoading(false)
  }

  function openEndPanel() {
    setEndTime(formatDateTimeLocal(new Date()))
    setEndDescription(activeLog!.log.name ?? '')
    setShowEndPanel(true)
  }

  async function handleEndLog() {
    setEnding(true)
    const endDt = endTime ? new Date(endTime).toISOString() : new Date().toISOString()

    // End any active break first
    if (activeBreak) {
      await supabase
        .from('time_log_breaks')
        .update({ break_end: endDt })
        .eq('id', activeBreak.id)
    }

    // Fetch final breaks
    const { data: finalBreaks } = await supabase
      .from('time_log_breaks')
      .select('*')
      .eq('time_log_id', activeLog!.log.id)

    const netHours = calculateNetHours(
      activeLog!.log.start_date_time!,
      endDt,
      finalBreaks ?? []
    )

    // Get backlog status id
    const { data: backlogOpt } = await supabase
      .from('options')
      .select('id')
      .eq('category', 'timelog_status')
      .eq('option_key', 'backlog')
      .maybeSingle()

    await supabase
      .from('time_logs')
      .update({
        end_date_time: endDt,
        hours: netHours,
        status_id: backlogOpt?.id ?? activeLog!.log.status_id,
        name: endDescription.trim() || activeLog!.log.name,
      })
      .eq('id', activeLog!.log.id)

    setActiveLog(null)
    setShowEndPanel(false)
    setEnding(false)
  }

  // Collapsed state — just timer + dot
  if (!expanded) {
    return createPortal(
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-24 md:bottom-6 right-4 z-[999] flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1a1a1a] border border-border shadow-lg shadow-black/40 hover:border-purple/30 transition-all"
      >
        <span
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-sm font-mono font-medium text-text-primary tabular-nums">
          {formatElapsed(elapsed)}
        </span>
        <ChevronUp size={14} className="text-text-secondary" />
      </button>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[999] w-80 rounded-xl bg-[#1a1a1a] border border-border shadow-2xl shadow-black/50 overflow-hidden widget-appear">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs font-medium" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-mono font-semibold text-text-primary tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          <button
            onClick={() => setExpanded(false)}
            className="ml-2 p-1 rounded hover:bg-border/50 transition-colors text-text-secondary"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-0.5">
        <p className="text-sm font-medium text-text-primary truncate">{activeLog.accountName}</p>
        <p className="text-xs text-text-secondary truncate">{activeLog.projectName}</p>
        {activeLog.taskName && (
          <p className="text-xs text-text-secondary/70 truncate">{activeLog.taskName}</p>
        )}
      </div>

      {/* Controls */}
      {!showEndPanel && (
        <div className="px-4 pb-3 space-y-2">
          {/* Break controls */}
          <div className="flex gap-2">
            {isOnBreak ? (
              <button
                onClick={handleEndBreak}
                disabled={breakLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'rgba(1, 181, 116, 0.15)', color: '#01B574' }}
              >
                <Play size={12} />
                Resume
              </button>
            ) : (
              <button
                onClick={handleStartBreak}
                disabled={breakLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'rgba(255, 181, 71, 0.15)', color: '#FFB547' }}
              >
                <Coffee size={12} />
                Break
              </button>
            )}
            <button
              onClick={openEndPanel}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 transition-colors hover:bg-red-500/25"
            >
              <Square size={12} />
              End Log
            </button>
          </div>

          {/* Time override toggle */}
          <div>
            <button
              onClick={() => {
                setShowBreakTimeOverride(!showBreakTimeOverride)
                if (!showBreakTimeOverride) {
                  setBreakTimeOverride(formatDateTimeLocal(new Date()))
                }
              }}
              className="text-[11px] text-text-secondary/60 hover:text-text-secondary transition-colors"
            >
              {showBreakTimeOverride ? 'Use current time' : 'Use different time'}
            </button>
            {showBreakTimeOverride && (
              <input
                type="datetime-local"
                value={breakTimeOverride}
                onChange={(e) => setBreakTimeOverride(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 bg-black/30 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-purple transition-colors"
              />
            )}
          </div>
        </div>
      )}

      {/* End Log Panel */}
      {showEndPanel && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">Description</p>
            <textarea
              value={endDescription}
              onChange={(e) => setEndDescription(e.target.value)}
              rows={2}
              placeholder="What did you work on?"
              className="w-full px-2 py-1.5 bg-black/30 border border-border rounded-lg text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple transition-colors resize-none"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-text-secondary mb-1">End Time</p>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2 py-1.5 bg-black/30 border border-border rounded-lg text-xs text-text-primary focus:outline-none focus:border-purple transition-colors"
            />
          </div>
          {endTime && activeLog.log.start_date_time && (
            <p className="text-xs text-text-secondary">
              Net hours:{' '}
              <span className="text-text-primary font-medium">
                {calculateNetHours(activeLog.log.start_date_time, new Date(endTime).toISOString(), activeLog.breaks).toFixed(2)}h
              </span>
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowEndPanel(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-border/50 text-text-secondary hover:bg-border transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={handleEndLog}
              disabled={ending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <Check size={12} />
              {ending ? 'Ending...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
