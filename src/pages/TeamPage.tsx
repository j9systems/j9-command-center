import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
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

export default function TeamPage() {
  const [members, setMembers] = useState<(TeamMember & { role_option?: Role | null })[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (rolesData) {
        setRoles(rolesData as Role[])
      }

      const { data: teamData } = await supabase
        .from('team')
        .select('*, roles(id, name)')
        .order('first_name')

      if (teamData) {
        setMembers(
          teamData.map((m) => ({
            ...m,
            role_option: m.roles as unknown as Role | null,
            roles: undefined,
          })) as (TeamMember & { role_option?: Role | null })[]
        )
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  async function handleRoleChange(memberId: string, roleId: number | null) {
    setUpdatingId(memberId)
    const { error } = await supabase
      .from('team')
      .update({ role_id: roleId || null })
      .eq('id', memberId)

    if (!error) {
      const newRole = roleId ? (roles.find((r) => r.id === roleId) ?? null) : null
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, role_id: roleId, role_option: newRole } : m
        )
      )
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-text-primary">Team</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-text-primary">Team</h2>
      <div className="space-y-2">
        {members.map((member) => {
          const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unknown'
          const isActive = member.active === 'true' || member.active === '3'
          const isUpdating = updatingId === member.id

          return (
            <div
              key={member.id}
              className={`flex items-center gap-4 p-4 bg-surface rounded-xl border border-border ${!isActive ? 'opacity-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User size={18} className="text-purple" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                  {!isActive && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
                      Inactive
                    </span>
                  )}
                </div>
                {member.email && (
                  <p className="text-xs text-text-secondary truncate mt-0.5">{member.email}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {member.role_option && !isUpdating && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      roleColors[member.role_option.name] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {member.role_option.name}
                  </span>
                )}
                <select
                  value={member.role_id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    handleRoleChange(member.id, val ? Number(val) : null)
                  }}
                  disabled={isUpdating}
                  className="bg-black/30 border border-border rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-purple/50 disabled:opacity-50"
                >
                  <option value="">No role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
