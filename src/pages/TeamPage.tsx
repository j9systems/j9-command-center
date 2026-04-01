import { useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
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

export default function TeamPage() {
  const navigate = useNavigate()

  const { data: members = [], isLoading: loading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data: teamData } = await supabase
        .from('team')
        .select('*, roles(id, name)')
        .order('first_name')

      if (!teamData) return []

      return teamData.map((m) => ({
        ...m,
        role_option: m.roles as unknown as Role | null,
        roles: undefined,
      })) as (TeamMember & { role_option?: Role | null })[]
    },
  })

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

          return (
            <div
              key={member.id}
              onClick={() => navigate(`/team/${member.id}`)}
              className={`flex items-center gap-4 p-4 bg-surface rounded-xl border border-border cursor-pointer hover:border-purple/30 transition-colors ${!isActive ? 'opacity-50' : ''}`}
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
                {member.role_option && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      roleColors[member.role_option.name] ?? 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {member.role_option.name}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
