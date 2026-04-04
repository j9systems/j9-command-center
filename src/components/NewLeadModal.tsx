import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
}

export default function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')

  if (!open) return null

  function resetForm() {
    setName('')
    setEmail('')
    setPhone('')
    setBusinessName('')
    setWebsite('')
    setSource('')
    setNotes('')
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      business_name: businessName.trim() || null,
      website: website.trim() || null,
      source: source.trim() || null,
      notes: notes.trim() || null,
      submission_date: new Date().toISOString(),
    })

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      resetForm()
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border p-5 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">New Lead</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lead name"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Company name"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Referral, Website, Cold Call"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any initial notes..."
              rows={3}
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full mt-4 px-4 py-2 text-sm font-medium bg-purple/15 text-purple border border-purple/20 rounded-lg hover:bg-purple/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Create Lead'}
        </button>
      </div>
    </div>
  )
}
