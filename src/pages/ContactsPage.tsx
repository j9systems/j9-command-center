import { useState } from 'react'
import {
  Search,
  Mail,
  Phone,
  Building2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact } from '@/types/database'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  lead: 'bg-amber-500/15 text-amber-400',
  prospect: 'bg-blue-500/15 text-blue-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
  churned: 'bg-red-500/15 text-red-400',
}

const interestColors: Record<string, string> = {
  hot: 'bg-red-500/15 text-red-400',
  warm: 'bg-amber-500/15 text-amber-400',
  cold: 'bg-blue-500/15 text-blue-400',
}

function getStatusClass(status: string | null): string {
  if (!status) return 'bg-zinc-500/15 text-zinc-400'
  return statusColors[status.toLowerCase()] ?? 'bg-purple-500/15 text-purple-400'
}

function getInterestClass(level: string | null): string {
  if (!level) return ''
  return interestColors[level.toLowerCase()] ?? 'bg-zinc-500/15 text-zinc-400'
}

export default function ContactsPage() {
  const [search, setSearch] = useState('')

  const { data: contacts = [], isLoading: loading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .order('first_name', { ascending: true })

      return (data as Contact[]) ?? []
    },
  })

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase()
    return (
      name.includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.company_name?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.toLowerCase().includes(q) ?? false)
    )
  })

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-40 bg-border rounded mb-6" />
          <div className="h-10 bg-border rounded mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Contacts</h2>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder="Search by name, email, company, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 transition-colors"
        />
      </div>

      {/* Results count */}
      <p className="text-xs text-text-secondary mb-3">
        {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
        {search.trim() ? ` matching "${search}"` : ''}
      </p>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">
            {search.trim() ? 'No contacts match your search.' : 'No contacts found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => {
            const name = [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(' ') || 'Unnamed Contact'
            const initials = name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            return (
              <div
                key={contact.id}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-purple/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-purple">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {contact.company_name && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Building2 size={10} />
                        {contact.company_name}
                      </span>
                    )}
                    {contact.email && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Mail size={10} />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="text-xs text-text-secondary flex items-center gap-1">
                        <Phone size={10} />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {contact.interest_level && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${getInterestClass(contact.interest_level)}`}
                    >
                      {contact.interest_level}
                    </span>
                  )}
                  {contact.status && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${getStatusClass(contact.status)}`}
                    >
                      {contact.status}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
