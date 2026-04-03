import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  MessageSquare,
  Globe,
  Building2,
  Calendar,
  Target,
  Clock,
  X,
  MessageCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lead, Option, InteractionWithType } from '@/types/database'

type LeadWithStatus = Lead & {
  status_option?: Option | null
}

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

const interactionTypeColors: Record<string, string> = {
  email: 'bg-blue-500/15 text-blue-400',
  text: 'bg-emerald-500/15 text-emerald-400',
  meeting: 'bg-purple-muted text-purple',
  linkedin: 'bg-cyan-500/15 text-cyan-400',
  in_person: 'bg-amber-500/15 text-amber-400',
  agreement_signed: 'bg-green-500/15 text-green-400',
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getMatchReason(i: InteractionWithType, lead: LeadWithStatus): string {
  if (lead.email && (i.from_email === lead.email || i.to_email === lead.email)) {
    return 'matched via email'
  }
  if (lead.phone && i.phone_from === lead.phone) {
    return 'matched via phone'
  }
  return ''
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contactModal, setContactModal] = useState<{ phone: string; action: 'call' | 'text' } | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*, options!fk_leads_status_id(id, option_key, option_label)')
        .eq('id', id!)
        .single()

      if (error || !lead) throw error ?? new Error('Lead not found')

      const mappedLead: LeadWithStatus = {
        ...lead,
        status_option: lead.options as unknown as Option | null,
        options: undefined,
      } as LeadWithStatus

      // Match interactions by from_email, to_email, or phone_from — no direct FK yet
      const orFilters: string[] = []
      if (mappedLead.email) {
        orFilters.push(`from_email.eq.${mappedLead.email}`)
        orFilters.push(`to_email.eq.${mappedLead.email}`)
      }
      if (mappedLead.phone) {
        orFilters.push(`phone_from.eq.${mappedLead.phone}`)
      }

      const interactionsResult = orFilters.length > 0
        ? await supabase
            .from('interactions')
            .select('*, options!fk_interactions_type_id(id, option_key, option_label)')
            .or(orFilters.join(','))
            .order('date', { ascending: false })
        : { data: [], error: null }

      const interactions: InteractionWithType[] = (interactionsResult.data ?? []).map((i) => ({
        ...i,
        type_option: i.options as unknown as Option | null,
        options: undefined,
      })) as InteractionWithType[]

      return { lead: mappedLead, interactions }
    },
    enabled: !!id,
  })

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

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-border rounded mb-6" />
          <div className="h-8 w-64 bg-border rounded mb-2" />
          <div className="h-4 w-40 bg-border rounded mb-6" />
          <div className="flex gap-3 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-28 bg-border rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="h-48 bg-surface rounded-xl border border-border" />
            <div className="h-48 bg-surface rounded-xl border border-border" />
          </div>
          <div className="h-40 bg-surface rounded-xl border border-border mb-6" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="bg-surface rounded-xl border border-border p-8 text-center max-w-sm">
          <Target size={36} className="mx-auto mb-3 text-text-secondary opacity-30" />
          <p className="text-sm text-text-secondary mb-4">
            {error ? 'Failed to load lead.' : 'Lead not found.'}
          </p>
          <Link
            to="/leads"
            className="text-sm text-purple hover:text-purple/80 transition-colors"
          >
            ← Back to Leads
          </Link>
        </div>
      </div>
    )
  }

  const { lead, interactions } = data
  const statusKey = lead.status_option?.option_key ?? ''
  const lastInteractionDate = interactions.length > 0 ? interactions[0].date : null
  const daysSinceLastInteraction = daysSince(lastInteractionDate)
  const followUpDays = lead.follow_up_on ? daysSince(lead.follow_up_on) : null

  const infoFields: { label: string; value: string | null | undefined; type?: 'phone' | 'email' | 'link' }[] = [
    { label: 'Phone', value: lead.phone, type: 'phone' as const },
    { label: 'Email', value: lead.email, type: 'email' as const },
    { label: 'Source', value: lead.source },
    { label: 'Industry', value: lead.industry?.replace(/[\[\]]/g, '').replace(/_/g, ' ') },
    { label: 'Other Industry', value: lead.other_industry },
    { label: 'Company Size', value: lead.company_size },
    { label: 'Business Annual Revenue', value: lead.business_annual_revenue },
    { label: 'Website', value: lead.website, type: 'link' as const },
    { label: 'Submission Date', value: formatDate(lead.submission_date) || null },
    { label: 'Booked Sales Call', value: formatDateTime(lead.booked_sales_call_date_time) || null },
    { label: 'Scheduled Callback', value: formatDateTime(lead.scheduled_callback_date_time) || null },
  ].filter((f) => f.value)

  const noteFields: { label: string; value: string | null | undefined }[] = [
    { label: 'Notes', value: lead.notes },
    { label: 'Pain Points', value: lead.pain_points },
    { label: 'Other Pain Points', value: lead.other_pain_points },
    { label: 'Current Systems', value: lead.current_systems },
    { label: 'What to Improve First', value: lead.what_to_improve_first },
    { label: 'Core Business', value: lead.core_business },
    { label: 'Status Justification', value: lead.status_justification },
    { label: 'Cold Call Triage Notes', value: lead.cold_call_triage_notes },
    { label: 'Pitch Script Notes', value: lead.pitch_script_notes },
    { label: 'Appointment Confirmation Notes', value: lead.appointment_confirmation_notes },
  ].filter((f) => f.value)

  return (
    <div className="p-4 md:p-8">
      {/* Back button */}
      <Link
        to="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary">
            {lead.name ?? 'Unnamed Lead'}
          </h1>
          {lead.business_name && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 size={14} className="text-text-secondary" />
              <span className="text-sm text-text-secondary">{lead.business_name}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lead.status_option && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                statusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
              }`}
            >
              {lead.status_option.option_label}
            </span>
          )}
          {lead.kill_list && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-400">
              Kill List
            </span>
          )}
          {lead.interest_level != null && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-muted text-purple">
              Interest: {lead.interest_level}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${
            daysSinceLastInteraction === null
              ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
              : daysSinceLastInteraction <= 7
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : daysSinceLastInteraction <= 30
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <Clock size={12} />
          {daysSinceLastInteraction !== null
            ? `${daysSinceLastInteraction}d since last interaction`
            : 'No interactions'}
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
          <MessageCircle size={12} />
          {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
        </div>

        {lead.follow_up_on && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${
              followUpDays !== null && followUpDays >= 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            }`}
          >
            <Calendar size={12} />
            Follow-up {formatDate(lead.follow_up_on)}
            {followUpDays !== null && followUpDays >= 0 && ' (overdue)'}
          </div>
        )}
      </div>

      {/* Lead info card */}
      {infoFields.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Lead Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {infoFields.map((field) => (
              <div key={field.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  {field.label}
                </p>
                {field.type === 'phone' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary">{field.value}</span>
                    <button
                      onClick={() => setContactModal({ phone: field.value!, action: 'call' })}
                      className="p-1 rounded-lg text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Call"
                    >
                      <PhoneCall size={13} />
                    </button>
                    <button
                      onClick={() => setContactModal({ phone: field.value!, action: 'text' })}
                      className="p-1 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Text"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                ) : field.type === 'email' ? (
                  <a
                    href={`mailto:${field.value}`}
                    className="text-sm text-purple hover:text-purple/80 transition-colors"
                  >
                    {field.value}
                  </a>
                ) : field.type === 'link' ? (
                  <a
                    href={field.value!.startsWith('http') ? field.value! : `https://${field.value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple hover:text-purple/80 transition-colors flex items-center gap-1"
                  >
                    <Globe size={12} />
                    {field.value}
                  </a>
                ) : (
                  <p className="text-sm text-text-primary">{field.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes/context card */}
      {noteFields.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Notes &amp; Context</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {noteFields.map((field) => (
              <div key={field.label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  {field.label}
                </p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactions section */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-text-primary">Interactions</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
          {interactions.length}
        </span>
      </div>

      {interactions.length > 0 ? (
        <div className="space-y-2">
          {interactions.map((interaction) => {
            const typeKey = interaction.type_option?.option_key ?? ''
            const typeLabel = interaction.type_option?.option_label ?? interaction.type ?? 'Unknown'
            const typeColor = interactionTypeColors[typeKey] ?? 'bg-zinc-500/15 text-zinc-400'
            const matchReason = getMatchReason(interaction, lead)

            return (
              <div
                key={interaction.id}
                className="bg-surface rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColor}`}>
                    {typeLabel}
                  </span>
                  {interaction.inbound_outbound && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                        interaction.inbound_outbound === 'Inbound'
                          ? 'bg-zinc-500/15 text-zinc-400'
                          : 'bg-purple-muted text-purple'
                      }`}
                    >
                      {interaction.inbound_outbound}
                    </span>
                  )}
                  {interaction.date && (
                    <span className="text-xs text-text-secondary">
                      {formatDateTime(interaction.date)}
                    </span>
                  )}
                </div>
                {interaction.subject && (
                  <p className="text-sm font-medium text-text-primary mt-1">
                    {interaction.subject}
                  </p>
                )}
                {(interaction.body || interaction.notes) && (
                  <p className="text-xs text-text-secondary line-clamp-3 mt-1">
                    {interaction.body ?? interaction.notes}
                  </p>
                )}
                {matchReason && (
                  <p className="text-xs text-text-secondary/60 italic mt-1">
                    {matchReason}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
          <MessageCircle size={36} className="mb-3 opacity-30" />
          <p className="text-sm">No interactions on record for this lead.</p>
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
    </div>
  )
}
