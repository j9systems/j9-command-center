import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Users,
  CheckCircle2,
  Clock,
  CalendarDays,
  FolderKanban,
  Timer,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type {
  AccountWithStatus,
  AccountRole,
  Contact,
  Option,
  Project,
  Task,
  TimeLog,
  TeamMember,
} from '@/types/database'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
  lead: 'bg-amber-500/15 text-amber-400',
  prospect: 'bg-blue-500/15 text-blue-400',
  churned: 'bg-red-500/15 text-red-400',
}

function getStatusColor(key: string | null): string {
  if (!key) return 'bg-zinc-500/15 text-zinc-400'
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(statusColors)) {
    if (lower.includes(k)) return v
  }
  return 'bg-purple-muted text-purple'
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const projectStatusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-blue-500/15 text-blue-400',
  on_hold: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

function getProjectStatusColor(status: string | null): string {
  if (!status) return 'bg-zinc-500/15 text-zinc-400'
  return projectStatusColors[status.toLowerCase()] ?? 'bg-purple-muted text-purple'
}

const taskStatusColors: Record<string, string> = {
  open: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  closed: 'bg-zinc-500/15 text-zinc-400',
}

function getTaskStatusColor(status: string | null): string {
  if (!status) return 'bg-zinc-500/15 text-zinc-400'
  return taskStatusColors[status.toLowerCase()] ?? 'bg-purple-muted text-purple'
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<AccountWithStatus | null>(null)
  const [primaryContact, setPrimaryContact] = useState<Contact | null>(null)
  const [tasks, setTasks] = useState<(Task & { assigned_to?: TeamMember | null })[]>([])
  const [projects, setProjects] = useState<(Project & { project_manager?: TeamMember | null; logged_hours: number })[]>([])
  const [timeLogs, setTimeLogs] = useState<(TimeLog & { team_member?: TeamMember | null; project?: { name: string | null } | null; status_option?: Option | null })[]>([])
  const [timeLogStatuses, setTimeLogStatuses] = useState<Option[]>([])
  const [accountTeamMembers, setAccountTeamMembers] = useState<{ id: string; team_member: TeamMember | null; role: AccountRole | null; expected_weekly_hrs: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'projects' | 'time_logs' | 'team'>('projects')

  useEffect(() => {
    if (!id) return

    async function fetchData() {
      setLoading(true)

      // Fetch account
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*, options!fk_accounts_status(option_key, option_label)')
        .eq('id', id!)
        .single()

      if (accountData) {
        const opt = accountData.options as { option_key: string; option_label: string } | null
        setAccount({
          ...accountData,
          status_label: opt?.option_label ?? null,
          status_key: opt?.option_key ?? null,
          options: undefined,
        } as AccountWithStatus)
      }

      // Fetch primary contact
      const { data: contactLinks } = await supabase
        .from('account_contacts')
        .select('contact_id, is_primary')
        .eq('account_id', id!)
        .eq('is_primary', 'true')
        .limit(1)

      if (contactLinks && contactLinks.length > 0) {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', contactLinks[0].contact_id!)
          .single()

        if (contactData) setPrimaryContact(contactData)
      }

      // Fetch open tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, team_members!tasks_assigned_to_id_fkey(first_name, last_name)')
        .eq('account_id', id!)
        .neq('status', 'completed')
        .neq('status', 'closed')
        .order('due_date', { ascending: true })

      if (tasksData) {
        setTasks(
          tasksData.map((t) => ({
            ...t,
            assigned_to: t.team_members as TeamMember | null,
            team_members: undefined,
          })) as (Task & { assigned_to?: TeamMember | null })[]
        )
      }

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, team(first_name, last_name)')
        .eq('account_id', id!)

      // Fetch time log hours grouped by project
      const { data: projectHoursData } = await supabase
        .from('time_logs')
        .select('project_id, hours')
        .eq('account_id', id!)

      const hoursByProject: Record<string, number> = {}
      if (projectHoursData) {
        for (const tl of projectHoursData) {
          if (tl.project_id) {
            hoursByProject[tl.project_id] = (hoursByProject[tl.project_id] ?? 0) + (tl.hours ?? 0)
          }
        }
      }

      if (projectsData) {
        setProjects(
          projectsData.map((p) => ({
            ...p,
            project_manager: p.team as TeamMember | null,
            logged_hours: hoursByProject[p.id] ?? 0,
            team: undefined,
          })) as (Project & { project_manager?: TeamMember | null; logged_hours: number })[]
        )
      }

      // Fetch timelog status options
      const { data: statusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'timelog_status')

      if (statusOptions) {
        setTimeLogStatuses(statusOptions as Option[])
      }

      // Fetch time logs with status option
      const { data: timeLogsData } = await supabase
        .from('time_logs')
        .select('*, team(first_name, last_name), projects(name), options(id, option_key, option_label)')
        .eq('account_id', id!)
        .order('date', { ascending: false })
        .limit(50)

      if (timeLogsData) {
        setTimeLogs(
          timeLogsData.map((tl) => ({
            ...tl,
            team_member: tl.team as TeamMember | null,
            project: tl.projects as { name: string | null } | null,
            status_option: tl.options as Option | null,
            team: undefined,
            projects: undefined,
            options: undefined,
          })) as (TimeLog & { team_member?: TeamMember | null; project?: { name: string | null } | null; status_option?: Option | null })[]
        )
      }

      // Fetch account team members with roles
      const { data: accountTeamData } = await supabase
        .from('account_team')
        .select('id, expected_weekly_hrs, team(id, first_name, last_name, email, photo, role), account_roles(id, name)')
        .eq('account_id', id!)

      if (accountTeamData) {
        setAccountTeamMembers(
          accountTeamData.map((at) => ({
            id: at.id,
            team_member: at.team as unknown as TeamMember | null,
            role: at.account_roles as unknown as AccountRole | null,
            expected_weekly_hrs: at.expected_weekly_hrs,
          }))
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-border rounded mb-6" />
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl bg-border" />
            <div>
              <div className="h-6 w-48 bg-border rounded mb-2" />
              <div className="h-4 w-32 bg-border rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="h-40 bg-surface rounded-xl border border-border" />
            <div className="h-40 bg-surface rounded-xl border border-border" />
          </div>
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Accounts
        </Link>
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">Account not found.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { key: 'time_logs' as const, label: 'Time Logs', icon: Timer },
    { key: 'team' as const, label: 'Team', icon: Users },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Accounts
      </Link>

      {/* Account header */}
      <div className="flex items-center gap-4 mb-8">
        {account.logo_path ? (
          <img
            src={account.logo_path}
            alt={account.company_name ?? 'Account logo'}
            className="w-16 h-16 rounded-xl object-cover bg-black flex-shrink-0"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              target.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div
          className={`w-16 h-16 rounded-xl bg-purple-muted flex items-center justify-center text-purple text-lg font-semibold flex-shrink-0 ${account.logo_path ? 'hidden' : ''}`}
        >
          {getInitials(account.company_name)}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary truncate">
            {account.company_name ?? 'Unnamed Account'}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {account.type && (
              <span className="text-sm text-text-secondary capitalize">{account.type}</span>
            )}
            {account.type && account.status_label && (
              <span className="text-text-secondary/30">|</span>
            )}
            {account.status_label && (
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(account.status_key)}`}
              >
                {account.status_label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Contact & Open Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Primary Contact Card */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Primary Contact
          </h3>
          {primaryContact ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-purple" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {[primaryContact.first_name, primaryContact.last_name]
                      .filter(Boolean)
                      .join(' ') || 'Unnamed Contact'}
                  </p>
                  {primaryContact.company_name && (
                    <p className="text-xs text-text-secondary truncate">
                      {primaryContact.company_name}
                    </p>
                  )}
                </div>
              </div>
              {primaryContact.email && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Mail size={14} className="flex-shrink-0" />
                  <span className="truncate">{primaryContact.email}</span>
                </div>
              )}
              {primaryContact.phone && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Phone size={14} className="flex-shrink-0" />
                  <span>{primaryContact.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No primary contact assigned.</p>
          )}
        </div>

        {/* Open Tasks Card */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Open Tasks
          </h3>
          {tasks.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-text-secondary mt-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary truncate">
                      {task.title ?? 'Untitled Task'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.status && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getTaskStatusColor(task.status)}`}
                        >
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-text-secondary flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No open tasks.</p>
          )}
        </div>
      </div>

      {/* Tabbed Container */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'projects' && (
            <ProjectsTab projects={projects} accountId={id!} />
          )}
          {activeTab === 'time_logs' && (
            <TimeLogsTab
              timeLogs={timeLogs}
              statuses={timeLogStatuses}
              onStatusUpdate={(logId, statusId) => {
                setTimeLogs((prev) =>
                  prev.map((tl) =>
                    tl.id === logId
                      ? { ...tl, status_id: statusId, status_option: timeLogStatuses.find((s) => s.id === statusId) ?? null }
                      : tl
                  )
                )
              }}
            />
          )}
          {activeTab === 'team' && (
            <AccountTeamTab members={accountTeamMembers} />
          )}
        </div>
      </div>
    </div>
  )
}

const statusOrder: Record<string, number> = {
  active: 0,
  on_hold: 1,
  completed: 2,
  cancelled: 3,
}

const statusGroupLabels: Record<string, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function ProjectsTab({
  projects,
  accountId,
}: {
  projects: (Project & { project_manager?: TeamMember | null; logged_hours: number })[]
  accountId: string
}) {
  const navigate = useNavigate()
  if (projects.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No projects found for this account.
      </p>
    )
  }

  // Group projects by status
  const grouped = projects.reduce<Record<string, typeof projects>>((acc, project) => {
    const key = project.status?.toLowerCase() ?? 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(project)
    return acc
  }, {})

  // Sort groups: active first, then on_hold, completed, cancelled, then any unknown
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const orderA = statusOrder[a] ?? 99
    const orderB = statusOrder[b] ?? 99
    return orderA - orderB
  })

  return (
    <div className="space-y-6">
      {sortedGroups.map(([status, groupProjects]) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getProjectStatusColor(status)}`}
            >
              {statusGroupLabels[status] ?? status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-text-secondary">
              {groupProjects.length} {groupProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          <div className="space-y-3">
            {groupProjects.map((project) => {
              const estimated = project.estimated_hours_to_complete
                ? parseFloat(project.estimated_hours_to_complete)
                : null
              const pct = estimated && estimated > 0
                ? Math.min(Math.round((project.logged_hours / estimated) * 100), 100)
                : null
              const isOver = estimated != null && estimated > 0 && project.logged_hours > estimated

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/accounts/${accountId}/projects/${project.id}`)}
                  className="flex items-start gap-4 p-4 bg-black/20 rounded-lg border border-border/50 hover:border-purple/20 transition-colors cursor-pointer"
                >
                  <FolderKanban size={18} className="text-text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {project.name ?? 'Unnamed Project'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {project.project_manager && (
                        <span className="text-xs text-text-secondary">
                          PM: {[project.project_manager.first_name, project.project_manager.last_name]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      )}
                      {(project.project_start || project.project_end) && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <CalendarDays size={10} />
                          {project.project_start
                            ? new Date(project.project_start).toLocaleDateString()
                            : 'TBD'}
                          {' - '}
                          {project.project_end
                            ? new Date(project.project_end).toLocaleDateString()
                            : 'Ongoing'}
                        </span>
                      )}
                    </div>
                    {/* Hours progress */}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-text-secondary flex-shrink-0" />
                      <span className={`text-xs font-medium ${isOver ? 'text-red-400' : 'text-text-primary'}`}>
                        {project.logged_hours.toFixed(1)}h
                      </span>
                      {estimated != null && (
                        <>
                          <span className="text-xs text-text-secondary">
                            / {estimated.toFixed(1)}h est.
                          </span>
                          <div className="flex-1 max-w-[120px] h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOver ? 'bg-red-400' : pct != null && pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                            />
                          </div>
                          {pct != null && (
                            <span className={`text-[10px] ${isOver ? 'text-red-400' : 'text-text-secondary'}`}>
                              {isOver
                                ? `${Math.round((project.logged_hours / estimated) * 100)}%`
                                : `${pct}%`}
                            </span>
                          )}
                        </>
                      )}
                      {estimated == null && (
                        <span className="text-xs text-text-secondary">logged</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const timeLogStatusColors: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-400',
  will_not_bill: 'bg-red-500/15 text-red-400',
  backlog: 'bg-amber-500/15 text-amber-400',
  retainer: 'bg-blue-500/15 text-blue-400',
}

function TimeLogsTab({
  timeLogs,
  statuses,
  onStatusUpdate,
}: {
  timeLogs: (TimeLog & { team_member?: TeamMember | null; project?: { name: string | null } | null; status_option?: Option | null })[]
  statuses: Option[]
  onStatusUpdate: (logId: string, statusId: number) => void
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const approvedStatus = statuses.find((s) => s.option_key === 'approved')
  const willNotBillStatus = statuses.find((s) => s.option_key === 'will_not_bill')

  async function handleStatusUpdate(logId: string, statusId: number) {
    setUpdatingId(logId)
    const { error } = await supabase
      .from('time_logs')
      .update({ status_id: statusId })
      .eq('id', logId)
    if (!error) {
      onStatusUpdate(logId, statusId)
    }
    setUpdatingId(null)
  }

  if (timeLogs.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No time logs found for this account.
      </p>
    )
  }

  const totalHours = timeLogs.reduce((sum, tl) => sum + (tl.hours ?? 0), 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm text-text-secondary">
        <Clock size={14} />
        <span>
          Total: <span className="text-text-primary font-medium">{totalHours.toFixed(1)}h</span> logged
        </span>
      </div>
      <div className="space-y-2">
        {timeLogs.map((log) => {
          const statusKey = log.status_option?.option_key ?? null
          const isUpdating = updatingId === log.id
          const isApproved = statusKey === 'approved'
          const isWillNotBill = statusKey === 'will_not_bill'

          return (
            <div
              key={log.id}
              className="flex items-center gap-4 p-3 bg-black/20 rounded-lg border border-border/50"
            >
              <div className="text-right flex-shrink-0 w-14">
                <span className="text-sm font-semibold text-purple">
                  {log.hours?.toFixed(1) ?? '0.0'}h
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {log.description ?? 'No description'}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  {log.team_member && (
                    <span className="text-xs text-text-secondary">
                      {[log.team_member.first_name, log.team_member.last_name]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                  )}
                  {log.project?.name && (
                    <span className="text-xs text-text-secondary">
                      {log.project.name}
                    </span>
                  )}
                  {log.date && (
                    <span className="text-xs text-text-secondary">
                      {new Date(log.date).toLocaleDateString()}
                    </span>
                  )}
                  {log.status_option && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        timeLogStatusColors[statusKey ?? ''] ?? 'bg-zinc-500/15 text-zinc-400'
                      }`}
                    >
                      {log.status_option.option_label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {approvedStatus && !isApproved && (
                  <button
                    onClick={() => handleStatusUpdate(log.id, approvedStatus.id)}
                    disabled={isUpdating}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-400/70 hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? '...' : 'Approve'}
                  </button>
                )}
                {willNotBillStatus && !isWillNotBill && (
                  <button
                    onClick={() => handleStatusUpdate(log.id, willNotBillStatus.id)}
                    disabled={isUpdating}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-red-500/30 text-red-400/70 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/50 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? '...' : 'Will Not Bill'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const roleColors: Record<string, string> = {
  'Account Manager': 'bg-purple-500/15 text-purple-400',
  'Developer': 'bg-blue-500/15 text-blue-400',
  'Executive Sponsor': 'bg-amber-500/15 text-amber-400',
}

function AccountTeamTab({
  members,
}: {
  members: { id: string; team_member: TeamMember | null; role: AccountRole | null; expected_weekly_hrs: string | null }[]
}) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No team members assigned to this account.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const name = member.team_member
          ? [member.team_member.first_name, member.team_member.last_name].filter(Boolean).join(' ')
          : 'Unknown Member'

        return (
          <div
            key={member.id}
            className="flex items-center gap-4 p-3 bg-black/20 rounded-lg border border-border/50"
          >
            <div className="w-9 h-9 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
              {member.team_member?.photo ? (
                <img
                  src={member.team_member.photo}
                  alt={name}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <User size={16} className="text-purple" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {member.team_member?.role && (
                  <span className="text-xs text-text-secondary">{member.team_member.role}</span>
                )}
                {member.team_member?.email && (
                  <span className="text-xs text-text-secondary truncate">{member.team_member.email}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {member.expected_weekly_hrs && (
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <Clock size={12} />
                  {member.expected_weekly_hrs}h/wk
                </span>
              )}
              {member.role && (
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    roleColors[member.role.name] ?? 'bg-zinc-500/15 text-zinc-400'
                  }`}
                >
                  {member.role.name}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
