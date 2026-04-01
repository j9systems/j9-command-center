import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  GitBranch,
  Layers,
  Pencil,
  ArrowDown,
  ArrowUp,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Feature, Option } from '@/types/database'

const featureStatusColors: Record<string, string> = {
  backlog: 'bg-zinc-500/15 text-zinc-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-emerald-500/15 text-emerald-400',
}

type FeatureWithStatus = Feature & { status_option?: Option | null }

export default function FeatureDetailPage() {
  const { id: accountId, projectId, featureId } = useParams<{
    id: string
    projectId: string
    featureId: string
  }>()
  const [feature, setFeature] = useState<FeatureWithStatus | null>(null)
  const [followsFeature, setFollowsFeature] = useState<FeatureWithStatus | null>(null)
  const [precedesFeature, setPrecedesFeature] = useState<FeatureWithStatus | null>(null)
  const [savingDep, setSavingDep] = useState<'follows' | 'precedes' | null>(null)
  const [editingDetails, setEditingDetails] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editStatusId, setEditStatusId] = useState<number | null>(null)
  const [savingDetails, setSavingDetails] = useState(false)

  const { data: queryData, isLoading } = useQuery({
    queryKey: ['feature', featureId, projectId],
    queryFn: async () => {
      if (!featureId || !projectId) return null

      const { data: featureData } = await supabase
        .from('features')
        .select('*, options(id, option_key, option_label)')
        .eq('id', featureId)
        .single()

      let mapped: FeatureWithStatus | null = null
      let followsData: FeatureWithStatus | null = null
      let precedesData: FeatureWithStatus | null = null

      if (featureData) {
        mapped = {
          ...featureData,
          status_option: featureData.options as unknown as Option | null,
          options: undefined,
        } as FeatureWithStatus

        if (featureData.follows_id) {
          const { data } = await supabase
            .from('features')
            .select('*, options(id, option_key, option_label)')
            .eq('id', featureData.follows_id)
            .single()
          if (data) {
            followsData = {
              ...data,
              status_option: data.options as unknown as Option | null,
              options: undefined,
            } as FeatureWithStatus
          }
        }

        if (featureData.precedes_id) {
          const { data } = await supabase
            .from('features')
            .select('*, options(id, option_key, option_label)')
            .eq('id', featureData.precedes_id)
            .single()
          if (data) {
            precedesData = {
              ...data,
              status_option: data.options as unknown as Option | null,
              options: undefined,
            } as FeatureWithStatus
          }
        }
      }

      const [siblingsRes, statusRes] = await Promise.all([
        supabase
          .from('features')
          .select('*, options(id, option_key, option_label)')
          .eq('project_id', projectId)
          .neq('id', featureId)
          .order('name'),
        supabase
          .from('options')
          .select('*')
          .eq('category', 'feature_status'),
      ])

      const siblingFeatures: FeatureWithStatus[] = siblingsRes.data
        ? siblingsRes.data.map((f) => ({
            ...f,
            status_option: f.options as unknown as Option | null,
            options: undefined,
          })) as FeatureWithStatus[]
        : []

      const featureStatuses: Option[] = (statusRes.data as Option[]) ?? []

      // Sync mutable state
      setFeature(mapped)
      setFollowsFeature(followsData)
      setPrecedesFeature(precedesData)

      return { feature: mapped, siblingFeatures, featureStatuses, followsFeature: followsData, precedesFeature: precedesData }
    },
    enabled: !!featureId && !!projectId,
  })

  useEffect(() => {
    if (!queryData) return
    if (queryData.feature) setFeature(queryData.feature)
    setFollowsFeature(queryData.followsFeature ?? null)
    setPrecedesFeature(queryData.precedesFeature ?? null)
  }, [queryData])

  const loading = isLoading || (!!queryData && !feature && !!queryData.feature)

  const siblingFeatures = queryData?.siblingFeatures ?? []
  const featureStatuses = queryData?.featureStatuses ?? []

  async function handleDependencyChange(type: 'follows' | 'precedes', targetId: string | null) {
    if (!featureId || !feature) return
    setSavingDep(type)

    const field = type === 'follows' ? 'follows_id' : 'precedes_id'
    const { error } = await supabase
      .from('features')
      .update({ [field]: targetId })
      .eq('id', featureId)

    if (!error) {
      setFeature((prev) => prev ? { ...prev, [field]: targetId } : prev)

      const targetFeature = targetId
        ? siblingFeatures.find((f) => f.id === targetId) ?? null
        : null

      if (type === 'follows') {
        setFollowsFeature(targetFeature)
      } else {
        setPrecedesFeature(targetFeature)
      }
    }

    setSavingDep(null)
  }

  function startEditingDetails() {
    setEditStart(feature?.start_date ?? '')
    setEditEnd(feature?.end_date ?? '')
    setEditStatusId(feature?.status_id ?? null)
    setEditingDetails(true)
  }

  async function handleSaveDetails() {
    if (!featureId || !feature) return
    setSavingDetails(true)
    const { error } = await supabase
      .from('features')
      .update({
        start_date: editStart || null,
        end_date: editEnd || null,
        status_id: editStatusId || null,
      })
      .eq('id', featureId)
    if (!error) {
      // Find the updated status option for display
      const newStatusOption = editStatusId
        ? featureStatuses.find((s) => s.id === editStatusId) ?? null
        : null
      setFeature({
        ...feature,
        start_date: editStart || null,
        end_date: editEnd || null,
        status_id: editStatusId || null,
        status_option: newStatusOption,
      })
      setEditingDetails(false)
    }
    setSavingDetails(false)
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

  if (!feature) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link
          to={`/accounts/${accountId}/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Project
        </Link>
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">Feature not found.</p>
        </div>
      </div>
    )
  }

  const statusKey = feature.status_option?.option_key ?? null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${accountId}/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Project
      </Link>

      {/* Feature header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <Layers size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary truncate">
              {feature.name ?? 'Unnamed Feature'}
            </h1>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {!editingDetails ? (
              <>
                <span className="text-sm text-text-secondary flex items-center gap-1">
                  <CalendarDays size={12} />
                  {feature.start_date
                    ? new Date(feature.start_date).toLocaleDateString()
                    : 'TBD'}
                  {' - '}
                  {feature.end_date
                    ? new Date(feature.end_date).toLocaleDateString()
                    : 'TBD'}
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
                  value={editStatusId?.toString() ?? ''}
                  onChange={(e) => setEditStatusId(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-purple/50"
                >
                  <option value="">No Status</option>
                  {featureStatuses.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.option_label}
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

      {/* Description */}
      {feature.description && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Description
          </h3>
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {feature.description}
          </p>
        </div>
      )}

      {/* Dependencies */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
          <GitBranch size={16} className="text-text-secondary" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Dependencies
          </h2>
        </div>

        <div className="p-5 space-y-6">
          {/* Depends On (follows_id) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDown size={14} className="text-amber-400" />
              <h3 className="text-sm font-medium text-text-primary">Depends On</h3>
              <span className="text-xs text-text-secondary">This feature depends on another feature being completed first</span>
            </div>
            {followsFeature && (
              <div className="mb-3 p-3 bg-black/20 rounded-lg border border-border/50 flex items-center gap-3">
                <Layers size={14} className="text-text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {followsFeature.name}
                  </p>
                </div>
                {followsFeature.status_option && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      featureStatusColors[followsFeature.status_option.option_key ?? ''] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {followsFeature.status_option.option_label}
                  </span>
                )}
              </div>
            )}
            <select
              value={feature.follows_id ?? ''}
              onChange={(e) => handleDependencyChange('follows', e.target.value || null)}
              disabled={savingDep === 'follows'}
              className="w-full bg-black/30 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple/50 disabled:opacity-50"
            >
              <option value="">None</option>
              {siblingFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {savingDep === 'follows' && (
              <p className="text-xs text-text-secondary mt-1">Saving...</p>
            )}
          </div>

          {/* Precedes (precedes_id) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp size={14} className="text-blue-400" />
              <h3 className="text-sm font-medium text-text-primary">Precedes</h3>
              <span className="text-xs text-text-secondary">Another feature depends on this one being completed first</span>
            </div>
            {precedesFeature && (
              <div className="mb-3 p-3 bg-black/20 rounded-lg border border-border/50 flex items-center gap-3">
                <Layers size={14} className="text-text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {precedesFeature.name}
                  </p>
                </div>
                {precedesFeature.status_option && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      featureStatusColors[precedesFeature.status_option.option_key ?? ''] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {precedesFeature.status_option.option_label}
                  </span>
                )}
              </div>
            )}
            <select
              value={feature.precedes_id ?? ''}
              onChange={(e) => handleDependencyChange('precedes', e.target.value || null)}
              disabled={savingDep === 'precedes'}
              className="w-full bg-black/30 border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-purple/50 disabled:opacity-50"
            >
              <option value="">None</option>
              {siblingFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {savingDep === 'precedes' && (
              <p className="text-xs text-text-secondary mt-1">Saving...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
