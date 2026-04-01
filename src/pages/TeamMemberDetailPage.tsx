import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Save, Mail, Phone } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TeamMember, Role } from '@/types/database'

const roleColors: Record<string, string> = {
  'Account Manager': 'bg-purple-500/15 text-purple-400',
  'Developer': 'bg-blue-500/15 text-blue-400',
  'Executive Sponsor': 'bg-amber-500/15 text-amber-400',
  'Admin': 'bg-emerald-500/15 text-emerald-400',
  'Contractor': 'bg-cyan-500/15 text-cyan-400',
  'Sales': 'bg-orange-500/15 text-orange-400',
}

type TeamMemberFull = TeamMember & {
  role_option?: Role | null
  payouts_commission_: number | null
  payouts_contractor_rate: string | null
  payouts_additional_commission_for_lead_close: number | null
}

export default function TeamMemberDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [member, setMember] = useState<TeamMemberFull | null>(null)
  const [saving, setSaving] = useState(false)
  const [commission, setCommission] = useState('')
  const [salesCommission, setSalesCommission] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [roleId, setRoleId] = useState('')

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['team-member', teamId],
    queryFn: async () => {
      const [{ data }, { data: rolesData }] = await Promise.all([
        supabase
          .from('team')
          .select('*, roles(id, name)')
          .eq('id', teamId!)
          .single(),
        supabase
          .from('roles')
          .select('*')
          .order('name'),
      ])

      if (data) {
        const mapped: TeamMemberFull = {
          ...data,
          role_option: data.roles as unknown as Role | null,
          roles: undefined,
          payouts_commission_: data.payouts_commission_,
          payouts_contractor_rate: data.payouts_contractor_rate,
          payouts_additional_commission_for_lead_close: data.payouts_additional_commission_for_lead_close,
        } as TeamMemberFull
        setMember(mapped)
        setCommission(data.payouts_commission_?.toString() ?? '')
        setSalesCommission(data.payouts_additional_commission_for_lead_close?.toString() ?? '')
        setHourlyRate(data.payouts_contractor_rate ?? '')
        setRoleId(data.role_id?.toString() ?? '')
      }

      return { roles: (rolesData as Role[]) ?? [] }
    },
    enabled: !!teamId,
  })

  const roles = queryData?.roles ?? []

  async function handleSave() {
    if (!teamId) return
    setSaving(true)

    await supabase
      .from('team')
      .update({
        payouts_commission_: commission ? parseInt(commission) : null,
        payouts_contractor_rate: hourlyRate || null,
        payouts_additional_commission_for_lead_close: salesCommission ? parseInt(salesCommission) : null,
        role_id: roleId ? parseInt(roleId) : null,
      })
      .eq('id', teamId)

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-border rounded" />
          <div className="h-32 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link to="/team" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4">
          <ArrowLeft size={16} />
          Back to Team
        </Link>
        <p className="text-sm text-text-secondary">Team member not found.</p>
      </div>
    )
  }

  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unknown'
  const isActive = member.active === 'true' || member.active === '3'

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link to="/team" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6">
        <ArrowLeft size={16} />
        Back to Team
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
          {member.photo ? (
            <img src={member.photo} alt={name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <User size={24} className="text-purple" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">{name}</h1>
            {!isActive && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {member.role_option && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColors[member.role_option.name] ?? 'bg-zinc-500/15 text-zinc-400'}`}>
                {member.role_option.name}
              </span>
            )}
          </div>
          <div className="mt-2">
            <label className="block text-xs text-text-secondary mb-1">Role</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="text-sm bg-black/20 border border-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-purple/50"
            >
              <option value="">No role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Contact</h3>
        <div className="space-y-2">
          {member.email && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Mail size={14} />
              {member.email}
            </div>
          )}
          {member.personal_email && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Mail size={14} />
              {member.personal_email}
              <span className="text-[10px] text-text-secondary/50">(personal)</span>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Phone size={14} />
              {member.phone}
            </div>
          )}
        </div>
      </div>

      {/* Payouts / Rates */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Payout Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Default Commission (%)</label>
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="e.g. 10"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Sales Commission for Lead Close (%)</label>
            <input
              type="number"
              value={salesCommission}
              onChange={(e) => setSalesCommission(e.target.value)}
              placeholder="e.g. 5"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Default Hourly Rate ($)</label>
            <input
              type="text"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 50"
              className="w-full text-sm bg-black/20 border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple text-white rounded-lg hover:bg-purple/90 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
