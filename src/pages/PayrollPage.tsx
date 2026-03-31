import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

export default function PayrollPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [openTotals, setOpenTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('row_id, created_date, team_member_id, week_id, status_id, payout_from_time_logs, team(first_name, last_name, photo), options(option_label)')

      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError)
      }

      if (!payoutsData) {
        setLoading(false)
        return
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

      // Find open payouts and fetch their line totals in a single query
      const openRows = rows.filter(
        (r) => r.status_option?.option_label === 'Open'
      )

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
          const totalsMap: Record<string, number> = {}
          for (const line of linesData as PayoutLine[]) {
            const key = `${line.week_id}|${line.assigned_to_id}`
            totalsMap[key] = (totalsMap[key] || 0) + (line.total || 0)
          }
          setOpenTotals(totalsMap)
        }
      }

      // Sort: Open first, then Paid
      rows.sort((a, b) => {
        const aLabel = a.status_option?.option_label ?? ''
        const bLabel = b.status_option?.option_label ?? ''
        if (aLabel === 'Open' && bLabel !== 'Open') return -1
        if (aLabel !== 'Open' && bLabel === 'Open') return 1
        return 0
      })

      setPayouts(rows)
      setLoading(false)
    }

    fetchData()
  }, [])

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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
