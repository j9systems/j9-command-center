import { useEffect, useState } from 'react'
import { X, Plus, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Contact, TeamMember } from '@/types/database'
import MobileFormOverlay from './MobileFormOverlay'

interface Attendee {
  email: string
  label: string
  source: 'contact' | 'team' | 'custom'
}

export default function NewMeetingModal({
  accountId,
  accountContacts,
  onClose,
  onCreated,
}: {
  accountId: string
  accountContacts: { contact: Contact }[]
  onClose: () => void
  onCreated: () => void
}) {
  // Form fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [addMeet, setAddMeet] = useState(true)

  // Attendees
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [customEmail, setCustomEmail] = useState('')

  // Contact search
  const [contactSearch, setContactSearch] = useState('')
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)

  // Team search
  const [teamSearch, setTeamSearch] = useState('')
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)

  // Submission
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchTeam() {
      const { data } = await supabase
        .from('team')
        .select('id, first_name, last_name, email, photo')
        .eq('active', 'true')
      if (data) setTeamMembers(data as TeamMember[])
    }
    fetchTeam()
  }, [])

  // Filtered lists for dropdowns
  const filteredContacts = accountContacts
    .filter((ac) => {
      const c = ac.contact
      if (!c.email) return false
      if (attendees.some((a) => a.email === c.email)) return false
      if (!contactSearch) return true
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''} ${c.email}`.toLowerCase()
      return name.includes(contactSearch.toLowerCase())
    })

  const filteredTeam = teamMembers
    .filter((t) => {
      if (!t.email) return false
      if (attendees.some((a) => a.email === t.email)) return false
      if (!teamSearch) return true
      const name = `${t.first_name ?? ''} ${t.last_name ?? ''} ${t.email}`.toLowerCase()
      return name.includes(teamSearch.toLowerCase())
    })

  function addAttendee(attendee: Attendee) {
    if (attendees.some((a) => a.email === attendee.email)) return
    setAttendees((prev) => [...prev, attendee])
  }

  function removeAttendee(email: string) {
    setAttendees((prev) => prev.filter((a) => a.email !== email))
  }

  function handleAddCustomEmail() {
    const trimmed = customEmail.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return
    addAttendee({ email: trimmed, label: trimmed, source: 'custom' })
    setCustomEmail('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !date || !startTime || !endTime) {
      setError('Please fill in all required fields.')
      return
    }

    const meetingStart = new Date(`${date}T${startTime}`).toISOString()
    const meetingEnd = new Date(`${date}T${endTime}`).toISOString()

    // Dedupe emails
    const attendeeEmails = [...new Set(attendees.map((a) => a.email))]

    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        setError('Not authenticated. Please log in again.')
        setSaving(false)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) {
        setError('Could not determine current user.')
        setSaving(false)
        return
      }

      const res = await fetch(
        'https://yqggwvpprgpxjylpxinm.supabase.co/functions/v1/calendar-event-write',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            user_id: userId,
            meeting: {
              name: title.trim(),
              description_agenda: description.trim() || null,
              meeting_start: meetingStart,
              meeting_end: meetingEnd,
              location: location.trim() || null,
              add_meet: addMeet,
              attendee_emails: attendeeEmails,
              account_id: accountId,
            },
          }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? body?.message ?? `Request failed (${res.status})`)
      }

      setSuccess(true)
      setTimeout(() => {
        onCreated()
        onClose()
      }, 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50'
  const labelClass = 'text-[10px] text-text-secondary uppercase tracking-wider mb-1 block'

  return (
    <MobileFormOverlay title="New Meeting" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 md:bg-black/20 rounded-lg md:border md:border-border/50 space-y-4">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-text-primary">New Meeting</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>Title *</label>
          <input type="text" placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
        </div>

        {/* Date / Start / End */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Start *</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>End *</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} required />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description / Agenda</label>
          <textarea placeholder="Meeting agenda or notes..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>

        {/* Location */}
        <div>
          <label className={labelClass}>Location</label>
          <input type="text" placeholder="Office, room, address..." value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </div>

        {/* Google Meet toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddMeet(!addMeet)}
            className={`relative w-9 h-5 rounded-full transition-colors ${addMeet ? 'bg-purple' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${addMeet ? 'translate-x-4' : ''}`} />
          </button>
          <span className="text-xs text-text-secondary">Add Google Meet link</span>
        </div>

        {/* Selected attendees chips */}
        {attendees.length > 0 && (
          <div>
            <label className={labelClass}>Selected Attendees ({attendees.length})</label>
            <div className="flex flex-wrap gap-1.5">
              {attendees.map((a) => (
                <span key={a.email} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-purple-muted text-purple">
                  {a.label}
                  <button type="button" onClick={() => removeAttendee(a.email)} className="hover:text-white transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attendees section */}
        <div className="space-y-3">
          <label className={labelClass}>Add Attendees</label>

          {/* Account Contacts dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-text-secondary">Account Contacts</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                onFocus={() => setContactDropdownOpen(true)}
                className={`${inputClass} pl-8`}
              />
            </div>
            {contactDropdownOpen && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
                {filteredContacts.map((ac) => {
                  const c = ac.contact
                  const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        addAttendee({ email: c.email!, label: name || c.email!, source: 'contact' })
                        setContactSearch('')
                        setContactDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-muted/50 transition-colors"
                    >
                      <p className="text-sm text-text-primary">{name || 'Unnamed'}</p>
                      <p className="text-[11px] text-text-secondary">{c.email}</p>
                    </button>
                  )
                })}
              </div>
            )}
            {contactDropdownOpen && filteredContacts.length === 0 && contactSearch && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg px-3 py-2">
                <p className="text-xs text-text-secondary">No matching contacts</p>
              </div>
            )}
            {/* Click-away */}
            {contactDropdownOpen && (
              <div className="fixed inset-0 z-[5]" onClick={() => setContactDropdownOpen(false)} />
            )}
          </div>

          {/* Internal Team dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-text-secondary">Internal Team</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
              <input
                type="text"
                placeholder="Search team members..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                onFocus={() => setTeamDropdownOpen(true)}
                className={`${inputClass} pl-8`}
              />
            </div>
            {teamDropdownOpen && filteredTeam.length > 0 && (
              <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg">
                {filteredTeam.map((t) => {
                  const name = [t.first_name, t.last_name].filter(Boolean).join(' ')
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        addAttendee({ email: t.email!, label: name || t.email!, source: 'team' })
                        setTeamSearch('')
                        setTeamDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-muted/50 transition-colors"
                    >
                      <p className="text-sm text-text-primary">{name || 'Unnamed'}</p>
                      <p className="text-[11px] text-text-secondary">{t.email}</p>
                    </button>
                  )
                })}
              </div>
            )}
            {teamDropdownOpen && filteredTeam.length === 0 && teamSearch && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg px-3 py-2">
                <p className="text-xs text-text-secondary">No matching team members</p>
              </div>
            )}
            {teamDropdownOpen && (
              <div className="fixed inset-0 z-[5]" onClick={() => setTeamDropdownOpen(false)} />
            )}
          </div>

          {/* Custom email */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-text-secondary">Custom Email</span>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomEmail()
                  }
                }}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleAddCustomEmail}
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            Meeting created successfully!
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving || success}
            className="text-xs font-medium px-4 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Creating...' : success ? 'Created!' : 'Create Meeting'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </MobileFormOverlay>
  )
}
