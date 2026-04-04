import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AccountListItem, Option } from '@/types/database'
import AccountCard from '@/components/accounts/AccountCard'
import MobileFormOverlay from '@/components/MobileFormOverlay'
import { useCurrentRole } from '@/hooks/useCurrentRole'

export default function AccountsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [assignedAccountIds, setAssignedAccountIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusOptions, setStatusOptions] = useState<Option[]>([])
  const [newName, setNewName] = useState('')
  const [newStatusId, setNewStatusId] = useState('')
  const role = useCurrentRole()
  const canViewAll = role === 'Admin' || role === 'Sales'
  const isContractor = role === 'Contractor'
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setLoading(false)
        return
      }

      // Run team lookup, accounts query, and status options in parallel
      const [teamResult, accountsResult, statusResult] = await Promise.all([
        supabase
          .from('team')
          .select('id')
          .eq('email', session.user.email!)
          .maybeSingle(),
        supabase
          .from('accounts')
          .select('id, company_name, logo_path, options!fk_accounts_status(option_key, option_label)')
          .order('company_name'),
        supabase
          .from('options')
          .select('id, option_label')
          .eq('category', 'account_status'),
      ])

      // Fetch assigned accounts (depends on team lookup)
      if (teamResult.data?.id) {
        const { data: accountTeamData } = await supabase
          .from('account_team')
          .select('account_id')
          .eq('team_member_id', teamResult.data.id)

        if (accountTeamData) {
          setAssignedAccountIds(new Set(accountTeamData.map((at) => at.account_id).filter(Boolean) as string[]))
        }
      }

      if (statusResult.data) setStatusOptions(statusResult.data as Option[])

      if (accountsResult.error) {
        console.error('Error fetching accounts:', accountsResult.error)
        setLoading(false)
        return
      }

      const mapped: AccountListItem[] = (accountsResult.data ?? []).map((row) => {
        const opt = row.options as unknown as { option_key: string; option_label: string } | null
        return {
          id: row.id,
          company_name: row.company_name,
          logo_path: row.logo_path,
          status_label: opt?.option_label ?? null,
          status_key: opt?.option_key ?? null,
        }
      })

      setAccounts(mapped)
      setLoading(false)
    }

    fetchData()
  }, [])

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)

    const id = crypto.randomUUID()
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        id,
        company_name: newName.trim(),
        status: newStatusId ? Number(newStatusId) : null,
      })
      .select('id, company_name, logo_path, options!fk_accounts_status(option_key, option_label)')
      .single()

    if (data && !error) {
      const opt = data.options as unknown as { option_key: string; option_label: string } | null
      const newAccount: AccountListItem = {
        id: data.id,
        company_name: data.company_name,
        logo_path: data.logo_path,
        status_label: opt?.option_label ?? null,
        status_key: opt?.option_key ?? null,
      }
      setAccounts((prev) => [newAccount, ...prev].sort((a, b) =>
        (a.company_name ?? '').localeCompare(b.company_name ?? '')
      ))
      setNewName('')
      setNewStatusId('')
      setShowForm(false)
      navigate(`/accounts/${id}`)
    }
    setSaving(false)
  }

  const filtered = accounts.filter((a) => {
    // Contractors: RLS already scopes to assigned accounts, show all returned rows
    // Other roles: filter by team assignment unless showing all
    if (!isContractor && !showAll && !assignedAccountIds.has(a.id)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.company_name?.toLowerCase().includes(q) ||
      a.status_label?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Accounts</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors"
          >
            <Plus size={14} />
            New Account
          </button>
        )}
      </div>

      {/* New account form */}
      {showForm && (
        <MobileFormOverlay title="New Account" onClose={() => setShowForm(false)}>
          <form
            onSubmit={handleCreateAccount}
            className="mb-6 p-4 md:bg-surface rounded-lg md:border md:border-border space-y-3"
          >
            <div className="hidden md:flex items-center justify-between mb-1">
              <h3 className="text-sm font-medium text-text-primary">New Account</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Company name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">Status</label>
              <select
                value={newStatusId}
                onChange={(e) => setNewStatusId(e.target.value)}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
              >
                <option value="">No status</option>
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id.toString()}>{s.option_label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={!newName.trim() || saving}
                className="text-xs font-medium px-4 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-medium px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </MobileFormOverlay>
      )}

      {/* All accounts toggle - Admin and Sales only (hidden for Contractors) */}
      {canViewAll && !isContractor && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowAll(false)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              !showAll
                ? 'bg-purple text-white'
                : 'border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            My Accounts
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              showAll
                ? 'bg-purple text-white'
                : 'border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            All Accounts
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/25 transition-colors"
        />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border animate-pulse"
            >
              <div className="w-11 h-11 rounded-lg bg-border" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-border rounded" />
              </div>
              <div className="h-6 w-16 bg-border rounded-full" />
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
          <p className="text-text-secondary text-sm">
            {search ? 'No accounts match your search.' : 'No accounts found.'}
          </p>
        </div>
      )}
    </div>
  )
}
