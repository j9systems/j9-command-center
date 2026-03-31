import { useEffect, useState, useRef } from 'react'
import { X, Search, ChevronRight, ChevronLeft, Clock, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useActiveTimeLog } from '@/hooks/useActiveTimeLog'
import type { Account, Project, Task } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  /** Pre-selected account (from AccountDetailPage) */
  preSelectedAccount?: { id: string; company_name: string | null } | null
}

type Step = 'account' | 'project' | 'task' | 'time'

const inputClass =
  'w-full px-3 py-2.5 bg-black/30 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple transition-colors'
const labelClass = 'block text-xs font-medium text-text-secondary mb-1.5'

export default function StartTimeLogModal({ open, onClose, preSelectedAccount }: Props) {
  const { activeLog, teamId, refresh } = useActiveTimeLog()

  // Step management
  const initialStep: Step = preSelectedAccount ? 'project' : 'account'
  const [step, setStep] = useState<Step>(initialStep)

  // Selections
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; company_name: string | null } | null>(
    preSelectedAccount ?? null
  )
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string | null } | null>(null)
  const [selectedTask, setSelectedTask] = useState<{ id: string; name: string | null } | null>(null)
  const [startTime, setStartTime] = useState('')

  // Search / data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(preSelectedAccount ? 'project' : 'account')
      setSelectedAccount(preSelectedAccount ?? null)
      setSelectedProject(null)
      setSelectedTask(null)
      setStartTime(formatDateTimeLocal(new Date()))
      setSearch('')
    }
  }, [open, preSelectedAccount])

  // Fetch accounts
  useEffect(() => {
    if (step !== 'account') return
    supabase
      .from('accounts')
      .select('id, company_name, type, status')
      .order('company_name', { ascending: true })
      .then(({ data }) => {
        if (data) setAccounts(data as Account[])
      })
  }, [step])

  // Fetch projects when account selected
  useEffect(() => {
    if (step !== 'project' || !selectedAccount) return
    setSearch('')
    supabase
      .from('projects')
      .select('id, name, status, account_id')
      .eq('account_id', selectedAccount.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setProjects(data as Project[])
      })
  }, [step, selectedAccount])

  // Fetch tasks when project selected
  useEffect(() => {
    if (step !== 'task' || !selectedProject) return
    setSearch('')
    supabase
      .from('tasks')
      .select('row_id, name, status_id, project_id')
      .eq('project_id', selectedProject.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setTasks(data as Task[])
      })
  }, [step, selectedProject])

  // Focus search on step change
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [step, open])

  if (!open) return null

  // If there's already an active log, show a message
  if (activeLog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#111111] border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
          <div className="text-center py-4">
            <Clock size={32} className="mx-auto mb-3 text-[#01B574]" />
            <p className="text-text-primary font-medium mb-1">Timer Already Running</p>
            <p className="text-sm text-text-secondary">
              You have an active time log for{' '}
              <span className="text-text-primary">{activeLog.accountName}</span>
              {activeLog.projectName && (
                <> &mdash; {activeLog.projectName}</>
              )}
              . End the current log before starting a new one.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const filteredAccounts = accounts.filter((a) =>
    (a.company_name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredProjects = projects.filter((p) =>
    (p.name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredTasks = tasks.filter((t) =>
    (t.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleSubmit() {
    if (!selectedAccount || !selectedProject || !teamId) return
    setSubmitting(true)

    // Get in_progress status id
    const { data: statusOpt } = await supabase
      .from('options')
      .select('id')
      .eq('category', 'timelog_status')
      .eq('option_key', 'in_progress')
      .maybeSingle()

    const startDt = startTime ? new Date(startTime).toISOString() : new Date().toISOString()
    const dateStr = startDt.slice(0, 10)

    const newId = crypto.randomUUID()
    const { error } = await supabase.from('time_logs').insert({
      id: newId,
      account_id: selectedAccount.id,
      project_id: selectedProject.id,
      task_id: selectedTask?.id ?? null,
      assigned_to_id: teamId,
      start_date_time: startDt,
      end_date_time: null,
      hours: null,
      status_id: statusOpt?.id ?? null,
      date: dateStr,
      name: [selectedProject.name, selectedTask?.name].filter(Boolean).join(' — '),
    })

    if (!error) {
      await refresh()
      onClose()
    }
    setSubmitting(false)
  }

  function goBack() {
    if (step === 'project') {
      if (preSelectedAccount) {
        onClose()
      } else {
        setStep('account')
        setSelectedProject(null)
      }
    } else if (step === 'task') {
      setStep('project')
      setSelectedTask(null)
    } else if (step === 'time') {
      setStep('task')
    }
  }

  const stepLabels: Record<Step, string> = {
    account: 'Select Client',
    project: 'Select Project',
    task: 'Select Feature (Optional)',
    time: 'Set Start Time',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111111] border border-border rounded-t-xl md:rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-slide-up md:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            {step !== initialStep && (
              <button onClick={goBack} className="text-text-secondary hover:text-text-primary transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <h3 className="text-base font-semibold text-text-primary">{stepLabels[step]}</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step: Account / Project / Task — list selection */}
          {(step === 'account' || step === 'project' || step === 'task') && (
            <>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={`Search ${step === 'task' ? 'features' : step + 's'}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${inputClass} pl-8`}
                />
              </div>

              {/* Breadcrumb */}
              {selectedAccount && step !== 'account' && (
                <p className="text-xs text-text-secondary mb-3">
                  {selectedAccount.company_name}
                  {selectedProject && step === 'task' && <> &rsaquo; {selectedProject.name}</>}
                </p>
              )}

              <div className="space-y-1">
                {step === 'account' &&
                  filteredAccounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAccount({ id: a.id, company_name: a.company_name })
                        setStep('project')
                        setSearch('')
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple/10 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-sm text-text-primary">{a.company_name ?? 'Unnamed'}</span>
                      <ChevronRight size={14} className="text-text-secondary/30 group-hover:text-purple transition-colors" />
                    </button>
                  ))}

                {step === 'project' &&
                  filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProject({ id: p.id, name: p.name })
                        setStep('task')
                        setSearch('')
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple/10 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-sm text-text-primary">{p.name ?? 'Unnamed'}</span>
                      <ChevronRight size={14} className="text-text-secondary/30 group-hover:text-purple transition-colors" />
                    </button>
                  ))}

                {step === 'task' && (
                  <>
                    {/* Skip option */}
                    <button
                      onClick={() => {
                        setSelectedTask(null)
                        setStep('time')
                        setSearch('')
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple/10 transition-colors text-sm text-text-secondary italic"
                    >
                      Skip &mdash; no specific feature
                    </button>
                    {filteredTasks.map((t) => (
                      <button
                        key={t.row_id}
                        onClick={() => {
                          setSelectedTask({ id: t.row_id, name: t.name })
                          setStep('time')
                          setSearch('')
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple/10 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-sm text-text-primary">{t.name ?? 'Unnamed'}</span>
                        <ChevronRight size={14} className="text-text-secondary/30 group-hover:text-purple transition-colors" />
                      </button>
                    ))}
                  </>
                )}

                {/* Empty states */}
                {step === 'account' && filteredAccounts.length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-6">No clients found.</p>
                )}
                {step === 'project' && filteredProjects.length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-6">No projects for this client.</p>
                )}
              </div>
            </>
          )}

          {/* Step: Time */}
          {step === 'time' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-black/30 rounded-lg p-3 space-y-1">
                <p className="text-xs text-text-secondary">Client</p>
                <p className="text-sm text-text-primary">{selectedAccount?.company_name}</p>
                <p className="text-xs text-text-secondary mt-2">Project</p>
                <p className="text-sm text-text-primary">{selectedProject?.name}</p>
                {selectedTask && (
                  <>
                    <p className="text-xs text-text-secondary mt-2">Feature</p>
                    <p className="text-sm text-text-primary">{selectedTask.name}</p>
                  </>
                )}
              </div>

              <div>
                <label className={labelClass}>Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[11px] text-text-secondary mt-1">Defaults to now. Adjust if needed.</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple hover:bg-purple-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Play size={16} />
                {submitting ? 'Starting...' : 'Start Timer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
