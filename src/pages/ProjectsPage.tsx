import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Search, CalendarDays, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCurrentRole } from '@/hooks/useCurrentRole'
import type { Project, TeamMember, Option } from '@/types/database'
import ProjectsGanttChart from '@/components/ProjectsGanttChart'

type ProjectWithDetails = Project & {
  project_manager?: TeamMember | null
  account?: { id: string; company_name: string | null } | null
  status_option?: Option | null
}

const projectStatusColors: Record<string, string> = {
  backlog: 'bg-blue-500/15 text-blue-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  on_hold: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

type Tab = 'overview' | 'assigned' | 'all'

export default function ProjectsPage() {
  const role = useCurrentRole()
  const isAdmin = role === 'Admin'
  const isAdminOrSales = role === 'Admin' || role === 'Sales'
  const [activeTab, setActiveTab] = useState<Tab>(isAdminOrSales ? 'overview' : 'assigned')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['projects-page'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return null

      // Get current user's team member ID
      const { data: teamData } = await supabase
        .from('team')
        .select('id')
        .eq('email', session.user.email!)
        .maybeSingle()

      const currentTeamMemberId = teamData?.id ?? null

      // Get account IDs the current user is assigned to via account_team
      let assignedAccountIds: string[] = []
      if (currentTeamMemberId) {
        const { data: accountTeamData } = await supabase
          .from('account_team')
          .select('account_id')
          .eq('team_member_id', currentTeamMemberId)

        assignedAccountIds = (accountTeamData ?? [])
          .map((at) => at.account_id)
          .filter(Boolean) as string[]
      }

      // Fetch all projects with account, PM, and status info
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, team(id, first_name, last_name, photo), accounts!fk_projects_account_id(id, company_name), options!projects_status_id_fkey(id, option_key, option_label)')
        .order('name')

      const projects: ProjectWithDetails[] = (projectsData ?? []).map((p) => ({
        ...p,
        project_manager: p.team as unknown as TeamMember | null,
        account: p.accounts as unknown as { id: string; company_name: string | null } | null,
        status_option: p.options as unknown as Option | null,
        team: undefined,
        accounts: undefined,
        options: undefined,
      })) as ProjectWithDetails[]

      // Get unique accounts for filter dropdown
      const accountsMap = new Map<string, string>()
      for (const p of projects) {
        if (p.account?.id) {
          accountsMap.set(p.account.id, p.account.company_name ?? 'Unnamed')
        }
      }
      const accounts = Array.from(accountsMap, ([id, company_name]) => ({ id, company_name }))
        .sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? ''))

      const { data: projectStatusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'project_status')

      return {
        projects,
        accounts,
        assignedAccountIds,
        currentTeamMemberId,
        projectStatuses: (projectStatusOptions as Option[]) ?? [],
      }
    },
  })

  const projects = queryData?.projects ?? []
  const accounts = queryData?.accounts ?? []
  const assignedAccountIds = queryData?.assignedAccountIds ?? []

  // Assigned projects: only those belonging to accounts the user is on
  const assignedProjects = projects.filter((p) =>
    p.account_id && assignedAccountIds.includes(p.account_id)
  )

  // Filter function for list tabs
  function filterProjects(list: ProjectWithDetails[]) {
    return list.filter((p) => {
      if (filterStatus && p.status_option?.option_key !== filterStatus) return false
      if (filterClient && p.account_id !== filterClient) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const name = (p.name ?? '').toLowerCase()
        const account = (p.account?.company_name ?? '').toLowerCase()
        if (!name.includes(q) && !account.includes(q)) return false
      }
      return true
    })
  }

  const tabs: { key: Tab; label: string; adminOnly?: boolean; hideForContractor?: boolean }[] = [
    { key: 'overview', label: 'Overview', hideForContractor: true },
    { key: 'assigned', label: 'Assigned' },
    { key: 'all', label: 'All', adminOnly: true, hideForContractor: true },
  ]

  const isContractor = role === 'Contractor'
  const visibleTabs = tabs.filter((t) => {
    if (t.adminOnly && !isAdmin) return false
    if (t.hideForContractor && isContractor) return false
    return true
  })

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FolderKanban size={24} className="text-purple" />
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
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
      <div className="flex items-center gap-3 mb-6">
        <FolderKanban size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-purple'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab — Gantt Chart */}
      {activeTab === 'overview' && (
        <ProjectsGanttChart
          projects={projects}
          accounts={accounts.map((a) => ({ id: a.id, company_name: a.company_name }))}
        />
      )}

      {/* Assigned / All Tabs — Project List */}
      {(activeTab === 'assigned' || activeTab === 'all') && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search projects..."
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
              {(queryData?.projectStatuses ?? []).map((s) => (
                <option key={s.id} value={s.option_key!}>
                  {s.option_label}
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
                <option key={a.id} value={a.id}>
                  {a.company_name ?? 'Unnamed'}
                </option>
              ))}
            </select>
          </div>

          <ProjectList
            projects={filterProjects(activeTab === 'assigned' ? assignedProjects : projects)}
          />
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Project List                                                       */
/* ------------------------------------------------------------------ */

function ProjectList({ projects }: { projects: ProjectWithDetails[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-text-secondary">No projects found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/accounts/${project.account_id}/projects/${project.id}`}
          className="block bg-surface border border-border rounded-xl px-4 py-3 hover:border-purple/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {project.name ?? 'Unnamed Project'}
                </span>
                {project.status_option && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                      projectStatusColors[project.status_option.option_key ?? ''] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {project.status_option.option_label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                {project.account?.company_name && (
                  <span className="truncate">{project.account.company_name}</span>
                )}
                {project.project_manager && (
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {[project.project_manager.first_name, project.project_manager.last_name]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                )}
                {(project.project_start || project.project_end) && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <CalendarDays size={11} />
                    {project.project_start
                      ? new Date(project.project_start + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '?'}
                    {' – '}
                    {project.project_end
                      ? new Date(project.project_end + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '?'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
