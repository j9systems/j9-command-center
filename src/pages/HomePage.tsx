import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  CalendarDays,
  ClipboardList,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Target,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Globe,
  Building2,
  Calendar,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, Meeting, TeamMember, Option, Lead } from '@/types/database'
import StartTimeLogModal from '@/components/timelog/StartTimeLogModal'

type LeadWithStatus = Lead & {
  status_option?: Option | null
}

const leadStatusColors: Record<string, string> = {
  lead: 'bg-blue-500/15 text-blue-400',
  booked: 'bg-emerald-500/15 text-emerald-400',
  callback_set: 'bg-amber-500/15 text-amber-400',
  closed: 'bg-purple-muted text-purple',
  networking: 'bg-cyan-500/15 text-cyan-400',
  no_show: 'bg-red-500/15 text-red-400',
  not_a_fit: 'bg-zinc-500/15 text-zinc-400',
  rejected: 'bg-red-500/15 text-red-400',
}

type TaskWithDetails = Task & {
  assigned_to?: TeamMember | null
  status_option?: Option | null
  account?: { id: string; company_name: string | null } | null
}

type MeetingWithAccount = Meeting & {
  account?: { id: string; company_name: string | null; logo_path?: string | null } | null
}

const taskStatusColors: Record<string, string> = {
  backlog: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-emerald-500/15 text-emerald-400',
}

const priorityColors: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-blue-400',
}

