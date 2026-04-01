import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import MobileFormOverlay from '@/components/MobileFormOverlay'
import RichTextEditor from '@/components/RichTextEditor'
import type {
  Project,
  Feature,
  Option,
  TeamMember,
} from '@/types/database'

const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'] as const

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

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newFeature, setNewFeature] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status_id: 0,
  })
  const [editingDetails, setEditingDetails] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [savingDescription, setSavingDescription] = useState(false)

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*, team(first_name, last_name)')
        .eq('id', projectId!)
        .single()

      const mappedProject = projectData
        ? {
            ...projectData,
            project_manager: projectData.team as unknown as TeamMember | null,
            team: undefined,
          } as Project & { project_manager?: TeamMember | null }
        : null

      setProject(mappedProject)

      const { data: statusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'feature_status')

      const featureStatuses = (statusOptions as Option[]) ?? []
      if (featureStatuses.length > 0) {
        const backlog = featureStatuses.find((s) => s.option_key === 'backlog')
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

      return { project: mappedProject, featureStatuses }
    },
    enabled: !!projectId,
  })

  const featureStatuses = queryData?.featureStatuses ?? []

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

  function toInputDate(val: string | null): string {
    if (!val) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    const d = new Date(val)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  function startEditingDetails() {
    setEditStart(toInputDate(project?.project_start ?? null))
    setEditEnd(toInputDate(project?.project_end ?? null))
    setEditStatus(project?.status ?? '')
    setEditingDetails(true)
  }

  async function handleSaveDetails() {
    if (!projectId || !project) return
    setSavingDetails(true)
    const { error } = await supabase
      .from('projects')
      .update({
        status: editStatus || null,
        project_start: editStart || null,
        project_end: editEnd || null,
      })
      .eq('id', projectId)
    if (!error) {
      setProject({
        ...project,
        status: editStatus || null,
        project_start: editStart || null,
        project_end: editEnd || null,
      })
      setEditingDetails(false)
    }
    setSavingDetails(false)
  }

  function startEditingDescription() {
    setEditDescription(project?.description ?? '')
    setEditingDescription(true)
  }

  async function handleSaveDescription(html: string) {
    if (!projectId || !project) return
    setSavingDescription(true)
    const trimmed = html.trim()
    const isEmpty = !trimmed || trimmed === '<p></p>'
    const { error } = await supabase
      .from('projects')
      .update({ description: isEmpty ? null : trimmed })
      .eq('id', projectId)
    if (!error) {
      setProject({ ...project, description: isEmpty ? null : trimmed })
      setEditingDescription(false)
    }
    setSavingDescription(false)
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
            {!editingDetails ? (
              <>
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getProjectStatusColor(project.status)}`}
                >
                  {project.status ? formatStatusLabel(project.status) : 'No Status'}
                </span>
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
                <button
                  onClick={startEditingDetails}
                  className="text-text-secondary hover:text-purple transition-colors"
                >
                  <Pencil size={12} />
                </button>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-purple/50"
                >
                  <option value="">No Status</option>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-purple/50"
                />
                <span className="text-text-secondary text-xs">-</span>
                <input
                  type="date"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-purple/50"
                />
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="text-[11px] font-medium px-2.5 py-1 rounded bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50"
                >
                  {savingDetails ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingDetails(false)}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Overview */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Overview
          </h2>
          {!editingDescription && (
            <button
              onClick={startEditingDescription}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-purple hover:text-purple-hover transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>
        <div className="p-5">
          {editingDescription ? (
            <RichTextEditor
              content={editDescription}
              onSave={handleSaveDescription}
              onCancel={() => setEditingDescription(false)}
              saving={savingDescription}
            />
          ) : project.description ? (
            <div
              className="text-sm text-text-primary leading-relaxed rich-text-display"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
          ) : (
            <p className="text-sm text-text-secondary">
              No description yet. Click "Edit" to add one.
            </p>
          )}
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
            <MobileFormOverlay title="New Feature" onClose={() => setShowAddForm(false)}>
              <div className="mb-4 p-4 md:bg-black/20 rounded-lg md:border md:border-border/50">
                <div className="hidden md:flex items-center justify-between mb-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-1.5 text-sm font-medium border border-border text-text-secondary hover:text-text-primary rounded-md transition-colors"
                    >
                      Cancel
                    </button>
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
            </MobileFormOverlay>
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
