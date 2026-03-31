import { useEffect, useState } from 'react'
import {
  Target,
  Search,
  Phone,
  Mail,
  Globe,
  Building2,
  Calendar,
  Filter,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Lead, Option } from '@/types/database'

type LeadWithStatus = Lead & {
  status_option?: Option | null
}

type TabKey = 'kill_list' | 'follow_up' | 'networking' | 'all'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'kill_list', label: 'Kill List' },
  { key: 'follow_up', label: 'Follow-Up' },
  { key: 'networking', label: 'Networking' },
  { key: 'all', label: 'All' },
]

const statusColors: Record<string, string> = {
  lead: 'bg-blue-500/15 text-blue-400',
  booked: 'bg-emerald-500/15 text-emerald-400',
  callback_set: 'bg-amber-500/15 text-amber-400',
  closed: 'bg-purple-muted text-purple',
  networking: 'bg-cyan-500/15 text-cyan-400',
  no_show: 'bg-red-500/15 text-red-400',
  not_a_fit: 'bg-zinc-500/15 text-zinc-400',
  rejected: 'bg-red-500/15 text-red-400',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithStatus[]>([])
  const [statusOptions, setStatusOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('kill_list')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [{ data: leadsData }, { data: statusOpts }] = await Promise.all([
        supabase
          .from('leads')
          .select('*, options!leads_status_id_fkey(id, option_key, option_label)')
          .order('submission_date', { ascending: false }),
        supabase
          .from('options')
          .select('*')
          .eq('category', 'lead_status'),
      ])

      if (leadsData) {
        setLeads(
          leadsData.map((l) => ({
            ...l,
            status_option: l.options as unknown as Option | null,
            options: undefined,
          })) as LeadWithStatus[]
        )
      }

      if (statusOpts) setStatusOptions(statusOpts as Option[])
      setLoading(false)
    }

    fetchData()
  }, [])

  function getFilteredLeads(): LeadWithStatus[] {
    let filtered = leads

    // Tab filter
    if (activeTab === 'kill_list') {
      filtered = filtered.filter((l) => l.kill_list === true)
    } else if (activeTab === 'networking') {
      filtered = filtered.filter((l) => l.status_option?.option_key === 'networking')
    } else if (activeTab === 'follow_up') {
      filtered = filtered.filter((l) => l.follow_up_on !== null)
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((l) => l.status_option?.option_key === statusFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          (l.name?.toLowerCase().includes(q)) ||
          (l.email?.toLowerCase().includes(q)) ||
          (l.business_name?.toLowerCase().includes(q)) ||
          (l.phone?.includes(q))
      )
    }

    return filtered
  }

  const filteredLeads = getFilteredLeads()

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-border rounded mb-6" />
          <div className="h-10 bg-border rounded mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Target size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <span className="text-sm text-text-secondary ml-auto">
          {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setStatusFilter('') }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-purple border-purple'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-surface border border-border rounded-lg pl-8 pr-8 py-2 text-text-primary focus:outline-none focus:border-purple/50 appearance-none"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.id} value={opt.option_key ?? ''}>
                {opt.option_label}
              </option>
            ))}
          </select>
        </div>
        {(statusFilter || searchQuery) && (
          <button
            onClick={() => { setStatusFilter(''); setSearchQuery('') }}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Lead cards */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-2">
          {filteredLeads.map((lead) => {
            const statusKey = lead.status_option?.option_key ?? ''
            return (
              <div
                key={lead.id}
                className="p-4 bg-surface rounded-xl border border-border hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">
                        {lead.name ?? 'Unnamed Lead'}
                      </p>
                      {lead.kill_list && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          Kill List
                        </span>
                      )}
                      {lead.status_option && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            statusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
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
                      {lead.source && (
                        <span className="text-xs text-text-secondary">
                          {lead.source}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      {lead.submission_date && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Calendar size={10} />
                          Submitted {formatDate(lead.submission_date)}
                        </span>
                      )}
                      {lead.follow_up_on && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Calendar size={10} />
                          Follow-up {formatDate(lead.follow_up_on)}
                        </span>
                      )}
                      {lead.industry && (
                        <span className="text-xs text-text-secondary">
                          {lead.industry.replace(/[\[\]]/g, '').replace(/_/g, ' ').split(',').slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {lead.interest_level != null && (
                    <div className="flex-shrink-0 text-center">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">Interest</p>
                      <p className="text-sm font-semibold text-text-primary">{lead.interest_level}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <Target size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No leads found.</p>
        </div>
      )}
    </div>
  )
}