const TASKS_PER_PAGE = 4

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [taskPage, setTaskPage] = useState(0)
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const navigate = useNavigate()

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return { displayName: '', tasks: [] as TaskWithDetails[], meetings: [] as MeetingWithAccount[] }
      }

      // Get team member record for current user
      const { data: teamMember } = await supabase
        .from('team')
        .select('id, first_name, last_name, email')
        .eq('email', session.user.email!)
        .maybeSingle()

      const displayName = teamMember
        ? [teamMember.first_name, teamMember.last_name].filter(Boolean).join(' ') || teamMember.email || ''
        : ''

      let fetchedTasks: TaskWithDetails[] = []
      let fetchedMeetings: MeetingWithAccount[] = []

      // Fetch open tasks assigned to the user
      if (teamMember) {
        const { data: completeOption } = await supabase
          .from('options')
          .select('id')
          .eq('category', 'task_status')
          .eq('option_key', 'complete')
          .maybeSingle()

        let taskQuery = supabase
          .from('tasks')
          .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label), accounts!fk_tasks_account_id(id, company_name)')
          .eq('assigned_to_id_internal', teamMember.id)
          .order('due', { ascending: true, nullsFirst: false })
          .limit(20)

        if (completeOption) {
          taskQuery = taskQuery.neq('status_id', completeOption.id)
        }

        const { data: tasksData } = await taskQuery

        if (tasksData) {
          fetchedTasks = tasksData.map((t) => ({
            ...t,
            assigned_to: t.team as unknown as TeamMember | null,
            status_option: t.options as unknown as Option | null,
            account: t.accounts as unknown as { id: string; company_name: string | null } | null,
            team: undefined,
            options: undefined,
            accounts: undefined,
          })) as TaskWithDetails[]
        }
      }

      // Fetch upcoming meetings where user is an attendee or organizer
      if (teamMember) {
        const now = new Date().toISOString()

        const { data: attendeeRows } = await supabase
          .from('meeting_attendees')
          .select('meeting_id')
          .eq('internal_attendee_id', teamMember.id)

        const attendeeMeetingIds = (attendeeRows ?? []).map((r) => r.meeting_id).filter(Boolean) as string[]

        const organizerMeetingIds: string[] = []
        if (session.user.id) {
          const { data: organizerMeetings } = await supabase
            .from('meetings')
            .select('row_id')
            .eq('organizer_id', session.user.id)
            .gte('meeting_start', now)

          if (organizerMeetings) {
            organizerMeetings.forEach((m) => organizerMeetingIds.push(m.row_id))
          }
        }

        const allMeetingIds = [...new Set([...attendeeMeetingIds, ...organizerMeetingIds])]

        if (allMeetingIds.length > 0) {
          const { data: meetingsData } = await supabase
            .from('meetings')
            .select('*, accounts!meetings_account_id_fkey(id, company_name, logo_path)')
            .in('row_id', allMeetingIds)
            .gte('meeting_start', now)
            .order('meeting_start', { ascending: true })
            .limit(10)

          if (meetingsData) {
            fetchedMeetings = meetingsData.map((m) => ({
              ...m,
              account: m.accounts as unknown as { id: string; company_name: string | null; logo_path?: string | null } | null,
              accounts: undefined,
            })) as MeetingWithAccount[]
          }
        }
      }

      // Fetch kill list leads needing follow-up for ben@j9systems.com
      let killListLeads: LeadWithStatus[] = []
      const lastInteractionMap: Record<string, string> = {}

      if (session.user.email === 'ben@j9systems.com') {
        const [{ data: leadsData }, { data: interactionsData }] = await Promise.all([
          supabase
            .from('leads')
            .select('*, options!fk_leads_status_id(id, option_key, option_label)')
            .eq('kill_list', true)
            .order('submission_date', { ascending: false }),
          supabase
            .from('interactions')
            .select('lead_id, date, from_email, to_email, phone_from, phone_to')
            .not('date', 'is', null)
            .order('date', { ascending: false }),
        ])

        const allLeads: LeadWithStatus[] = leadsData
          ? leadsData.map((l) => ({
              ...l,
              status_option: l.options as unknown as Option | null,
              options: undefined,
            })) as LeadWithStatus[]
          : []

        const allInteractions = interactionsData ?? []

        for (const lead of allLeads) {
          const emailLower = lead.email?.toLowerCase() ?? null
          const phoneDigits = lead.phone?.replace(/\D/g, '') ?? null
          const phoneLast10 = phoneDigits ? phoneDigits.slice(-10) : null

          for (const interaction of allInteractions) {
            if (!interaction.date) continue
            let matched = false
            if (interaction.lead_id === lead.id) matched = true
            if (!matched && emailLower) {
              if (
                interaction.from_email?.toLowerCase() === emailLower ||
                interaction.to_email?.toLowerCase() === emailLower
              ) matched = true
            }
            if (!matched && phoneLast10) {
              const fromDigits = interaction.phone_from?.replace(/\D/g, '') ?? ''
              const toDigits = interaction.phone_to?.replace(/\D/g, '') ?? ''
              if (
                fromDigits.slice(-10) === phoneLast10 ||
                toDigits.slice(-10) === phoneLast10
              ) matched = true
            }
            if (matched) {
              lastInteractionMap[lead.id] = interaction.date
              break
            }
          }
        }

        // Filter to only those needing follow-up
        killListLeads = allLeads.filter((lead) => {
          const lastInteraction = lastInteractionMap[lead.id] ?? null
          if (!lastInteraction) return true
          const days = Math.floor((Date.now() - new Date(lastInteraction).getTime()) / 86400000)
          if (!lead.follow_up_on && days > 3) return true
          if (lead.follow_up_on && lastInteraction) {
            const followUpDate = new Date(lead.follow_up_on).getTime()
            const lastInteractionDate = new Date(lastInteraction).getTime()
            if (followUpDate < lastInteractionDate) return true
          }
          return false
        })
      }

      return { displayName, tasks: fetchedTasks, meetings: fetchedMeetings, killListLeads, lastInteractionMap, userEmail: session.user.email }
    },
  })

  const displayName = queryData?.displayName ?? ''
  const meetings = queryData?.meetings ?? []
  const killListLeads = queryData?.killListLeads ?? []
  const lastInteractionMap = queryData?.lastInteractionMap ?? {}
  const userEmail = queryData?.userEmail ?? ''

  useEffect(() => {
    if (queryData?.tasks) setTasks(queryData.tasks)
  }, [queryData])

  async function handleMarkTaskComplete(e: React.MouseEvent, taskId: string) {
    e.preventDefault()
    e.stopPropagation()
    setCompletingTaskId(taskId)

    const { data: completeOption } = await supabase
      .from('options')
      .select('id')
      .eq('category', 'task_status')
      .eq('option_key', 'complete')
      .maybeSingle()

    if (completeOption) {
      const { error } = await supabase
        .from('tasks')
        .update({ status_id: completeOption.id })
        .eq('row_id', taskId)

      if (!error) {
        setTasks((prev) => prev.filter((t) => t.row_id !== taskId))
      }
    }
    setCompletingTaskId(null)
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatLeadDate(dateStr: string | null): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  }

  function formatMeetingTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const date = formatDate(dateStr)
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return `${date} at ${time}`
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-border rounded mb-8" />
          <div className="h-64 bg-surface rounded-xl border border-border mb-6" />
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
        </h2>
        <button
          onClick={() => setShowTimerModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple hover:bg-purple-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Play size={14} />
          Start Timer
        </button>
      </div>

      <StartTimeLogModal open={showTimerModal} onClose={() => setShowTimerModal(false)} />

      {/* Open Tasks */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={14} />
            Your Open Tasks
          </h3>
          {tasks.length > TASKS_PER_PAGE && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTaskPage((p) => Math.max(0, p - 1))}
                disabled={taskPage === 0}
                className="p-1 rounded hover:bg-surface-hover transition-colors text-text-secondary disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-text-secondary tabular-nums">
                {taskPage + 1} / {Math.ceil(tasks.length / TASKS_PER_PAGE)}
              </span>
              <button
                onClick={() => setTaskPage((p) => Math.min(Math.ceil(tasks.length / TASKS_PER_PAGE) - 1, p + 1))}
                disabled={taskPage >= Math.ceil(tasks.length / TASKS_PER_PAGE) - 1}
                className="p-1 rounded hover:bg-surface-hover transition-colors text-text-secondary disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.slice(taskPage * TASKS_PER_PAGE, (taskPage + 1) * TASKS_PER_PAGE).map((task) => {
              const statusKey = task.status_option?.option_key?.toLowerCase() ?? ''
              return (
                <Link
                  key={task.row_id}
                  to={`/accounts/${task.account_id}/tasks/${task.row_id}`}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {task.name ?? 'Untitled Task'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      {task.status_option && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            taskStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                          }`}
                        >
                          {task.status_option.option_label}
                        </span>
                      )}
                      {task.account?.company_name && (
                        <span className="text-xs text-text-secondary truncate">
                          {task.account.company_name}
                        </span>
                      )}
                      {task.due && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <CalendarDays size={10} />
                          {formatDate(task.due)}
                        </span>
                      )}
                      {task.priority && (
                        <span className={`text-xs ${priorityColors[task.priority] ?? 'text-text-secondary'}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleMarkTaskComplete(e, task.row_id)}
                    disabled={completingTaskId === task.row_id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    title="Mark complete"
                  >
                    <CheckCircle2 size={14} />
                    <span className="hidden sm:inline">{completingTaskId === task.row_id ? '...' : 'Complete'}</span>
                  </button>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-4">
            No open tasks assigned to you.
          </p>
        )}
      </div>

      {/* Kill List — Needs Follow-Up (ben@j9systems.com only) */}
      {userEmail === 'ben@j9systems.com' && killListLeads.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Target size={14} className="text-red-400" />
              <span className="text-red-400">Kill List — Needs Follow-Up</span>
            </h3>
            <Link
              to="/leads"
              className="text-xs text-purple hover:text-purple-hover transition-colors"
            >
              View All Leads
            </Link>
          </div>
          <div className="space-y-2">
            {killListLeads.map((lead) => {
              const statusKey = lead.status_option?.option_key ?? ''
              const days = daysSince(lastInteractionMap[lead.id] ?? null)
              return (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="p-4 bg-black/20 rounded-lg border border-border/50 cursor-pointer hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-text-primary">
                          {lead.name ?? 'Unnamed Lead'}
                        </p>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          Kill List
                        </span>
                        {lead.status_option && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              leadStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                            }`}
                          >
                            {lead.status_option.option_label}
                          </span>
                        )}
                      </div>
                      {lead.business_name && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 size={11} className="text-text-secondary flex-shrink-0" />
                          <span className="text-xs text-text-secondary">{lead.business_name}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        {lead.email && (
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <Mail size={10} />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <Phone size={10} />
                            {lead.phone}
                          </span>
                        )}
                        {lead.website && (
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <Globe size={10} />
                            {lead.website}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        {lead.follow_up_on && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Calendar size={10} />
                            Follow-up {formatLeadDate(lead.follow_up_on)}
                          </span>
                        )}
                        <span className={`text-xs flex items-center gap-1 ${
                          days === null
                            ? 'text-zinc-500'
                            : days <= 7
                            ? 'text-emerald-400'
                            : days <= 30
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}>
                          <Clock size={10} />
                          {days !== null ? `${days}d since last interaction` : 'No interactions'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lead.phone && (
                        <>
                          <a
                            href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Call"
                          >
                            <PhoneCall size={14} />
                          </a>
                          <a
                            href={`sms:${lead.phone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Text"
                          >
                            <MessageSquare size={14} />
                          </a>
                        </>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-purple hover:bg-purple/10 transition-colors"
                          title="Email"
                        >
                          <Mail size={14} />
                        </a>
                      )}
                      {lead.interest_level != null && (
                        <div className="text-center ml-1">
                          <p className="text-[10px] text-text-secondary uppercase tracking-wider">Interest</p>
                          <p className="text-sm font-semibold text-text-primary">{lead.interest_level}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <CalendarDays size={14} />
          Upcoming Meetings
        </h3>
        {meetings.length > 0 ? (
          <div className="space-y-2">
            {meetings.map((meeting) => (
              <Link
                key={meeting.row_id}
                to={`/accounts/${meeting.account_id}/meetings/${meeting.row_id}`}
                className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {meeting.account?.logo_path ? (
                    <img src={meeting.account.logo_path} alt={meeting.account.company_name ?? ''} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <CalendarDays size={14} className="text-purple" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {meeting.name ?? 'Untitled Meeting'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {meeting.meeting_start && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Clock size={10} />
                        {formatMeetingTime(meeting.meeting_start)}
                      </span>
                    )}
                    {meeting.account?.company_name && (
                      <span className="text-xs text-text-secondary truncate">
                        {meeting.account.company_name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-4">
            No upcoming meetings.
          </p>
        )}
      </div>
    </div>
  )
}
