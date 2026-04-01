import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Building2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Meeting } from '@/types/database'

type MeetingWithAccount = Meeting & {
  account?: { id: string; company_name: string | null } | null
}

const meetingStatusColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  tentative: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const meetingDotColors: Record<string, string> = {
  confirmed: 'bg-emerald-400',
  cancelled: 'bg-red-400',
  tentative: 'bg-amber-400',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatDateHeading(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function MeetingsPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['all-meetings'],
    queryFn: async () => {
      const [meetingsRes, accountsRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .order('meeting_start', { ascending: true }),
        supabase
          .from('accounts')
          .select('id, company_name'),
      ])

      if (!meetingsRes.data) return []

      const accountMap = new Map(
        (accountsRes.data ?? []).map((a) => [a.id, a])
      )

      return meetingsRes.data.map((m) => ({
        ...m,
        account: m.account_id ? accountMap.get(m.account_id) ?? null : null,
      })) as MeetingWithAccount[]
    },
  })

  // Calendar grid data
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month])
  const firstDayOfWeek = daysInMonth[0].getDay()
  const today = new Date()

  // Group meetings by date string for calendar lookups
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingWithAccount[]>()
    for (const m of meetings) {
      if (!m.meeting_start) continue
      const d = new Date(m.meeting_start)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [meetings])

  // Meetings in current month for agenda view
  const monthMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (!m.meeting_start) return false
      const d = new Date(m.meeting_start)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [meetings, year, month])

  // Group month meetings by day for agenda
  const agendaGroups = useMemo(() => {
    const groups: { date: string; meetings: MeetingWithAccount[] }[] = []
    const seen = new Map<string, MeetingWithAccount[]>()
    for (const m of monthMeetings) {
      const dateKey = new Date(m.meeting_start!).toDateString()
      if (!seen.has(dateKey)) {
        seen.set(dateKey, [])
      }
      seen.get(dateKey)!.push(m)
    }
    for (const [dateKey, mList] of seen) {
      groups.push({ date: dateKey, meetings: mList })
    }
    return groups
  }, [monthMeetings])

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function handleMeetingClick(meeting: MeetingWithAccount) {
    if (meeting.account_id) {
      navigate(`/accounts/${meeting.account_id}/meetings/${meeting.row_id}`)
    }
  }

  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays size={24} className="text-purple" />
          <h1 className="text-2xl font-bold text-text-primary">Meetings</h1>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Meetings</h1>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <h2 className="text-lg font-semibold text-text-primary ml-2">{monthLabel}</h2>
        </div>
        <button
          onClick={goToToday}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Desktop: Calendar Grid */}
      <div className="hidden md:block">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-semibold text-text-secondary uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 border-t border-l border-border">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-border bg-surface/30" />
          ))}

          {daysInMonth.map((day) => {
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            const dayMeetings = meetingsByDate.get(key) ?? []
            const isToday = isSameDay(day, today)

            return (
              <div
                key={key}
                className="min-h-[120px] border-r border-b border-border bg-surface/50 p-1.5 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-purple text-white'
                        : 'text-text-secondary'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayMeetings.slice(0, 3).map((m) => (
                    <button
                      key={m.row_id}
                      onClick={() => handleMeetingClick(m)}
                      className={`w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded truncate border transition-colors hover:opacity-80 ${
                        meetingStatusColors[m.status ?? ''] ?? 'bg-purple-muted text-purple border-purple/30'
                      } ${m.account_id ? 'cursor-pointer' : 'cursor-default'}`}
                      title={`${m.name ?? 'Untitled'}${m.meeting_start ? ' - ' + formatTime(m.meeting_start) : ''}`}
                    >
                      {m.meeting_start && (
                        <span className="font-semibold">{formatTime(m.meeting_start)} </span>
                      )}
                      {m.name ?? 'Untitled'}
                    </button>
                  ))}
                  {dayMeetings.length > 3 && (
                    <p className="text-[10px] text-text-secondary px-1.5">
                      +{dayMeetings.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: Agenda View */}
      <div className="md:hidden">
        {agendaGroups.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays size={48} className="mx-auto mb-4 text-text-secondary/30" />
            <p className="text-text-secondary text-sm">No meetings this month.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {agendaGroups.map((group) => {
              const groupDate = new Date(group.date)
              const isToday = isSameDay(groupDate, today)

              return (
                <div key={group.date}>
                  <div className="flex items-center gap-2 mb-2">
                    {isToday && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple text-white">
                        TODAY
                      </span>
                    )}
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {groupDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {group.meetings.map((m) => (
                      <button
                        key={m.row_id}
                        onClick={() => handleMeetingClick(m)}
                        className={`w-full text-left p-4 bg-surface rounded-xl border border-border hover:border-purple/20 transition-colors ${
                          m.account_id ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                meetingDotColors[m.status ?? ''] ?? 'bg-purple'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {m.name ?? 'Untitled Meeting'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              {m.meeting_start && (
                                <span className="text-xs text-text-secondary flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatTime(m.meeting_start)}
                                  {m.meeting_end && ` - ${formatTime(m.meeting_end)}`}
                                </span>
                              )}
                              {m.account?.company_name && (
                                <span className="text-xs text-text-secondary flex items-center gap-1">
                                  <Building2 size={10} />
                                  {m.account.company_name}
                                </span>
                              )}
                              {m.raw_attendees && m.raw_attendees.length > 0 && (
                                <span className="text-xs text-text-secondary flex items-center gap-1">
                                  <Users size={10} />
                                  {m.raw_attendees.length}
                                </span>
                              )}
                            </div>
                          </div>
                          {m.status && (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                meetingStatusColors[m.status]?.replace(/border-\S+/g, '') ?? 'bg-zinc-500/15 text-zinc-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
