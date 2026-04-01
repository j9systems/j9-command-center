import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Timer,
  CalendarDays,
  User,
  Search,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TimeLog, TeamMember, Option } from '@/types/database'

type TimeLogWithDetails = TimeLog & {
  team_member?: TeamMember | null
  status_option?: Option | null
  account?: { id: string; company_name: string | null } | null
  project?: { name: string | null } | null
}

const timeLogStatusColors: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-400',
  will_not_bill: 'bg-red-500/15 text-red-400',
  backlog: 'bg-amber-500/15 text-amber-400',
  retainer: 'bg-blue-500/15 text-blue-400',
}

export default function TimeLogsPage() {
  const [timeLogs, setTimeLogs] = useState<TimeLogWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<Option[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [accounts, setAccounts] = useState<{ id: string; company_name: string | null }[]>([])

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [logsRes, statusRes, teamRes, accountsRes] = await Promise.all([
        supabase
          .from('time_logs')
          .select('*, team(id, first_name, last_name, photo), options(id, option_key, option_label), projects(name)')
          .order('date', { ascending: false })
          .limit(500),
        supabase.from('options').select('*').eq('category', 'timelog_status'),
        supabase.from('team').select('id, first_name, last_name, photo').eq('active', 'true').order('first_name'),
        supabase.from('accounts').select('id, company_name').order('company_name'),
      ])

      // Build account lookup map (no FK from time_logs to accounts)
      const accountMap: Record<string, { id: string; company_name: string | null }> = {}
      if (accountsRes.data) {
        for (const a of accountsRes.data) {
          accountMap[a.id] = a as { id: string; company_name: string | null }
        }
      }

      if (logsRes.data) {
        setTimeLogs(
          logsRes.data.map((l) => ({
            ...l,
            team_member: l.team as unknown as TeamMember | null,
            status_option: l.options as unknown as Option | null,
            account: l.account_id ? accountMap[l.account_id] ?? null : null,
            project: l.projects as unknown as { name: string | null } | null,
            team: undefined,
            options: undefined,
            projects: undefined,
          })) as TimeLogWithDetails[]
        )
      }

      if (statusRes.data) setStatuses(statusRes.data as Option[])
      if (teamRes.data) setTeamMembers(teamRes.data as TeamMember[])
      if (accountsRes.data) setAccounts(accountsRes.data as { id: string; company_name: string | null }[])

      setLoading(false)
    }

    fetchData()
  }, [])

  const filtered = timeLogs.filter((l) => {
    if (filterStatus && l.status_option?.id?.toString() !== filterStatus) return false
    if (filterAssignee && l.assigned_to_id !== filterAssignee) return false
    if (filterClient && l.account_id !== filterClient) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (l.name ?? '').toLowerCase()
      const account = (l.account?.company_name ?? '').toLowerCase()
      const project = (l.project?.name ?? '').toLowerCase()
      if (!name.includes(q) && !account.includes(q) && !project.includes(q)) return false
    }
    return true
  })

  const hasFilters = filterStatus || filterAssignee || filterClient || searchQuery

  function clearFilters() {
    setFilterStatus('')
    setFilterAssignee('')
    setFilterClient('')
    setSearchQuery('')
  }

  function formatHours(hours: number | null): string {
    if (hours === null) return '—'
    return `${hours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Timer size={24} className="text-purple" />
          <h1 className="text-2xl font-bold text-text-primary">Time Logs</h1>
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Timer size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Time Logs</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search time logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id.toString()}>{s.option_label}</option>
          ))}
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
        >
          <option value="">All Assignees</option>
          {teamMembers.map((tm) => (
            <option key={tm.id} value={tm.id}>
              {[tm.first_name, tm.last_name].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
        >
          <option value="">All Clients</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.company_name ?? 'Unnamed'}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-text-secondary mb-3">
        {filtered.length} {filtered.length === 1 ? 'time log' : 'time logs'}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Timer size={48} className="mx-auto mb-4 text-text-secondary/30" />
          <p className="text-text-secondary text-sm">
            {hasFilters ? 'No time logs match your filters.' : 'No time logs found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => {
            const statusKey = log.status_option?.option_key?.toLowerCase() ?? ''
            const assigneeName = log.team_member
              ? [log.team_member.first_name, log.team_member.last_name].filter(Boolean).join(' ')
              : null

            return (
              <Link
                key={log.id}
                to={`/accounts/${log.account_id}/time-logs/${log.id}`}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-purple/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
                  <Timer size={18} className="text-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {log.name ?? 'Untitled Log'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {log.account?.company_name && (
                      <span className="text-xs text-text-secondary truncate">
                        {log.account.company_name}
                      </span>
                    )}
                    {log.project?.name && (
                      <span className="text-xs text-text-secondary truncate">
                        {log.project.name}
                      </span>
                    )}
                    {assigneeName && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <User size={10} />
                        {assigneeName}
                      </span>
                    )}
                    {log.date && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <CalendarDays size={10} />
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-semibold text-text-primary font-mono">
                    {formatHours(log.hours)}
                  </span>
                </div>
                {log.status_option && (
                  <span
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                      timeLogStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {log.status_option.option_label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
