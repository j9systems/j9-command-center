import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AccountWithStatus } from '@/types/database'
import AccountCard from '@/components/accounts/AccountCard'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchAccounts() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('accounts')
        .select('*, options!fk_accounts_status(option_key, option_label)')
        .order('company_name')

      if (error) {
        console.error('Error fetching accounts:', error)
        setLoading(false)
        return
      }

      const mapped: AccountWithStatus[] = (data ?? []).map((row) => {
        const opt = row.options as { option_key: string; option_label: string } | null
        return {
          ...row,
          status_label: opt?.option_label ?? null,
          status_key: opt?.option_key ?? null,
          options: undefined,
        } as AccountWithStatus
      })

      setAccounts(mapped)
      setLoading(false)
    }

    fetchAccounts()
  }, [])

  const filtered = accounts.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.company_name?.toLowerCase().includes(q) ||
      a.status_label?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-8 text-text-primary tracking-tight leading-tight">
        Accounts
      </h2>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-5 py-3 bg-input border border-border rounded-md text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-accent focus:shadow-focus transition-all duration-150"
        />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 bg-surface rounded-xl border border-border animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-elevated" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-elevated rounded" />
              </div>
              <div className="h-6 w-20 bg-elevated rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Account list */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">
            {search ? 'No accounts match your search.' : 'No accounts found.'}
          </p>
        </div>
      )}
    </div>
  )
}
