import { Link } from 'react-router-dom'
import type { AccountWithStatus } from '@/types/database'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
  lead: 'bg-amber-500/15 text-amber-400',
  prospect: 'bg-blue-500/15 text-blue-400',
  churned: 'bg-red-500/15 text-red-400',
}

function getStatusColor(key: string | null): string {
  if (!key) return 'bg-zinc-500/15 text-zinc-400'
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(statusColors)) {
    if (lower.includes(k)) return v
  }
  return 'bg-purple-muted text-purple'
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface AccountCardProps {
  account: AccountWithStatus
}

export default function AccountCard({ account }: AccountCardProps) {
  return (
    <Link to={`/accounts/${account.id}`} className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-purple/30 hover:bg-surface-hover transition-all duration-200 cursor-pointer">
      {account.logo_path ? (
        <img
          src={account.logo_path}
          alt={account.company_name ?? 'Account logo'}
          className="w-11 h-11 rounded-lg object-cover bg-black flex-shrink-0"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = 'none'
            target.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <div
        className={`w-11 h-11 rounded-lg bg-purple-muted flex items-center justify-center text-purple text-sm font-semibold flex-shrink-0 ${account.logo_path ? 'hidden' : ''}`}
      >
        {getInitials(account.company_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {account.company_name ?? 'Unnamed Account'}
        </p>
      </div>
      {account.status_label && (
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${getStatusColor(account.status_key)}`}
        >
          {account.status_label}
        </span>
      )}
    </Link>
  )
}
