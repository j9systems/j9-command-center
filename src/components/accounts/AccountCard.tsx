import type { AccountWithStatus } from '@/types/database'

const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  inactive: 'bg-[rgba(255,255,255,0.06)] text-text-secondary',
  lead: 'bg-warning-bg text-warning',
  prospect: 'bg-info-bg text-info',
  churned: 'bg-danger-bg text-danger',
}

function getStatusColor(key: string | null): string {
  if (!key) return 'bg-[rgba(255,255,255,0.06)] text-text-secondary'
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(statusColors)) {
    if (lower.includes(k)) return v
  }
  return 'bg-accent-glow text-accent'
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
    <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-border-emphasis hover:bg-elevated shadow-card transition-all duration-150 cursor-pointer">
      {account.logo_path ? (
        <img
          src={account.logo_path}
          alt={account.company_name ?? 'Account logo'}
          className="w-9 h-9 rounded-full object-cover bg-canvas flex-shrink-0"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = 'none'
            target.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <div
        className={`w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${account.logo_path ? 'hidden' : ''}`}
      >
        {getInitials(account.company_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-text-primary truncate">
          {account.company_name ?? 'Unnamed Account'}
        </p>
      </div>
      {account.status_label && (
        <span
          className={`text-xs font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full flex-shrink-0 ${getStatusColor(account.status_key)}`}
        >
          {account.status_label}
        </span>
      )}
    </div>
  )
}
