import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  StickyNote,
  Plus,
  CheckCircle2,
  ClipboardList,
  User,
  Save,
  X,
  Pencil,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Meeting, Contact, TeamMember, Task, Option } from '@/types/database'
import RichTextEditor from '@/components/RichTextEditor'

const meetingStatusColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400',
  tentative: 'bg-amber-500/15 text-amber-400',
}

const taskStatusColors: Record<string, string> = {
  backlog: 'bg-blue-500/15 text-blue-400',
  in_progress: 'bg-amber-500/15 text-amber-400',
  complete: 'bg-emerald-500/15 text-emerald-400',
}

type MeetingWithAttendees = Meeting & {
  attendees: { contact: Contact | null; team_member: TeamMember | null }[]
}

type TaskWithAssignee = Task & {
  assigned_to?: TeamMember | null
  status_option?: Option | null
}

export default function MeetingDetailPage() {
  const { id: accountId, meetingId } = useParams<{ id: string; meetingId: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<MeetingWithAttendees | null>(null)
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])

  // New task form
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('')
  const [newTaskNotes, setNewTaskNotes] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  // Editing state for agenda and meeting notes
  const [editingAgenda, setEditingAgenda] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingAgenda, setSavingAgenda] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  async function handleSaveAgenda(html: string) {
    if (!meetingId) return
    setSavingAgenda(true)
    const { data, error } = await supabase
      .from('meetings')
      .update({ description_agenda: html })
      .eq('row_id', meetingId)
      .select('*')
      .single()
    if (data && !error) {
      setMeeting((prev) => prev ? { ...prev, description_agenda: html } : prev)
      setEditingAgenda(false)
    }
    setSavingAgenda(false)
  }

  async function handleSaveNotes(html: string) {
    if (!meetingId) return
    setSavingNotes(true)
    const { data, error } = await supabase
      .from('meetings')
      .update({ meeting_notes: html })
      .eq('row_id', meetingId)
      .select('*')
      .single()
    if (data && !error) {
      setMeeting((prev) => prev ? { ...prev, meeting_notes: html } : prev)
      setEditingNotes(false)
    }
    setSavingNotes(false)
  }

  const { data: queryData, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      // Fetch meeting
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('row_id', meetingId!)
        .single()

      if (!meetingData) {
        return { taskStatuses: [] as Option[], assignableMembers: [] as TeamMember[] }
      }

      const meetingRecord = meetingData as Meeting

      // Fetch attendees
      const { data: attendeesData } = await supabase
        .from('meeting_attendees')
        .select('row_id, meeting_id, external_attendee_id, internal_attendee_id, attendee_group, contacts(id, first_name, last_name, email), team(id, first_name, last_name, email, photo)')
        .eq('meeting_id', meetingId!)

      const attendees = (attendeesData ?? []).map((att) => ({
        contact: att.contacts as unknown as Contact | null,
        team_member: att.team as unknown as TeamMember | null,
      }))

      if (meetingRecord.organizer_id) {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user?.id === meetingRecord.organizer_id) {
          const { data: organizerTeam } = await supabase
            .from('team')
            .select('id, first_name, last_name, email, photo')
            .eq('email', currentSession.user.email!)
            .maybeSingle()

          if (organizerTeam) {
            const alreadyIncluded = attendees.some(
              (att) => att.team_member?.id === organizerTeam.id
            )
            if (!alreadyIncluded) {
              attendees.unshift({
                contact: null,
                team_member: organizerTeam as TeamMember,
              })
            }
          }
        }
      }

      const meetingWithAttendees: MeetingWithAttendees = { ...meetingRecord, attendees }
      setMeeting(meetingWithAttendees)

      // Fetch tasks linked to this meeting
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
        .eq('from_meeting_id', meetingId!)
        .order('created', { ascending: false })

      let mappedTasks: TaskWithAssignee[] = []
      if (tasksData) {
        mappedTasks = tasksData.map((t) => ({
          ...t,
          assigned_to: t.team as unknown as TeamMember | null,
          status_option: t.options as unknown as Option | null,
          team: undefined,
          options: undefined,
        })) as TaskWithAssignee[]
        setTasks(mappedTasks)
      }

      // Fetch task statuses
      const { data: statusOptions } = await supabase
        .from('options')
        .select('*')
        .eq('category', 'task_status')

      const taskStatuses = (statusOptions as Option[]) ?? []

      // Determine assignable team members
      let assignableMembers: TeamMember[] = []
      if (meetingRecord.account_id) {
        const { data: accountTeamData } = await supabase
          .from('account_team')
          .select('team(id, first_name, last_name, email, photo)')
          .eq('account_id', meetingRecord.account_id)

        if (accountTeamData) {
          assignableMembers = accountTeamData
            .map((at) => at.team as unknown as TeamMember | null)
            .filter((m): m is TeamMember => m !== null)
        }
      } else {
        const { data: allTeam } = await supabase
          .from('team')
          .select('id, first_name, last_name, email, photo')
          .eq('active', 'true')
          .order('first_name')

        if (allTeam) assignableMembers = allTeam as TeamMember[]
      }

      return { meeting: meetingWithAttendees, tasks: mappedTasks, taskStatuses, assignableMembers }
    },
    enabled: !!meetingId,
  })

  useEffect(() => {
    if (!queryData) return
    if (queryData.meeting) setMeeting(queryData.meeting)
    if (queryData.tasks) setTasks(queryData.tasks)
  }, [queryData])

  const loading = isLoading || (!!queryData && !meeting && !!queryData.meeting)

  const taskStatuses = queryData?.taskStatuses ?? []
  const assignableMembers = queryData?.assignableMembers ?? []

  async function handleCreateTask() {
    if (!meetingId || !newTaskName.trim()) return
    setSavingTask(true)

    const backlogStatus = taskStatuses.find((s) => s.option_key === 'backlog')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        name: newTaskName.trim(),
        from_meeting_id: meetingId,
        account_id: meeting?.account_id ?? accountId ?? null,
        assigned_to_id_internal: newTaskAssignee || null,
        due: newTaskDue || null,
        priority: newTaskPriority || null,
        notes: newTaskNotes.trim() || null,
        status_id: backlogStatus?.id ?? null,
      })
      .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
      .single()

    if (data && !error) {
      const mapped: TaskWithAssignee = {
        ...data,
        assigned_to: data.team as unknown as TeamMember | null,
        status_option: data.options as unknown as Option | null,
        team: undefined,
        options: undefined,
      } as TaskWithAssignee
      setTasks((prev) => [mapped, ...prev])
      setNewTaskName('')
      setNewTaskAssignee('')
      setNewTaskDue('')
      setNewTaskPriority('')
      setNewTaskNotes('')
      setShowNewTask(false)
    }

    setSavingTask(false)
  }

  async function handleMarkTaskComplete(taskId: string) {
    const completeOption = taskStatuses.find((s) => s.option_key === 'complete')
    if (!completeOption) return

    const { data, error } = await supabase
      .from('tasks')
      .update({ status_id: completeOption.id })
      .eq('row_id', taskId)
      .select('*, team!fk_tasks_assigned_to_id_internal(id, first_name, last_name, photo), options!fk_tasks_status_id(id, option_key, option_label)')
      .single()

    if (data && !error) {
      const mapped: TaskWithAssignee = {
        ...data,
        assigned_to: data.team as unknown as TeamMember | null,
        status_option: data.options as unknown as Option | null,
        team: undefined,
        options: undefined,
      } as TaskWithAssignee
      setTasks((prev) => prev.map((t) => (t.row_id === taskId ? mapped : t)))
    }
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return (
      d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    )
  }

  function formatTime(dateStr: string | null): string {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
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

  if (!meeting) {
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
          <p className="text-text-secondary text-sm">Meeting not found.</p>
        </div>
      </div>
    )
  }

  const meetLink = meeting.gmeet_link || meeting.meeting_link

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${accountId}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Account
      </Link>

      {/* Meeting header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-muted flex items-center justify-center flex-shrink-0">
          <CalendarDays size={22} className="text-purple" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary break-words">
            {meeting.name ?? 'Untitled Meeting'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {meeting.status && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  meetingStatusColors[meeting.status] ?? 'bg-zinc-500/15 text-zinc-400'
                }`}
              >
                {meeting.status}
              </span>
            )}
            {meeting.meeting_type && (
              <span className="text-xs text-text-secondary">
                {meeting.meeting_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meeting details card */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Meeting Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {meeting.meeting_start && (
            <div className="flex items-start gap-2.5">
              <CalendarDays size={15} className="text-text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">Date & Time</p>
                <p className="text-sm text-text-primary mt-0.5">{formatDateTime(meeting.meeting_start)}</p>
                {meeting.meeting_end && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Ends at {formatTime(meeting.meeting_end)}
                  </p>
                )}
              </div>
            </div>
          )}
          {meeting.duration && (
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="text-text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">Duration</p>
                <p className="text-sm text-text-primary mt-0.5">{meeting.duration}</p>
              </div>
            </div>
          )}
          {meeting.location && (
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="text-text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">Location</p>
                <p className="text-sm text-text-primary mt-0.5">{meeting.location}</p>
              </div>
            </div>
          )}
          {meetLink && (
            <div className="flex items-start gap-2.5">
              <Video size={15} className="text-text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider">Video Link</p>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple hover:text-purple/80 transition-colors mt-0.5 inline-block"
                >
                  Join Meeting
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendees */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} />
          Attendees
        </h3>
        {meeting.attendees.length > 0 ? (
          <div className="space-y-2">
            {meeting.attendees.map((att, i) => {
              const name = att.contact
                ? [att.contact.first_name, att.contact.last_name].filter(Boolean).join(' ')
                : att.team_member
                  ? [att.team_member.first_name, att.team_member.last_name].filter(Boolean).join(' ')
                  : null
              const email = att.contact?.email ?? att.team_member?.email ?? null
              const isInternal = !!att.team_member
              const photo = att.team_member?.photo

              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                  <div className="w-8 h-8 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                    {photo ? (
                      <img src={photo} alt={name ?? ''} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User size={14} className="text-purple" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {name ?? 'Unknown'}
                    </p>
                    {email && (
                      <p className="text-xs text-text-secondary truncate">{email}</p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isInternal ? 'bg-purple-muted text-purple' : 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {isInternal ? 'Internal' : 'External'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : meeting.raw_attendees && meeting.raw_attendees.length > 0 ? (
          <div className="space-y-2">
            {meeting.raw_attendees.map((att, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                <div className="w-8 h-8 rounded-full bg-purple-muted flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-purple" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {att.displayName ?? att.email}
                  </p>
                  {att.displayName && (
                    <p className="text-xs text-text-secondary truncate">{att.email}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No attendees listed.</p>
        )}
      </div>

      {/* Agenda */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} />
            Agenda
          </h3>
          {!editingAgenda && (
            <button
              onClick={() => setEditingAgenda(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>
        {editingAgenda ? (
          <RichTextEditor
            content={meeting.description_agenda ?? ''}
            onSave={handleSaveAgenda}
            onCancel={() => setEditingAgenda(false)}
            saving={savingAgenda}
          />
        ) : meeting.description_agenda ? (
          <div
            className="text-sm text-text-primary leading-relaxed rich-text-display max-w-none"
            dangerouslySetInnerHTML={{ __html: meeting.description_agenda }}
          />
        ) : (
          <p className="text-sm text-text-secondary">No agenda provided.</p>
        )}
      </div>

      {/* Meeting Notes */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <StickyNote size={14} />
            Meeting Notes
          </h3>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <RichTextEditor
            content={meeting.meeting_notes ?? ''}
            onSave={handleSaveNotes}
            onCancel={() => setEditingNotes(false)}
            saving={savingNotes}
          />
        ) : meeting.meeting_notes ? (
          <div
            className="text-sm text-text-primary leading-relaxed rich-text-display max-w-none"
            dangerouslySetInnerHTML={{ __html: meeting.meeting_notes }}
          />
        ) : (
          <p className="text-sm text-text-secondary">No meeting notes.</p>
        )}
      </div>

      {/* Tasks section */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <ClipboardList size={14} />
            Tasks
          </h3>
          {!showNewTask && (
            <button
              onClick={() => setShowNewTask(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors"
            >
              <Plus size={14} />
              New Task
            </button>
          )}
        </div>

        {/* New task form */}
        {showNewTask && (
          <div className="mb-4 p-4 bg-black/20 rounded-lg border border-border/50 space-y-3">
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Task Name
              </label>
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                  Assigned To
                </label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                >
                  <option value="">Unassigned</option>
                  {assignableMembers.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {[tm.first_name, tm.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-purple/50"
                >
                  <option value="">None</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 block">
                Notes
              </label>
              <textarea
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-purple/50 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateTask}
                disabled={savingTask || !newTaskName.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-50"
              >
                <Save size={12} />
                {savingTask ? 'Saving...' : 'Create Task'}
              </button>
              <button
                onClick={() => {
                  setShowNewTask(false)
                  setNewTaskName('')
                  setNewTaskAssignee('')
                  setNewTaskDue('')
                  setNewTaskPriority('')
                  setNewTaskNotes('')
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const statusKey = task.status_option?.option_key?.toLowerCase() ?? ''
              const isComplete = statusKey === 'complete'
              const assigneeName = task.assigned_to
                ? [task.assigned_to.first_name, task.assigned_to.last_name].filter(Boolean).join(' ')
                : null

              return (
                <div
                  key={task.row_id}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-border/50"
                >
                  {!isComplete ? (
                    <button
                      onClick={() => handleMarkTaskComplete(task.row_id)}
                      className="w-5 h-5 rounded-full border border-border hover:border-emerald-400 flex items-center justify-center flex-shrink-0 transition-colors"
                      title="Mark complete"
                    >
                      <CheckCircle2 size={12} className="text-transparent hover:text-emerald-400" />
                    </button>
                  ) : (
                    <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                  )}
                  <div
                    className="min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/accounts/${accountId}/tasks/${task.row_id}`)}
                  >
                    <p className={`text-sm font-medium truncate ${isComplete ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                      {task.name ?? 'Untitled Task'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      {task.status_option && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            taskStatusColors[statusKey] ?? 'bg-zinc-500/15 text-zinc-400'
                          }`}
                        >
                          {task.status_option.option_label}
                        </span>
                      )}
                      {assigneeName && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <User size={10} />
                          {assigneeName}
                        </span>
                      )}
                      {task.due && (
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(task.due).toLocaleDateString()}
                        </span>
                      )}
                      {task.priority && (
                        <span className="text-xs text-text-secondary">
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : !showNewTask ? (
          <p className="text-sm text-text-secondary text-center py-4">
            No tasks linked to this meeting yet.
          </p>
        ) : null}
      </div>
    </div>
  )
}
