import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  CalendarDays,
  FolderKanban,
  ExternalLink,
  Clock,
  Building2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceLineItem, Option } from '@/types/database'

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

export default function BillingInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['billing-invoice', invoiceId],
    queryFn: async () => {
      const [{ data: invoiceData }, { data: lineItemsData }] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, accounts!fk_invoices_account_id(id, company_name), projects!fk_invoices_project_id(name), options!fk_invoices_status_id(id, option_key, option_label)')
          .eq('row_id', invoiceId!)
          .single(),
        supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoiceId!)
          .order('date', { ascending: true }),
      ])

      const invoice: InvoiceWithDetails | null = invoiceData
        ? {
            ...invoiceData,
            account: invoiceData.accounts as { id: string; company_name: string | null } | null,
            project: invoiceData.projects as { name: string | null } | null,
            status_option: invoiceData.options as unknown as Option | null,
            accounts: undefined,
            projects: undefined,
            options: undefined,
          } as InvoiceWithDetails
        : null

      return {
        invoice,
        lineItems: (lineItemsData as InvoiceLineItem[]) ?? [],
      }
    },
    enabled: !!invoiceId,
  })

  const invoice = queryData?.invoice ?? null
  const lineItems = queryData?.lineItems ?? []

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-border rounded mb-6" />
          <div className="h-8 w-64 bg-border rounded mb-4" />
          <div className="h-64 bg-surface rounded-xl border border-border" />
        </div>
      </div>
    )
  }

  if (!invoice) {
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
          <p className="text-text-secondary text-sm">Invoice not found.</p>
        </div>
      </div>
    )
  }

  const statusKey = invoice.status_option?.option_key?.toLowerCase() ?? ''
  const lineItemTotal = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Billing
      </Link>

      {/* Invoice header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <FileText size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              ${invoice.amount != null
                ? invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '0.00'}
            </h1>
            {invoice.status_option && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full self-start ${
                  invoiceStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                }`}
              >
                {invoice.status_option.option_label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {invoice.account?.company_name && (
              <Link
                to={`/accounts/${invoice.account.id}`}
                className="text-sm text-text-secondary hover:text-purple flex items-center gap-1.5 transition-colors"
              >
                <Building2 size={13} />
                {invoice.account.company_name}
              </Link>
            )}
            {invoice.project?.name && (
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <FolderKanban size={13} />
                {invoice.project.name}
              </span>
            )}
            {invoice.created_date && (
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <CalendarDays size={13} />
                Created {invoice.created_date}
              </span>
            )}
            {invoice.sent_date && (
              <span className="text-sm text-text-secondary">
                Sent {invoice.sent_date}
              </span>
            )}
          </div>
        </div>
        {invoice.payment_link && (
          <a
            href={invoice.payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-muted text-purple hover:bg-purple/25 transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} />
            Payment Link
          </a>
        )}
      </div>

      {/* Invoice details card */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {invoice.rate != null && (
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Rate</p>
              <p className="text-sm font-medium text-text-primary">
                ${invoice.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {invoice.quickbooks_id != null && (
            <div>
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">QuickBooks ID</p>
              <p className="text-sm font-medium text-text-primary">{invoice.quickbooks_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Line Items
          </h3>
          {lineItems.length > 0 && (
            <span className="text-xs text-text-secondary">
              {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {lineItems.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No line items for this invoice.
          </p>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_90px_90px] gap-3 px-3 pb-2 border-b border-border/50 mb-2">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider">Description</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider text-right">Hours</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider text-right">Rate</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider text-right">Amount</span>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider text-right">Date</span>
            </div>

            <div className="space-y-2">
              {lineItems.map((item) => (
                <div
                  key={item.row_id}
                  className="sm:grid sm:grid-cols-[1fr_80px_80px_90px_90px] gap-3 p-3 bg-black/20 rounded-lg border border-border/50"
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-text-primary font-medium truncate flex-1 mr-2">
                        {item.name ?? 'No description'}
                      </p>
                      <span className="text-sm font-semibold text-purple flex-shrink-0">
                        ${item.amount != null ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {item.hours && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock size={10} />
                          {item.hours}h
                        </span>
                      )}
                      {item.rate && (
                        <span className="text-xs text-text-secondary">
                          @${item.rate}/hr
                        </span>
                      )}
                      {item.date && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <CalendarDays size={10} />
                          {item.date}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <p className="hidden sm:block text-sm text-text-primary truncate self-center">
                    {item.name ?? 'No description'}
                  </p>
                  <p className="hidden sm:block text-sm text-text-secondary text-right self-center">
                    {item.hours ? `${item.hours}h` : '-'}
                  </p>
                  <p className="hidden sm:block text-sm text-text-secondary text-right self-center">
                    {item.rate ? `$${item.rate}` : '-'}
                  </p>
                  <p className="hidden sm:block text-sm font-medium text-purple text-right self-center">
                    ${item.amount != null ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                  <p className="hidden sm:block text-sm text-text-secondary text-right self-center">
                    {item.date ?? '-'}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 px-3">
              <span className="text-sm font-semibold text-text-secondary">Total</span>
              <span className="text-sm font-bold text-text-primary">
                ${lineItemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
