import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { TimeLog, TimeLogBreak } from '@/types/database'

export interface ActiveTimeLogData {
  log: TimeLog
  breaks: TimeLogBreak[]
  accountName: string | null
  projectName: string | null
  taskName: string | null
}

export interface ActiveTimeLogContextValue {
  activeLog: ActiveTimeLogData | null
  teamId: string | null
  loading: boolean
  refresh: () => Promise<void>
  setActiveLog: (data: ActiveTimeLogData | null) => void
}

export const ActiveTimeLogContext = createContext<ActiveTimeLogContextValue>({
  activeLog: null,
  teamId: null,
  loading: true,
  refresh: async () => {},
  setActiveLog: () => {},
})

export function ActiveTimeLogProvider({ children }: { children: ReactNode }) {
  const [activeLog, setActiveLog] = useState<ActiveTimeLogData | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchActiveLog = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      setLoading(false)
      return
    }

    // Get team member id
    let tid = teamId
    if (!tid) {
      const { data: tm } = await supabase
        .from('team')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle()
      if (tm) {
        tid = tm.id
        setTeamId(tid)
      }
    }
    if (!tid) {
      setLoading(false)
      return
    }

    // Query active time log
    const today = new Date().toISOString().slice(0, 10)
    const { data: logs } = await supabase
      .from('time_logs')
      .select(`
        *,
        accounts!time_logs_account_id_fkey(company_name),
        projects!time_logs_project_id_fkey(name),
        tasks!time_logs_task_id_fkey(name)
      `)
      .eq('assigned_to_id', tid)
      .is('end_date_time', null)
      .eq('date', today)
      .limit(1)

    if (logs && logs.length > 0) {
      const row = logs[0]

      // Fetch breaks
      const { data: breaks } = await supabase
        .from('time_log_breaks')
        .select('*')
        .eq('time_log_id', row.id)
        .order('break_start', { ascending: true })

      setActiveLog({
        log: {
          id: row.id,
          account_id: row.account_id,
          project_id: row.project_id,
          task_id: row.task_id,
          assigned_to_id: row.assigned_to_id,
          date: row.date,
          hours: row.hours,
          name: row.name,
          created_at: row.created_at,
          status_id: row.status_id,
          start_date_time: row.start_date_time,
          end_date_time: row.end_date_time,
        },
        breaks: (breaks ?? []) as TimeLogBreak[],
        accountName: (row.accounts as any)?.company_name ?? null,
        projectName: (row.projects as any)?.name ?? null,
        taskName: (row.tasks as any)?.name ?? null,
      })
    } else {
      setActiveLog(null)
    }

    setLoading(false)
  }, [teamId])

  // Initial load
  useEffect(() => {
    fetchActiveLog()
  }, [fetchActiveLog])

  // Realtime subscription for breaks on active log
  useEffect(() => {
    if (!activeLog?.log.id) return

    const channel = supabase
      .channel(`time_log_breaks:${activeLog.log.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_log_breaks',
          filter: `time_log_id=eq.${activeLog.log.id}`,
        },
        () => {
          // Re-fetch breaks
          supabase
            .from('time_log_breaks')
            .select('*')
            .eq('time_log_id', activeLog.log.id)
            .order('break_start', { ascending: true })
            .then(({ data }) => {
              if (data) {
                setActiveLog((prev) =>
                  prev ? { ...prev, breaks: data as TimeLogBreak[] } : null
                )
              }
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeLog?.log.id])

  return (
    <ActiveTimeLogContext.Provider
      value={{ activeLog, teamId, loading, refresh: fetchActiveLog, setActiveLog }}
    >
      {children}
    </ActiveTimeLogContext.Provider>
  )
}
