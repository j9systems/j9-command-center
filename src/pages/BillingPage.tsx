import { useState, useEffect } from 'react'
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
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
  retainer_quarters?: { paid_out: boolean | null }[]
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('invoices')
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [payments, setPayments] = useState<PaymentWithAccount[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('')
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [newPaymentAccount, setNewPaymentAccount] = useState('')
  const [newPaymentDate, setNewPaymentDate] = useState('')
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentIsRetainer, setNewPaymentIsRetainer] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const [
        { data: invoicesData },
        { data: paymentsData },
        { data: statusOpts },
        { data: accountsData },
        { data: retainerQuartersData },
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
          .select('id, company_name, quickbooks_id')
          .order('company_name', { ascending: true }),
        supabase
          .from('retainer_payout_quarters')
          .select('retainer_payment_id, paid_out'),
      ])

      // Build a map of payment_id -> quarters for retainer display
      const quartersByPayment: Record<string, { paid_out: boolean | null }[]> = {}
      if (retainerQuartersData) {
        for (const q of retainerQuartersData) {
          const pid = q.retainer_payment_id as string
          if (!quartersByPayment[pid]) quartersByPayment[pid] = []
          quartersByPayment[pid].push({ paid_out: q.paid_out as boolean | null })
        }
      }

      const mappedInvoices: InvoiceWithDetails[] = invoicesData
        ? invoicesData.map((inv) => ({
            ...inv,
            account: inv.accounts as { id: string; company_name: string | null } | null,
            project: inv.projects as { name: string | null } | null,
            status_option: inv.options as unknown as Option | null,
            accounts: undefined,
            projects: undefined,
            options: undefined,
          })) as InvoiceWithDetails[]
        : []

      const mappedPayments: PaymentWithAccount[] = paymentsData
        ? paymentsData.map((p) => ({
            ...p,
            account: p.accounts as { id: string; company_name: string | null } | null,
            accounts: undefined,
            retainer_quarters: quartersByPayment[p.row_id] || undefined,
          })) as PaymentWithAccount[]
        : []

      return {
        invoices: mappedInvoices,
        payments: mappedPayments,
        statusOptions: (statusOpts as Option[]) ?? [],
        accounts: (accountsData as Account[]) ?? [],
      }
    },
  })

  useEffect(() => {
    if (!queryData) return
    if (queryData.invoices) setInvoices(queryData.invoices)
    if (queryData.payments) setPayments(queryData.payments)
  }, [queryData])

  const statusOptions = queryData?.statusOptions ?? []
  const accounts = queryData?.accounts ?? []

  function getFilteredInvoices(): InvoiceWithDetails[] {
    let filtered = invoices

    if (statusFilter) {
      filtered = filtered.filter((inv) => inv.status_option?.option_key === statusFilter)
    }

    if (clientFilter) {
      filtered = filtered.filter((inv) => inv.account?.id === clientFilter)
    }

    // Sort by invoice date (created_date), most recent first
    return filtered.sort((a, b) => {
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

  async function handleDeleteInvoice(e: React.MouseEvent, invoiceId: string) {
    e.preventDefault()
    e.stopPropagation()
    const { error } = await supabase.from('invoices').delete().eq('row_id', invoiceId)
    if (!error) {
      setInvoices((prev) => prev.filter((inv) => inv.row_id !== invoiceId))
    }
  }

  const [commissionToast, setCommissionToast] = useState<{ type: 'success' | 'warning'; message: string } | null>(null)

  async function handleMarkPaid(e: React.MouseEvent, invoiceId: string) {
    e.preventDefault()
    e.stopPropagation()
    const paidOption = statusOptions.find((o) => o.option_key === 'paid')
    if (!paidOption) return
    const { error } = await supabase
      .from('invoices')
      .update({ status_id: paidOption.id })
      .eq('row_id', invoiceId)
    if (!error) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.row_id === invoiceId
            ? { ...inv, status_id: paidOption.id, status_option: paidOption }
            : inv
        )
      )

      // Fire commission processing in the background — never blocks the UI
      ;(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-invoice-payment-commissions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ invoice_id: invoiceId }),
          })
          const result = await res.json()
          if (result.skipped) {
            // Non-hourly account — do nothing
          } else if (result.success) {
            setCommissionToast({ type: 'success', message: 'Commission lines generated' })
            setTimeout(() => setCommissionToast(null), 3000)
          } else {
            console.error('Commission processing failed:', result)
            setCommissionToast({ type: 'warning', message: 'Invoice marked paid, but commission processing failed. Check payroll.' })
            setTimeout(() => setCommissionToast(null), 5000)
          }
        } catch (err) {
          console.error('Commission edge function error:', err)
          setCommissionToast({ type: 'warning', message: 'Invoice marked paid, but commission processing failed. Check payroll.' })
          setTimeout(() => setCommissionToast(null), 5000)
        }
      })()
    }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!newPaymentAmount || !newPaymentDate) return
    setSavingPayment(true)

    const selectedAccount = accounts.find((a) => a.id === newPaymentAccount)
    const rowId = crypto.randomUUID()

    const { data, error } = await supabase
      .from('payments')
      .insert({
        row_id: rowId,
        customer_qb_id: selectedAccount?.quickbooks_id ?? null,
        date: newPaymentDate,
        amount: parseFloat(newPaymentAmount),
        is_retainer: newPaymentIsRetainer ? true : null,
      })
      .select()

    if (!error && data) {
      setPayments((prev) => [
        {
          ...data[0],
          account: selectedAccount ? { id: selectedAccount.id, company_name: selectedAccount.company_name } : null,
        } as PaymentWithAccount,
        ...prev,
      ])
      setShowNewPayment(false)
      setNewPaymentAccount('')
      setNewPaymentDate('')
      setNewPaymentAmount('')
      setNewPaymentIsRetainer(false)
    }
    setSavingPayment(false)
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

      {/* Commission toast */}
      {commissionToast && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-4 ${
          commissionToast.type === 'success'
            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
        }`}>
          {commissionToast.message}
        </div>
      )}

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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusKey === 'sent' && (
                          <button
                            onClick={(e) => handleMarkPaid(e, inv.row_id)}
                            className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle size={10} />
                            Mark Paid
                          </button>
                        )}
                        {statusKey !== 'paid' && (
                          <button
                            onClick={(e) => handleDeleteInvoice(e, inv.row_id)}
                            className="text-[10px] font-medium px-2 py-1 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        )}
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
            <button
              onClick={() => setShowNewPayment((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-purple text-white hover:bg-purple/90 transition-colors"
            >
              <Plus size={14} />
              Record Payment
            </button>
            <span className="text-sm text-text-secondary ml-auto">
              {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
            </span>
          </div>

          {showNewPayment && (
            <form
              onSubmit={handleCreatePayment}
              className="p-4 mb-4 bg-surface rounded-xl border border-border space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Client</label>
                  <select
                    value={newPaymentAccount}
                    onChange={(e) => setNewPaymentAccount(e.target.value)}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                  >
                    <option value="">Select client...</option>
                    {accounts.filter((a) => a.company_name).map((a) => (
                      <option key={a.id} value={a.id}>{a.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Date</label>
                  <input
                    type="date"
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    required
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPaymentIsRetainer}
                      onChange={(e) => setNewPaymentIsRetainer(e.target.checked)}
                      className="rounded border-border"
                    />
                    Retainer
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-purple text-white hover:bg-purple/90 transition-colors disabled:opacity-50"
                >
                  {savingPayment ? 'Saving...' : 'Save Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewPayment(false)}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((payment) => {
                const isRetainer = payment.is_retainer === true || payment.is_retainer === 'true' || (typeof payment.is_retainer === 'object' && payment.is_retainer !== null)
                const quarters = payment.retainer_quarters
                const paidOutCount = quarters ? quarters.filter((q) => q.paid_out === true).length : 0
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
                          {isRetainer && quarters && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400">
                              {paidOutCount}/4 payouts made
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
