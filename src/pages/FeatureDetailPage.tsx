import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  GitBranch,
  Layers,
  ArrowDown,
  ArrowUp,
} from 'lucide-react'
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
  const [siblingFeatures, setSiblingFeatures] = useState<FeatureWithStatus[]>([])
  const [followsFeature, setFollowsFeature] = useState<FeatureWithStatus | null>(null)
  const [precedesFeature, setPrecedesFeature] = useState<FeatureWithStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingDep, setSavingDep] = useState<'follows' | 'precedes' | null>(null)

  useEffect(() => {
    if (!featureId || !projectId) return

    async function fetchData() {
      setLoading(true)

      const { data: featureData } = await supabase
        .from('features')
        .select('*, options(id, option_key, option_label)')
        .eq('id', featureId!)
        .single()

      if (featureData) {
        const mapped: FeatureWithStatus = {
          ...featureData,
          status_option: featureData.options as unknown as Option | null,
          options: undefined,
        } as FeatureWithStatus
        setFeature(mapped)

        // Load dependency features if set
        if (featureData.follows_id) {
          const { data: followsData } = await supabase
            .from('features')
            .select('*, options(id, option_key, option_label)')
            .eq('id', featureData.follows_id)
            .single()
          if (followsData) {
            setFollowsFeature({
              ...followsData,
              status_option: followsData.options as unknown as Option | null,
              options: undefined,
            } as FeatureWithStatus)
          }
        }

        if (featureData.precedes_id) {
          const { data: precedesData } = await supabase
            .from('features')
            .select('*, options(id, option_key, option_label)')
            .eq('id', featureData.precedes_id)
            .single()
          if (precedesData) {
            setPrecedesFeature({
              ...precedesData,
              status_option: precedesData.options as unknown as Option | null,
              options: undefined,
            } as FeatureWithStatus)
          }
        }
      }

      // Load sibling features for dependency dropdowns
      const { data: siblingsData } = await supabase
        .from('features')
        .select('*, options(id, option_key, option_label)')
        .eq('project_id', projectId!)
        .neq('id', featureId!)
        .order('name')

      if (siblingsData) {
        setSiblingFeatures(
          siblingsData.map((f) => ({
            ...f,
            status_option: f.options as unknown as Option | null,
            options: undefined,
          })) as FeatureWithStatus[]
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [featureId, projectId])

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
            {(feature.start_date || feature.end_date) && (
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
