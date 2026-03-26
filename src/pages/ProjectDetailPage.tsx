import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  Plus,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type {
  Project,
  Feature,
  Option,
  TeamMember,
} from '@/types/database'

const featureStatusColors: Record<string, string> = {
  backlog: 'bg-zinc-500/15 text-zinc-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-emerald-500/15 text-emerald-400',
}

export default function ProjectDetailPage() {
  const { id: accountId, projectId } = useParams<{ id: string; projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<(Project & { project_manager?: TeamMember | null }) | null>(null)
  const [features, setFeatures] = useState<(Feature & { status_option?: Option | null })[]>([])
  const [featureStatuses, setFeatureStatuses] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newFeature, setNewFeature] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status_id: 0,
  })

  useEffect(() => {
    if (!projectId) return

    async function fetchData() {
      setLoading(true)

      const { data: projectData } = await supabase
        .from('projects')
        .select('*, team(first_name, last_name)')
        .eq('id', projectId!)
        .single()

      if (projectData) {
        setProject({
          ...projectData,
          project_manager: projectData.team as unknown as TeamMember | null,
          team: undefined,
        } as Project & { project_manager?: TeamMember | null })
      }

      const { data: statusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'feature_status')

      if (statusOptions) {
        setFeatureStatuses(statusOptions as Option[])
        const backlog = statusOptions.find((s) => s.option_key === 'backlog')
        if (backlog) {
          setNewFeature((prev) => ({ ...prev, status_id: backlog.id }))
        }
      }

      const { data: featuresData } = await supabase
        .from('features')
        .select('*, options(id, option_key, option_label)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true })

      if (featuresData) {
        setFeatures(
          featuresData.map((f) => ({
            ...f,
            status_option: f.options as unknown as Option | null,
            options: undefined,
          })) as (Feature & { status_option?: Option | null })[]
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [projectId])

  async function handleAddFeature() {
    if (!newFeature.name.trim() || !projectId) return
    setSaving(true)

    const featureId = crypto.randomUUID()
    const { data, error } = await supabase
      .from('features')
      .insert({
        id: featureId,
        project_id: projectId,
        name: newFeature.name.trim(),
        description: newFeature.description.trim() || null,
        start_date: newFeature.start_date || null,
        end_date: newFeature.end_date || null,
        status_id: newFeature.status_id || null,
      })
      .select('*, options(id, option_key, option_label)')
      .single()

    if (!error && data) {
      setFeatures((prev) => [
        ...prev,
        {
          ...data,
          status_option: data.options as unknown as Option | null,
          options: undefined,
        } as Feature & { status_option?: Option | null },
      ])
      const backlog = featureStatuses.find((s) => s.option_key === 'backlog')
      setNewFeature({ name: '', description: '', start_date: '', end_date: '', status_id: backlog?.id ?? 0 })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-border rounded mb-6" />
          <div className="h-8 w-64 bg-border rounded mb-4" />
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!project) {
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
          <p className="text-text-secondary text-sm">Project not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${accountId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Account
      </Link>

      {/* Project header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <FolderKanban size={22} className="text-purple" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary truncate">
            {project.name ?? 'Unnamed Project'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {project.project_manager && (
              <span className="text-sm text-text-secondary">
                PM: {[project.project_manager.first_name, project.project_manager.last_name]
                  .filter(Boolean)
                  .join(' ')}
              </span>
            )}
            {(project.project_start || project.project_end) && (
              <span className="text-sm text-text-secondary flex items-center gap-1">
                <CalendarDays size={12} />
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
        </div>
      </div>

      {/* Features section */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Features
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-purple hover:text-purple-hover transition-colors"
          >
            <Plus size={14} />
            Add Feature
          </button>
        </div>

        <div className="p-5">
          {/* Add feature form */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-black/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">New Feature</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Feature name"
                  value={newFeature.name}
                  onChange={(e) => setNewFeature((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-black/30 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newFeature.description}
                  onChange={(e) => setNewFeature((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-black/30 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-text-secondary mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={newFeature.start_date}
                      onChange={(e) => setNewFeature((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full bg-black/30 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-purple/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-secondary mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={newFeature.end_date}
                      onChange={(e) => setNewFeature((prev) => ({ ...prev, end_date: e.target.value }))}
                      className="w-full bg-black/30 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-purple/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-secondary mb-1 block">Status</label>
                    <select
                      value={newFeature.status_id}
                      onChange={(e) => setNewFeature((prev) => ({ ...prev, status_id: Number(e.target.value) }))}
                      className="w-full bg-black/30 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-purple/50"
                    >
                      <option value={0}>Select status</option>
                      {featureStatuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.option_label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddFeature}
                    disabled={!newFeature.name.trim() || saving}
                    className="px-4 py-1.5 text-sm font-medium bg-purple hover:bg-purple-hover text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add Feature'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Features list */}
          {features.length === 0 && !showAddForm ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No features yet. Click "Add Feature" to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {features.map((feature) => {
                const statusKey = feature.status_option?.option_key ?? null

                return (
                  <div
                    key={feature.id}
                    onClick={() => navigate(`/accounts/${accountId}/projects/${projectId}/features/${feature.id}`)}
                    className="flex items-center gap-4 p-3 bg-black/20 rounded-lg border border-border/50 hover:border-purple/20 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {feature.name ?? 'Unnamed Feature'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        {feature.description && (
                          <span className="text-xs text-text-secondary truncate">
                            {feature.description}
                          </span>
                        )}
                        {(feature.start_date || feature.end_date) && (
                          <span className="text-xs text-text-secondary flex items-center gap-1">
                            <CalendarDays size={10} />
                            {feature.start_date
                              ? new Date(feature.start_date).toLocaleDateString()
                              : 'TBD'}
                            {' - '}
                            {feature.end_date
                              ? new Date(feature.end_date).toLocaleDateString()
                              : 'TBD'}
                          </span>
                        )}
                      </div>
                    </div>
                    {feature.status_option && (
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                          featureStatusColors[statusKey ?? ''] ?? 'bg-zinc-500/15 text-zinc-400'
                        }`}
                      >
                        {feature.status_option.option_label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
