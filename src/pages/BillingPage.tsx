import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  FileText,
  DollarSign,
  CalendarDays,
  Building2,
  Filter,
  X,
  FolderKanban,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Invoice, Payment, Option, Account } from '@/types/database'

type TabKey = 'invoices' | 'payments'

const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'payments', label: 'Payments Received', icon: DollarSign },
]

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  sent: 'bg-blue-500/15 text-blue-400',
  draft: 'bg-zinc-500/15 text-zinc-400',
  overdue: 'bg-red-500/15 text-red-400',
  pending: 'bg-amber-500/15 text-amber-400',
}

type InvoiceWithDetails = Invoice & {
  account?: { id: string; company_name: string | null } | null
  project?: { name: string | null } | null
  status_option?: Option | null
}

type PaymentWithAccount = Payment & {
  account?: { id: string; company_name: string | null } | null
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('invoices')
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [payments, setPayments] = useState<PaymentWithAccount[]>([])
  const [statusOptions, setStatusOptions] = useState<Option[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [
        { data: invoicesData },
        { data: paymentsData },
        { data: statusOpts },
        { data: accountsData },
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, accounts!fk_invoices_account_id(id, company_name), projects!fk_invoices_project_id(name), options!fk_invoices_status_id(id, option_key, option_label)')
          .order('created_date', { ascending: false }),
        supabase
          .from('payments')
          .select('*, accounts!fk_payments_customer_qb_id(id, company_name)')
          .order('date', { ascending: false }),
        supabase
          .from('options')
          .select('*')
          .eq('category', 'invoice_status'),
        supabase
          .from('accounts')
          .select('id, company_name')
          .order('company_name', { ascending: true }),
      ])

      if (invoicesData) {
        setInvoices(
          invoicesData.map((inv) => ({
            ...inv,
            account: inv.accounts as { id: string; company_name: string | null } | null,
            project: inv.projects as { name: string | null } | null,
            status_option: inv.options as unknown as Option | null,
            accounts: undefined,
            projects: undefined,
            options: undefined,
          })) as InvoiceWithDetails[]
        )
      }

      if (paymentsData) {
        setPayments(
          paymentsData.map((p) => ({
            ...p,
            account: p.accounts as { id: string; company_name: string | null } | null,
            accounts: undefined,
          })) as PaymentWithAccount[]
        )
      }

      if (statusOpts) setStatusOptions(statusOpts as Option[])
      if (accountsData) setAccounts(accountsData as Account[])
      setLoading(false)
    }

    fetchData()
  }, [])

  function getFilteredInvoices(): InvoiceWithDetails[] {
    let filtered = invoices

    if (statusFilter) {
      filtered = filtered.filter((inv) => inv.status_option?.option_key === statusFilter)
    }

    if (clientFilter) {
      filtered = filtered.filter((inv) => inv.account?.id === clientFilter)
    }

    // Sort: unsent (no sent_date) at top, then by created_date descending
    return filtered.sort((a, b) => {
      const aUnsent = !a.sent_date
      const bUnsent = !b.sent_date
      if (aUnsent !== bUnsent) return aUnsent ? -1 : 1
      const aDate = a.created_date ?? ''
      const bDate = b.created_date ?? ''
      return bDate.localeCompare(aDate)
    })
  }

  const filteredInvoices = getFilteredInvoices()

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatCurrency(amount: number | null): string {
    if (amount == null) return '$0.00'
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-border rounded mb-6" />
          <div className="h-10 bg-border rounded mb-4" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-surface rounded-xl border border-border" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === tab.key
                ? 'text-purple border-purple'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm bg-surface border border-border rounded-lg pl-8 pr-8 py-2 text-text-primary focus:outline-none focus:border-purple/50 appearance-none"
              >
                <option value="">All Statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt.id} value={opt.option_key ?? ''}>
                    {opt.option_label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="text-sm bg-surface border border-border rounded-lg pl-8 pr-8 py-2 text-text-primary focus:outline-none focus:border-purple/50 appearance-none"
              >
                <option value="">All Clients</option>
                {accounts
                  .filter((a) => a.company_name)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company_name}
                    </option>
                  ))}
              </select>
            </div>
            {(statusFilter || clientFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setClientFilter('') }}
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={12} />
                Clear
              </button>
            )}
            <span className="text-sm text-text-secondary ml-auto">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>

          {/* Invoice list */}
          {filteredInvoices.length > 0 ? (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => {
                const statusKey = inv.status_option?.option_key?.toLowerCase() ?? ''
                return (
                  <Link
                    key={inv.row_id}
                    to={`/billing/invoices/${inv.row_id}`}
                    className="block p-4 bg-surface rounded-xl border border-border hover:border-purple/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatCurrency(inv.amount)}
                          </p>
                          {inv.status_option && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                invoiceStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                              }`}
                            >
                              {inv.status_option.option_label}
                            </span>
                          )}
                          {!inv.sent_date && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                              Unsent
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {inv.account?.company_name && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <Building2 size={10} />
                              {inv.account.company_name}
                            </span>
                          )}
                          {inv.project?.name && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <FolderKanban size={10} />
                              {inv.project.name}
                            </span>
                          )}
                          {inv.created_date && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <CalendarDays size={10} />
                              Created {formatDate(inv.created_date)}
                            </span>
                          )}
                          {inv.sent_date && (
                            <span className="text-xs text-text-secondary">
                              Sent {formatDate(inv.sent_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <FileText size={36} className="mb-3 opacity-30" />
              <p className="text-sm">No invoices found.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'payments' && (
        <>
          <div className="flex items-center mb-4">
            <span className="text-sm text-text-secondary ml-auto">
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
            </span>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((payment) => {
                const isRetainer = payment.is_retainer === true || payment.is_retainer === 'true' || (typeof payment.is_retainer === 'object' && payment.is_retainer !== null)
                return (
                  <Link
                    key={payment.row_id}
                    to={`/billing/payments/${payment.row_id}`}
                    className="block p-4 bg-surface rounded-xl border border-border hover:border-purple/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">
                            {formatCurrency(payment.amount)}
                          </p>
                          {isRetainer && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-muted text-purple">
                              Retainer
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          {payment.account?.company_name && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <Building2 size={10} />
                              {payment.account.company_name}
                            </span>
                          )}
                          {payment.date && (
                            <span className="text-xs text-text-secondary flex items-center gap-1">
                              <CalendarDays size={10} />
                              {formatDate(payment.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <DollarSign size={36} className="mb-3 opacity-30" />
              <p className="text-sm">No payments received.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
