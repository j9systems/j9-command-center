import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Pencil,
  User,
  X,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember, Option } from '@/types/database'

const taskStatusColors: Record<string, string> = {
  backlog: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-emerald-500/15 text-emerald-400',
}

type TaskWithAssignee = Task & { assigned_to?: TeamMember | null; status_option?: Option | null }

export default function TaskDetailPage() {
  const { id: accountId, taskId } = useParams<{ id: string; taskId: string }>()
  const [task, setTask] = useState<TaskWithAssignee | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [taskStatuses, setTaskStatuses] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatusId, setEditStatusId] = useState<string>('')
  const [editDue, setEditDue] = useState('')
  const [editAssignedTo, setEditAssignedTo] = useState('')
  const [editPriority, setEditPriority] = useState('')

  useEffect(() => {
    if (!taskId) return

    async function fetchData() {
      setLoading(true)

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
        .eq('row_id', taskId!)
        .single()

      if (taskData) {
        const mapped: TaskWithAssignee = {
          ...taskData,
          assigned_to: taskData.team as TeamMember | null,
          status_option: taskData.options as Option | null,
          team: undefined,
          options: undefined,
        } as TaskWithAssignee
        setTask(mapped)
      }

      // Fetch team members for assignment dropdown
      const { data: teamData } = await supabase
        .from('team')
        .select('id, first_name, last_name, photo')
        .eq('active', 'true')
        .order('first_name')

      if (teamData) {
        setTeamMembers(teamData as TeamMember[])
      }

      // Fetch task status options
      const { data: statusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'task_status')

      if (statusOptions) {
        setTaskStatuses(statusOptions as Option[])
      }

      setLoading(false)
    }

    fetchData()
  }, [taskId])

  function startEditing() {
    if (!task) return
    setEditName(task.name ?? '')
    setEditNotes(task.notes ?? '')
    setEditStatusId(task.status_id?.toString() ?? '')
    setEditDue(task.due ?? '')
    setEditAssignedTo(task.assigned_to_id_internal ?? '')
    setEditPriority(task.priority ?? '')
    setEditing(true)
  }

  async function handleSave() {
    if (!taskId || !task) return
    setSaving(true)

    const updates = {
      name: editName.trim() || null,
      notes: editNotes.trim() || null,
      status_id: editStatusId ? Number(editStatusId) : null,
      due: editDue || null,
      assigned_to_id_internal: editAssignedTo || null,
      priority: editPriority || null,
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('row_id', taskId)
      .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
      .single()

    if (data && !error) {
      const mapped: TaskWithAssignee = {
        ...data,
        assigned_to: data.team as TeamMember | null,
        status_option: data.options as Option | null,
        team: undefined,
        options: undefined,
      } as TaskWithAssignee
      setTask(mapped)
      setEditing(false)
    }

    setSaving(false)
  }

  async function handleMarkComplete() {
    if (!taskId || !task) return
    const completeOption = taskStatuses.find((s) => s.option_key === 'complete')
    if (!completeOption) return

    setCompleting(true)
    const { data, error } = await supabase
      .from('tasks')
      .update({ status_id: completeOption.id })
      .eq('row_id', taskId)
      .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
      .single()

    if (data && !error) {
      const mapped: TaskWithAssignee = {
        ...data,
        assigned_to: data.team as TeamMember | null,
        status_option: data.options as Option | null,
        team: undefined,
        options: undefined,
      } as TaskWithAssignee
      setTask(mapped)
    }
    setCompleting(false)
  }

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

  if (!task) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Link
          to={`/accounts/${accountId}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Account
        </Link>
        <div className="text-center py-16">
          <p className="text-text-secondary text-sm">Task not found.</p>
        </div>
      </div>
    )
  }

  const statusKey = task.status_option?.option_key?.toLowerCase() ?? ''
  const isComplete = statusKey === 'complete'
  const assigneeName = task.assigned_to
    ? [task.assigned_to.first_name, task.assigned_to.last_name].filter(Boolean).join(' ')
    : null

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${accountId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Account
      </Link>

      {/* Task header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <ClipboardList size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary truncate">
              {task.name ?? 'Untitled Task'}
            </h1>
            {task.status_option && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                  taskStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                }`}
              >
                {task.status_option.option_label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {task.due && (
              <span className="text-sm text-text-secondary flex items-center gap-1.5">
                <CalendarDays size={13} />
                Due {new Date(task.due).toLocaleDateString()}
              </span>
            )}
            {task.priority && (
              <span className="text-sm text-text-secondary">
                Priority: {task.priority}
              </span>
            )}
            {task.created && (
              <span className="text-sm text-text-secondary">
                Created {new Date(task.created).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && !isComplete && (
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              {completing ? 'Completing...' : 'Mark Complete'}
            </button>
          )}
          {!editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-purple/30 transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* Edit form */
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
              Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
              Notes
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Status
              </label>
              <select
                value={editStatusId}
                onChange={(e) => setEditStatusId(e.target.value)}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
              >
                <option value="">No status</option>
                {taskStatuses.map((s) => (
                  <option key={s.id} value={s.id.toString()}>
                    {s.option_label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Priority
              </label>
              <input
                type="text"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                placeholder="e.g. high, medium, low"
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Due Date
              </label>
              <input
                type="date"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Assigned To
              </label>
              <select
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {[tm.first_name, tm.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50"
            >
              <Save size={12} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Read-only view */
        <div className="space-y-6">
          {/* Assignee card */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Assigned To
            </h3>
            {task.assigned_to ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                  {task.assigned_to.photo ? (
                    <img
                      src={task.assigned_to.photo}
                      alt={assigneeName ?? ''}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User size={18} className="text-purple" />
                  )}
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {assigneeName}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Unassigned</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Notes
            </h3>
            {task.notes ? (
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {task.notes}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">No notes provided.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
