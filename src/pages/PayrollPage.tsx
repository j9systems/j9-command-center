import { useState } from 'react'
import { Wallet, Play, CheckCheck, Loader2, AlertTriangle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface PayrollResult {
  contractor_lines?: number
  deduction_lines?: number
  retainer_lines?: number
  errors?: string[]
  error?: string
}

interface FinalizeResult {
  finalized?: number
  grand_total?: number
  totals_by_type?: Record<string, number>
  error?: string
}

interface PreviewMember {
  team_member: string
  lines: { type: string; description: string; total: number }[]
  total: number
}

interface PreviewResult {
  week_label?: string
  members?: PreviewMember[]
  error?: string
}

interface PayoutRow {
  row_id: string
  created_date: string | null
  team_member_id: string | null
  week_id: string | null
  status_id: number | null
  payout_from_time_logs: number | null
  team_member: {
    first_name: string | null
    last_name: string | null
    photo: string | null
  } | null
  status_option: {
    option_label: string | null
  } | null
}

interface PayoutLine {
  week_id: string
  assigned_to_id: string
  total: number | null
}

async function callEdgeFunction<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const result = await res.json()
  if (!res.ok && !result.error) {
    throw new Error(`Request failed (${res.status})`)
  }
  return result as T
}

export default function PayrollPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [openTotals, setOpenTotals] = useState<Record<string, number>>({})

  // Run Payroll state
  const [runningPayroll, setRunningPayroll] = useState(false)
  const [payrollResult, setPayrollResult] = useState<PayrollResult | null>(null)
  const [payrollError, setPayrollError] = useState<string | null>(null)
  const [showPayrollConfirm, setShowPayrollConfirm] = useState(false)

  // Finalize Payouts state
  const [finalizingPayouts, setFinalizingPayouts] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)

  // Delete payout state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Payroll Preview state
  const [previewExpanded, setPreviewExpanded] = useState(true)

  const { isLoading: loading } = useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('row_id, created_date, team_member_id, week_id, status_id, payout_from_time_logs, team(first_name, last_name, photo), options(option_label)')

      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError)
      }

      if (!payoutsData) {
        return { payouts: [], openTotals: {} }
      }

      const rows: PayoutRow[] = payoutsData.map((p: Record<string, unknown>) => ({
        row_id: p.row_id as string,
        created_date: p.created_date as string | null,
        team_member_id: p.team_member_id as string | null,
        week_id: p.week_id as string | null,
        status_id: p.status_id as number | null,
        payout_from_time_logs: p.payout_from_time_logs as number | null,
        team_member: p.team as PayoutRow['team_member'],
        status_option: p.options as PayoutRow['status_option'],
      }))

      const openRows = rows.filter(
        (r) => r.status_option?.option_label === 'Open'
      )

      let totalsMap: Record<string, number> = {}
      if (openRows.length > 0) {
        const weekIds = [...new Set(openRows.map((r) => r.week_id).filter(Boolean))] as string[]
        const memberIds = [...new Set(openRows.map((r) => r.team_member_id).filter(Boolean))] as string[]

        const { data: linesData, error: linesError } = await supabase
          .from('payout_lines')
          .select('week_id, assigned_to_id, total')
          .in('week_id', weekIds)
          .in('assigned_to_id', memberIds)

        if (linesError) {
          console.error('Error fetching payout_lines:', linesError)
        }

        if (linesData) {
          for (const line of linesData as PayoutLine[]) {
            const key = `${line.week_id}|${line.assigned_to_id}`
            totalsMap[key] = (totalsMap[key] || 0) + (line.total || 0)
          }
        }
      }

      rows.sort((a, b) => {
        const aLabel = a.status_option?.option_label ?? ''
        const bLabel = b.status_option?.option_label ?? ''
        if (aLabel === 'Open' && bLabel !== 'Open') return -1
        if (aLabel !== 'Open' && bLabel === 'Open') return 1
        const aDate = a.created_date ?? ''
        const bDate = b.created_date ?? ''
        return bDate.localeCompare(aDate)
      })

      setPayouts(rows)
      setOpenTotals(totalsMap)
      return { payouts: rows, openTotals: totalsMap }
    },
  })

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['payroll-preview'],
    queryFn: async () => {
      const result = await callEdgeFunction<PreviewResult>('get-payroll-preview')
      if (result.error) {
        console.error('Preview error:', result.error)
        return null
      }
      return result
    },
  })

  async function handleRunPayroll() {
    setRunningPayroll(true)
    setPayrollResult(null)
    setPayrollError(null)
    setShowPayrollConfirm(false)
    try {
      const result = await callEdgeFunction<PayrollResult>('process-weekly-payroll')
      if (result.error) {
        setPayrollError(result.error)
      } else {
        setPayrollResult(result)
      }
    } catch (err) {
      setPayrollError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunningPayroll(false)
    }
  }

  async function handleFinalizePayouts() {
    setFinalizingPayouts(true)
    setFinalizeResult(null)
    setFinalizeError(null)
    try {
      const result = await callEdgeFunction<FinalizeResult>('finalize-payouts')
      if (result.error) {
        setFinalizeError(result.error)
      } else {
        setFinalizeResult(result)
      }
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFinalizingPayouts(false)
    }
  }

  async function handleDeletePayout(rowId: string) {
    setDeletingId(rowId)
    // Delete related payout_lines first
    const payout = payouts.find((p) => p.row_id === rowId)
    if (payout?.week_id && payout?.team_member_id) {
      await supabase
        .from('payout_lines')
        .delete()
        .eq('week_id', payout.week_id)
        .eq('assigned_to_id', payout.team_member_id)
    }
    const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('row_id', rowId)
    if (!error) {
      setPayouts((prev) => prev.filter((p) => p.row_id !== rowId))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  function getTotal(payout: PayoutRow): number {
    if (payout.status_option?.option_label === 'Open') {
      const key = `${payout.week_id}|${payout.team_member_id}`
      return openTotals[key] || 0
    }
    return payout.payout_from_time_logs || 0
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Wallet size={24} className="text-purple" />
          <h1 className="text-2xl font-bold text-text-primary">Payroll</h1>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wallet size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Payroll</h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {showPayrollConfirm ? (
          <div className="flex items-center gap-2 p-3 bg-surface rounded-xl border border-border">
            <span className="text-xs text-text-secondary">Run payroll processing? This is safe to re-run.</span>
            <button
              onClick={handleRunPayroll}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple text-white hover:bg-purple/90 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowPayrollConfirm(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPayrollConfirm(true)}
            disabled={runningPayroll}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-purple text-white hover:bg-purple/90 transition-colors disabled:opacity-50"
          >
            {runningPayroll ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {runningPayroll ? 'Running...' : 'Run Payroll'}
          </button>
        )}

        <button
          onClick={handleFinalizePayouts}
          disabled={finalizingPayouts}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          {finalizingPayouts ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
          {finalizingPayouts ? 'Finalizing...' : 'Finalize Payouts'}
        </button>
      </div>

      {/* Payroll Result */}
      {payrollResult && (
        <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
          <p className="text-xs font-medium text-emerald-400">Payroll processed successfully</p>
          <div className="flex flex-wrap gap-4 text-xs text-emerald-300">
            <span>Contractor lines: {payrollResult.contractor_lines ?? 0}</span>
            <span>Deduction lines: {payrollResult.deduction_lines ?? 0}</span>
            <span>Retainer lines: {payrollResult.retainer_lines ?? 0}</span>
          </div>
          {payrollResult.errors && payrollResult.errors.length > 0 && (
            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs font-medium text-amber-400 flex items-center gap-1 mb-1">
                <AlertTriangle size={12} /> Warnings
              </p>
              {payrollResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-amber-300">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {payrollError && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-xs text-red-400">{payrollError}</p>
        </div>
      )}

      {/* Finalize Result */}
      {finalizeResult && (
        <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
          <p className="text-xs font-medium text-emerald-400">Payouts finalized</p>
          <div className="flex flex-wrap gap-4 text-xs text-emerald-300">
            <span>Finalized: {finalizeResult.finalized ?? 0}</span>
            <span>Grand total: {formatCurrency(finalizeResult.grand_total ?? 0)}</span>
          </div>
          {finalizeResult.totals_by_type && Object.keys(finalizeResult.totals_by_type).length > 0 && (
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary mt-1">
              {Object.entries(finalizeResult.totals_by_type).map(([type, total]) => (
                <span key={type}>{type}: {formatCurrency(total)}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {finalizeError && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-xs text-red-400">{finalizeError}</p>
        </div>
      )}

      {/* Payroll Preview */}
      {!previewLoading && preview && preview.members && preview.members.length > 0 && (
        <div className="mb-4 bg-surface rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setPreviewExpanded((v) => !v)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-border/20 transition-colors"
          >
            <span className="text-sm font-medium text-text-primary">
              Preview: {preview.week_label ?? 'Current Week'}
            </span>
            {previewExpanded ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
          </button>
          {previewExpanded && (
            <div className="px-3 pb-3 space-y-3">
              {preview.members.map((member) => (
                <div key={member.team_member} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">{member.team_member}</span>
                    <span className="text-xs font-semibold text-text-primary font-mono">{formatCurrency(member.total)}</span>
                  </div>
                  {member.lines.map((line, i) => (
                    <div key={i} className="flex items-center justify-between pl-3">
                      <span className="text-xs text-text-secondary">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 mr-1.5">{line.type}</span>
                        {line.description}
                      </span>
                      <span className="text-xs text-text-secondary font-mono">{formatCurrency(line.total)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-text-secondary mb-3">
        {payouts.length} {payouts.length === 1 ? 'payout' : 'payouts'}
      </p>

      {payouts.length === 0 ? (
        <div className="text-center py-16">
          <Wallet size={48} className="mx-auto mb-4 text-text-secondary/30" />
          <p className="text-text-secondary text-sm">No payouts found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map((payout) => {
            const name = [payout.team_member?.first_name, payout.team_member?.last_name]
              .filter(Boolean)
              .join(' ') || 'Unknown'
            const initials = name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            const statusLabel = payout.status_option?.option_label ?? 'Unknown'
            const isOpen = statusLabel === 'Open'
            const isPaid = statusLabel === 'Paid'
            const total = getTotal(payout)

            return (
              <div
                key={payout.row_id}
                className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-border hover:border-purple/20 transition-colors"
              >
                {/* Team Member */}
                <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                  {payout.team_member?.photo ? (
                    <img
                      src={payout.team_member.photo}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-purple">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatDate(payout.created_date)}
                  </p>
                </div>

                {/* Status */}
                <span
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                    isOpen
                      ? 'bg-purple-500/15 text-purple-400'
                      : isPaid
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-zinc-500/15 text-zinc-400'
                  }`}
                >
                  {statusLabel}
                </span>

                {/* Total */}
                <div className="text-right flex-shrink-0 w-28">
                  <span className="text-sm font-semibold text-text-primary font-mono">
                    {formatCurrency(total)}
                  </span>
                </div>

                {/* Delete button for open payouts */}
                {isOpen && (
                  <div className="flex-shrink-0">
                    {confirmDeleteId === payout.row_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeletePayout(payout.row_id)}
                          disabled={deletingId === payout.row_id}
                          className="text-[10px] font-medium px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                        >
                          {deletingId === payout.row_id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] font-medium px-2 py-1 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(payout.row_id)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete payout"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
