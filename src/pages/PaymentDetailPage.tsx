import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  CalendarDays,
  Building2,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Payment, RetainerPayoutQuarter } from '@/types/database'

type PaymentWithAccount = Payment & {
  account?: { id: string; company_name: string | null } | null
}

export default function PaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      const [{ data: paymentData }, { data: quartersData }] = await Promise.all([
        supabase
          .from('payments')
          .select('*, accounts!fk_payments_customer_qb_id(id, company_name)')
          .eq('row_id', paymentId!)
          .single(),
        supabase
          .from('retainer_payout_quarters')
          .select('*')
          .eq('retainer_payment_id', paymentId!)
          .order('created_date', { ascending: true }),
      ])

      const payment: PaymentWithAccount | null = paymentData
        ? {
            ...paymentData,
            account: paymentData.accounts as { id: string; company_name: string | null } | null,
            accounts: undefined,
          } as PaymentWithAccount
        : null

      return {
        payment,
        payoutQuarters: (quartersData as RetainerPayoutQuarter[]) ?? [],
      }
    },
    enabled: !!paymentId,
  })

  const payment = queryData?.payment ?? null
  const payoutQuarters = queryData?.payoutQuarters ?? []

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
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-border rounded mb-6" />
          <div className="h-8 w-64 bg-border rounded mb-4" />
          <div className="h-48 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link
          to="/billing"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Billing
        </Link>
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">Payment not found.</p>
        </div>
      </div>
    )
  }

  const isRetainer = payment.is_retainer === true || payment.is_retainer === 'true' || (typeof payment.is_retainer === 'object' && payment.is_retainer !== null)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Billing
      </Link>

      {/* Payment header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <DollarSign size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              {formatCurrency(payment.amount)}
            </h1>
            {isRetainer && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-muted text-purple self-start">
                Retainer
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {payment.account?.company_name && (
              <Link
                to={`/accounts/${payment.account.id}`}
                className="text-sm text-text-secondary hover:text-purple flex items-center gap-1.5 transition-colors"
              >
                <Building2 size={13} />
                {payment.account.company_name}
              </Link>
            )}
            {payment.date && (
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <CalendarDays size={13} />
                {formatDate(payment.date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Payment details card */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {payment.customer_qb_id != null && (
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Customer QB ID</p>
              <p className="text-sm font-medium text-text-primary">{payment.customer_qb_id}</p>
            </div>
          )}
          {payment.qb_invoice_id != null && (
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">QB Invoice ID</p>
              <p className="text-sm font-medium text-text-primary">{payment.qb_invoice_id}</p>
            </div>
          )}
          {payment.qb_invoice_id_ref && (
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Invoice Ref</p>
              <p className="text-sm font-medium text-text-primary">{payment.qb_invoice_id_ref}</p>
            </div>
          )}
        </div>
      </div>

      {/* Retainer Payout Quarters */}
      {isRetainer && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Retainer Payout Quarters
            </h3>
            {payoutQuarters.length > 0 && (
              <span className="text-xs text-text-secondary">
                {payoutQuarters.length} {payoutQuarters.length === 1 ? 'quarter' : 'quarters'}
              </span>
            )}
          </div>

          {payoutQuarters.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No payout quarters for this retainer.
            </p>
          ) : (
            <div className="space-y-2">
              {payoutQuarters.map((quarter) => (
                <div
                  key={quarter.row_id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {quarter.paid_out ? (
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock size={16} className="text-amber-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      {quarter.week_id && (
                        <p className="text-sm font-medium text-text-primary">
                          Week {quarter.week_id}
                        </p>
                      )}
                      {quarter.created_date && (
                        <p className="text-xs text-text-secondary">
                          Created {formatDate(quarter.created_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      quarter.paid_out
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {quarter.paid_out ? 'Paid Out' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
