import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Timer,
  CalendarDays,
  FolderKanban,
  User,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TimeLog, TeamMember, Option } from '@/types/database'

const timeLogStatusColors: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-400',
  will_not_bill: 'bg-red-500/15 text-red-400',
  backlog: 'bg-amber-500/15 text-amber-400',
  retainer: 'bg-blue-500/15 text-blue-400',
}

type TimeLogWithDetails = TimeLog & {
  team_member?: TeamMember | null
  project?: { name: string | null } | null
  status_option?: Option | null
}

export default function TimeLogDetailPage() {
  const { id: accountId, timeLogId } = useParams<{ id: string; timeLogId: string }>()
  const navigate = useNavigate()
  const [timeLog, setTimeLog] = useState<TimeLogWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [currentTeamMemberId, setCurrentTeamMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (!timeLogId) return

    async function fetchData() {
      setLoading(true)

      // Resolve current user's team member ID
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: teamData } = await supabase
          .from('team')
          .select('id')
          .eq('email', user.email)
          .single()
        if (teamData) setCurrentTeamMemberId(teamData.id)
      }

      const { data } = await supabase
        .from('time_logs')
        .select('*, team(id, first_name, last_name, photo), projects(name), options(id, option_key, option_label)')
        .eq('id', timeLogId!)
        .single()

      if (data) {
        setTimeLog({
          ...data,
          team_member: data.team as TeamMember | null,
          project: data.projects as { name: string | null } | null,
          status_option: data.options as Option | null,
          team: undefined,
          projects: undefined,
          options: undefined,
        } as TimeLogWithDetails)
      }

      setLoading(false)
    }

    fetchData()
  }, [timeLogId])

  async function handleDelete() {
    if (!timeLogId || !timeLog) return
    setDeleting(true)

    const { error } = await supabase
      .from('time_logs')
      .delete()
      .eq('id', timeLogId)

    if (!error) {
      navigate(`/accounts/${accountId}`, { replace: true })
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-border rounded mb-6" />
          <div className="h-8 w-64 bg-border rounded mb-4" />
          <div className="h-48 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!timeLog) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link
          to={`/accounts/${accountId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Account
        </Link>
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">Time log not found.</p>
        </div>
      </div>
    )
  }

  const statusKey = timeLog.status_option?.option_key ?? ''
  const memberName = timeLog.team_member
    ? [timeLog.team_member.first_name, timeLog.team_member.last_name].filter(Boolean).join(' ')
    : null
  const isOwnLog = currentTeamMemberId != null && timeLog.assigned_to_id === currentTeamMemberId

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${accountId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Account
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <Timer size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-bold text-text-primary break-words">
              {timeLog.name ?? 'No description'}
            </h1>
            {timeLog.status_option && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full self-start ${
                  timeLogStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                }`}
              >
                {timeLog.status_option.option_label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            <span className="text-lg font-semibold text-purple">
              {timeLog.hours?.toFixed(1) ?? '0.0'}h
            </span>
            {timeLog.date && (
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <CalendarDays size={13} />
                {new Date(timeLog.date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {isOwnLog && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <Trash2 size={12} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      {/* Details */}
      <div className="space-y-6">
        {/* Team member card */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Logged By
          </h3>
          {timeLog.team_member ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                {timeLog.team_member.photo ? (
                  <img
                    src={timeLog.team_member.photo}
                    alt={memberName ?? ''}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-purple" />
                )}
              </div>
              <p className="text-sm font-medium text-text-primary">{memberName}</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Unknown</p>
          )}
        </div>

        {/* Project */}
        {timeLog.project?.name && (
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Project
            </h3>
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-text-secondary" />
              <p className="text-sm font-medium text-text-primary">{timeLog.project.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
