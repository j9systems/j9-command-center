import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Target,
  Search,
  Phone,
  PhoneCall,
  MessageSquare,
  Mail,
  Globe,
  Building2,
  Calendar,
  Clock,
  Filter,
  X,
  StickyNote,
  Mic,
  Plus,
  Square,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lead, Option } from '@/types/database'
import NewLeadModal from '@/components/NewLeadModal'

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

type InteractionType = 'text' | 'call' | 'email'

const interactionTypeColors: Record<InteractionType, string> = {
  text: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  call: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  email: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
}

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) onResult(transcript.trim())
    }

    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    recognitionRef.current = null
  }, [])

  return { isListening, startListening, stopListening }
}

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('kill_list')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [contactModal, setContactModal] = useState<{ phone: string; action: 'call' | 'text' } | null>(null)

  // Quick Note modal state
  const [quickNoteModal, setQuickNoteModal] = useState<{ lead: LeadWithStatus } | null>(null)
  const [quickNoteText, setQuickNoteText] = useState('')
  const [quickNoteFollowUp, setQuickNoteFollowUp] = useState('')
  const [quickNoteSaving, setQuickNoteSaving] = useState(false)
  const quickNoteSpeech = useSpeechRecognition()

  // Quick Log modal state
  const [quickLogModal, setQuickLogModal] = useState<{ lead: LeadWithStatus } | null>(null)
  const [quickLogType, setQuickLogType] = useState<InteractionType | null>(null)
  const [quickLogText, setQuickLogText] = useState('')
  const [quickLogSaving, setQuickLogSaving] = useState(false)
  const quickLogSpeech = useSpeechRecognition()
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const [{ data: leadsData }, { data: statusOpts }, { data: interactionsData }] = await Promise.all([
        supabase
          .from('leads')
          .select('*, options!fk_leads_status_id(id, option_key, option_label)')
          .order('submission_date', { ascending: false }),
        supabase
          .from('options')
          .select('*')
          .eq('category', 'lead_status'),
        supabase
          .from('interactions')
          .select('lead_id, date, from_email, to_email, phone_from, phone_to')
          .not('date', 'is', null)
          .order('date', { ascending: false }),
      ])

      const leads: LeadWithStatus[] = leadsData
        ? leadsData.map((l) => ({
            ...l,
            status_option: l.options as unknown as Option | null,
            options: undefined,
          })) as LeadWithStatus[]
        : []

      const statusOptions: Option[] = (statusOpts as Option[]) ?? []

      // Build map of lead id -> most recent interaction date
      const allInteractions = interactionsData ?? []
      const lastInteractionMap: Record<string, string> = {}

      for (const lead of leads) {
        const emailLower = lead.email?.toLowerCase() ?? null
        const phoneDigits = lead.phone?.replace(/\D/g, '') ?? null
        const phoneLast10 = phoneDigits ? phoneDigits.slice(-10) : null

        for (const interaction of allInteractions) {
          if (!interaction.date) continue

          let matched = false

          if (interaction.lead_id === lead.id) matched = true

          if (!matched && emailLower) {
            if (
              interaction.from_email?.toLowerCase() === emailLower ||
              interaction.to_email?.toLowerCase() === emailLower
            ) matched = true
          }

          if (!matched && phoneLast10) {
            const fromDigits = interaction.phone_from?.replace(/\D/g, '') ?? ''
            const toDigits = interaction.phone_to?.replace(/\D/g, '') ?? ''
            if (
              fromDigits.slice(-10) === phoneLast10 ||
              toDigits.slice(-10) === phoneLast10
            ) matched = true
          }

          if (matched) {
            lastInteractionMap[lead.id] = interaction.date
            break
          }
        }
      }

      // Fetch interaction type options for quick log
      const { data: interactionTypeOpts } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'interaction_type')

      const interactionTypeOptions: Option[] = (interactionTypeOpts as Option[]) ?? []

      return { leads, statusOptions, lastInteractionMap, interactionTypeOptions }
    },
  })

  const leads = queryData?.leads ?? []
  const statusOptions = queryData?.statusOptions ?? []
  const lastInteractionMap = queryData?.lastInteractionMap ?? {}
  const interactionTypeOptions = queryData?.interactionTypeOptions ?? []

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  }

  function needsFollowUp(lead: LeadWithStatus): boolean {
    const lastInteraction = lastInteractionMap[lead.id] ?? null
    const days = daysSince(lastInteraction)

    // No interactions at all
    if (!lastInteraction) return true

    // No follow-up date AND more than 3 days since last interaction
    if (!lead.follow_up_on && days !== null && days > 3) return true

    // Follow-up date is earlier than most recent interaction
    if (lead.follow_up_on && lastInteraction) {
      const followUpDate = new Date(lead.follow_up_on).getTime()
      const lastInteractionDate = new Date(lastInteraction).getTime()
      if (followUpDate < lastInteractionDate) return true
    }

    return false
  }

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

  // Split into needs follow-up and active for kill_list and follow_up tabs
  const showGrouped = activeTab === 'kill_list' || activeTab === 'follow_up'
  const needsFollowUpLeads = showGrouped ? filteredLeads.filter((l) => needsFollowUp(l)) : []
  const activeLeads = showGrouped ? filteredLeads.filter((l) => !needsFollowUp(l)) : filteredLeads

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function handleContactAction(source: 'sales' | 'personal') {
    if (!contactModal) return
    const phone = contactModal.phone.replace(/[^+\d]/g, '')
    if (source === 'sales') {
      if (contactModal.action === 'call') {
        window.open(`openphone://call?number=${encodeURIComponent(phone)}`, '_blank')
      } else {
        window.open(`openphone://message?number=${encodeURIComponent(phone)}`, '_blank')
      }
    } else {
      if (contactModal.action === 'call') {
        window.open(`tel:${phone}`)
      } else {
        window.open(`sms:${phone}`)
      }
    }
    setContactModal(null)
  }

  function openQuickNote(lead: LeadWithStatus, e: React.MouseEvent) {
    e.stopPropagation()
    setQuickNoteText('')
    setQuickNoteFollowUp(lead.follow_up_on ?? '')
    setQuickNoteModal({ lead })
  }

  async function saveQuickNote() {
    if (!quickNoteModal || (!quickNoteText.trim() && !quickNoteFollowUp)) return
    setQuickNoteSaving(true)

    const lead = quickNoteModal.lead
    const updates: Record<string, unknown> = {}

    if (quickNoteText.trim()) {
      const timestamp = new Date().toLocaleString()
      const newEntry = `[${timestamp}] ${quickNoteText.trim()}`
      const existingNotes = lead.notes ?? ''
      updates.notes = existingNotes ? `${newEntry}\n${existingNotes}` : newEntry
    }

    if (quickNoteFollowUp) {
      updates.follow_up_on = quickNoteFollowUp
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('leads').update(updates).eq('id', lead.id)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    }

    setQuickNoteSaving(false)
    setQuickNoteModal(null)
    if (quickNoteSpeech.isListening) quickNoteSpeech.stopListening()
  }

  function openQuickLog(lead: LeadWithStatus, e: React.MouseEvent) {
    e.stopPropagation()
    setQuickLogType(null)
    setQuickLogText('')
    setQuickLogModal({ lead })
  }

  async function saveQuickLog() {
    if (!quickLogModal || !quickLogType || !quickLogText.trim()) return
    setQuickLogSaving(true)

    const lead = quickLogModal.lead
    const typeOption = interactionTypeOptions.find(
      (o) => o.option_key === quickLogType
    )

    const newInteraction: Record<string, unknown> = {
      lead_id: lead.id,
      date: new Date().toISOString(),
      type_id: typeOption?.id ?? null,
      type: quickLogType,
      body: quickLogText.trim(),
      inbound_outbound: 'Outbound',
    }

    // Add email/phone fields based on type
    if (quickLogType === 'email' && lead.email) {
      newInteraction.to_email = lead.email
    } else if ((quickLogType === 'call' || quickLogType === 'text') && lead.phone) {
      newInteraction.phone_to = lead.phone
    }

    await supabase.from('interactions').insert(newInteraction)
    queryClient.invalidateQueries({ queryKey: ['leads'] })

    setQuickLogSaving(false)
    setQuickLogModal(null)
    if (quickLogSpeech.isListening) quickLogSpeech.stopListening()
  }

  function renderLeadCard(lead: LeadWithStatus) {
    const statusKey = lead.status_option?.option_key ?? ''
    return (
      <div
        key={lead.id}
        onClick={() => navigate(`/leads/${lead.id}`)}
        className="p-4 bg-surface rounded-xl border border-border cursor-pointer hover:border-purple/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-text-primary">
                {lead.name ?? 'Unnamed Lead'}
              </p>
              {lead.kill_list && activeTab !== 'kill_list' && (
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
              {(() => {
                const days = daysSince(lastInteractionMap[lead.id] ?? null)
                return (
                  <span className={`text-xs flex items-center gap-1 ${
                    days === null
                      ? 'text-zinc-500'
                      : days <= 7
                      ? 'text-emerald-400'
                      : days <= 30
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    <Clock size={10} />
                    {days !== null ? `${days}d since last interaction` : 'No interactions'}
                  </span>
                )
              })()}
              {lead.industry && (
                <span className="text-xs text-text-secondary">
                  {lead.industry.replace(/[\[\]]/g, '').replace(/_/g, ' ').split(',').slice(0, 2).join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => openQuickNote(lead, e)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Quick Note"
            >
              <StickyNote size={14} />
            </button>
            <button
              onClick={(e) => openQuickLog(lead, e)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Quick Log"
            >
              <Plus size={14} />
            </button>
            {lead.phone && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setContactModal({ phone: lead.phone!, action: 'call' }) }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Call"
                >
                  <PhoneCall size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setContactModal({ phone: lead.phone!, action: 'text' }) }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  title="Text"
                >
                  <MessageSquare size={14} />
                </button>
              </>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-text-secondary hover:text-purple hover:bg-purple/10 transition-colors"
                title="Email"
              >
                <Mail size={14} />
              </a>
            )}
            {lead.interest_level != null && (
              <div className="text-center ml-1">
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">Interest</p>
                <p className="text-sm font-semibold text-text-primary">{lead.interest_level}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
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
        <button
          onClick={() => setShowNewLeadModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple hover:bg-purple-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Lead
        </button>
      </div>

      <NewLeadModal open={showNewLeadModal} onClose={() => setShowNewLeadModal(false)} />

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
          {showGrouped ? (
            <>
              {/* Needs Follow-Up Section */}
              {needsFollowUpLeads.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                      Needs Follow-Up
                    </h2>
                    <span className="text-xs text-text-secondary">({needsFollowUpLeads.length})</span>
                  </div>
                  <div className="space-y-2">
                    {needsFollowUpLeads.map(renderLeadCard)}
                  </div>
                </div>
              )}

              {/* Active Section */}
              {activeLeads.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Active
                    </h2>
                    <span className="text-xs text-text-secondary">({activeLeads.length})</span>
                  </div>
                  <div className="space-y-2">
                    {activeLeads.map(renderLeadCard)}
                  </div>
                </div>
              )}
            </>
          ) : (
            filteredLeads.map(renderLeadCard)
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <Target size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No leads found.</p>
        </div>
      )}

      {/* Call/Text Modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setContactModal(null)}>
          <div className="bg-surface rounded-xl border border-border p-5 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                {contactModal.action === 'call' ? 'Call' : 'Text'} {contactModal.phone}
              </h3>
              <button onClick={() => setContactModal(null)} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Choose which number to {contactModal.action === 'call' ? 'call' : 'text'} from:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleContactAction('sales')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium bg-purple/10 text-purple border border-purple/20 rounded-lg hover:bg-purple/20 transition-colors"
              >
                <Phone size={16} />
                Sales Number (OpenPhone)
              </button>
              <button
                onClick={() => handleContactAction('personal')}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium bg-black/20 text-text-primary border border-border rounded-lg hover:bg-black/30 transition-colors"
              >
                <Phone size={16} />
                Personal Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Note Modal */}
      {quickNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setQuickNoteModal(null); if (quickNoteSpeech.isListening) quickNoteSpeech.stopListening() }}>
          <div className="bg-surface rounded-xl border border-border p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Quick Note — {quickNoteModal.lead.name ?? 'Unnamed'}
              </h3>
              <button onClick={() => { setQuickNoteModal(null); if (quickNoteSpeech.isListening) quickNoteSpeech.stopListening() }} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            {/* Note input with voice */}
            <div className="relative mb-3">
              <textarea
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={3}
                className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (quickNoteSpeech.isListening) {
                    quickNoteSpeech.stopListening()
                  } else {
                    quickNoteSpeech.startListening((text) => {
                      setQuickNoteText((prev) => prev ? `${prev} ${text}` : text)
                    })
                  }
                }}
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                  quickNoteSpeech.isListening
                    ? 'text-red-400 bg-red-500/15 animate-pulse'
                    : 'text-text-secondary hover:text-purple hover:bg-purple/10'
                }`}
                title={quickNoteSpeech.isListening ? 'Stop recording' : 'Record voice note'}
              >
                {quickNoteSpeech.isListening ? <Square size={14} /> : <Mic size={14} />}
              </button>
            </div>

            {/* Follow-up date picker */}
            <div className="mb-4">
              <label className="text-xs text-text-secondary block mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={quickNoteFollowUp}
                onChange={(e) => setQuickNoteFollowUp(e.target.value)}
                className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
              />
            </div>

            <button
              onClick={saveQuickNote}
              disabled={quickNoteSaving || (!quickNoteText.trim() && !quickNoteFollowUp)}
              className="w-full px-4 py-2 text-sm font-medium bg-purple/15 text-purple border border-purple/20 rounded-lg hover:bg-purple/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quickNoteSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Log Modal */}
      {quickLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setQuickLogModal(null); if (quickLogSpeech.isListening) quickLogSpeech.stopListening() }}>
          <div className="bg-surface rounded-xl border border-border p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">
                Log Interaction — {quickLogModal.lead.name ?? 'Unnamed'}
              </h3>
              <button onClick={() => { setQuickLogModal(null); if (quickLogSpeech.isListening) quickLogSpeech.stopListening() }} className="text-text-secondary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            {/* Interaction type selector */}
            <div className="flex gap-2 mb-3">
              {(['text', 'call', 'email'] as InteractionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setQuickLogType(type)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize ${
                    quickLogType === type
                      ? interactionTypeColors[type]
                      : 'bg-black/20 text-text-secondary border-border hover:border-text-secondary/30'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Description with voice */}
            <div className="relative mb-4">
              <textarea
                value={quickLogText}
                onChange={(e) => setQuickLogText(e.target.value)}
                placeholder="What was this interaction about?"
                rows={3}
                className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 pr-10 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (quickLogSpeech.isListening) {
                    quickLogSpeech.stopListening()
                  } else {
                    quickLogSpeech.startListening((text) => {
                      setQuickLogText((prev) => prev ? `${prev} ${text}` : text)
                    })
                  }
                }}
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                  quickLogSpeech.isListening
                    ? 'text-red-400 bg-red-500/15 animate-pulse'
                    : 'text-text-secondary hover:text-purple hover:bg-purple/10'
                }`}
                title={quickLogSpeech.isListening ? 'Stop recording' : 'Record voice note'}
              >
                {quickLogSpeech.isListening ? <Square size={14} /> : <Mic size={14} />}
              </button>
            </div>

            <button
              onClick={saveQuickLog}
              disabled={quickLogSaving || !quickLogType || !quickLogText.trim()}
              className="w-full px-4 py-2 text-sm font-medium bg-purple/15 text-purple border border-purple/20 rounded-lg hover:bg-purple/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quickLogSaving ? 'Saving...' : 'Log Interaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
