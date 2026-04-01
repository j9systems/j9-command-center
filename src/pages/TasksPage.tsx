import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  CalendarDays,
  User,
  Search,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember, Option } from '@/types/database'

type TaskWithDetails = Task & {
  assigned_to?: TeamMember | null
  status_option?: Option | null
  account?: { id: string; company_name: string | null } | null
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [taskStatuses, setTaskStatuses] = useState<Option[]>([])
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

      const [tasksRes, statusRes, teamRes, accountsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label), accounts!fk_tasks_account_id(id, company_name)')
          .order('due', { ascending: true, nullsFirst: false })
          .limit(500),
        supabase.from('options').select('*').eq('category', 'task_status'),
        supabase.from('team').select('id, first_name, last_name, photo').eq('active', 'true').order('first_name'),
        supabase.from('accounts').select('id, company_name').order('company_name'),
      ])

      if (tasksRes.data) {
        setTasks(
          tasksRes.data.map((t) => ({
            ...t,
            assigned_to: t.team as unknown as TeamMember | null,
            status_option: t.options as unknown as Option | null,
            account: t.accounts as unknown as { id: string; company_name: string | null } | null,
            team: undefined,
            options: undefined,
            accounts: undefined,
          })) as TaskWithDetails[]
        )
      }

      if (statusRes.data) setTaskStatuses(statusRes.data as Option[])
      if (teamRes.data) setTeamMembers(teamRes.data as TeamMember[])
      if (accountsRes.data) setAccounts(accountsRes.data as { id: string; company_name: string | null }[])

      setLoading(false)
    }

    fetchData()
  }, [])

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status_option?.id?.toString() !== filterStatus) return false
    if (filterAssignee && t.assigned_to_id_internal !== filterAssignee) return false
    if (filterClient && t.account_id !== filterClient) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (t.name ?? '').toLowerCase()
      const account = (t.account?.company_name ?? '').toLowerCase()
      if (!name.includes(q) && !account.includes(q)) return false
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

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList size={24} className="text-purple" />
          <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
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
        <ClipboardList size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Tasks</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search tasks..."
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
          {taskStatuses.map((s) => (
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
        {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={48} className="mx-auto mb-4 text-text-secondary/30" />
          <p className="text-text-secondary text-sm">
            {hasFilters ? 'No tasks match your filters.' : 'No tasks found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const statusKey = task.status_option?.option_key?.toLowerCase() ?? ''
            const assigneeName = task.assigned_to
              ? [task.assigned_to.first_name, task.assigned_to.last_name].filter(Boolean).join(' ')
              : null

            return (
              <Link
                key={task.row_id}
                to={`/accounts/${task.account_id}/tasks/${task.row_id}`}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-purple/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={18} className="text-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {task.name ?? 'Untitled Task'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    {task.account?.company_name && (
                      <span className="text-xs text-text-secondary truncate">
                        {task.account.company_name}
                      </span>
                    )}
                    {assigneeName && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <User size={10} />
                        {assigneeName}
                      </span>
                    )}
                    {task.due && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <CalendarDays size={10} />
                        {new Date(task.due).toLocaleDateString()}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-xs ${priorityColors[task.priority] ?? 'text-text-secondary'}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </div>
                {task.status_option && (
                  <span
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                      taskStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {task.status_option.option_label}
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
