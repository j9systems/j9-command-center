export interface Account {
  id: string
  company_name: string | null
  type: string | null
  partner_id: string | null
  quickbooks_id: number | null
  logo_path: string | null
  ap_email: string | null
  depth_next_action: string | null
  depth_next_action_date: string | null
  depth_ready_for_next_action: string | null
  billing_billing_type_override: number | null
  depth_inactive: string | null
  notes: string | null
  sales_closed_by_override: string | null
  status: number | null
}

export interface AccountWithStatus extends Account {
  status_label: string | null
  status_key: string | null
}

export interface Contact {
  id: string
  first_name: string | null
  last_name: string | null
  status: string | null
  phone: string | null
  notes: string | null
  assigned_to_id: string | null
  email: string | null
  interest_level: string | null
  company_name: string | null
  portal_status: string | null
}

export interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  personal_email: string | null
  photo: string | null
  role: string | null
  role_id: number | null
  desired_hr_capacity: number | null
  active: string | null
  phone: number | null
}

export interface Option {
  id: number
  created_at: string
  category: string | null
  option_key: string | null
  option_label: string | null
}

export interface Project {
  id: string
  name: string | null
  account_id: string | null
  status: string | null
  project_manager_id: string | null
  project_start: string | null
  project_end: string | null
  description: string | null
  estimated_hours_to_complete: string | null
}

export interface AccountContact {
  id: string
  contact_id: string | null
  account_id: string | null
  is_primary: string | null
}

export interface AccountTeam {
  id: string
  team_member_id: string | null
  account_id: string | null
  expected_weekly_hrs: string | null
  role: string | null
  role_id: number | null
}

export interface AccountRole {
  id: number
  created_at: string
  name: string
}

export interface Role {
  id: number
  created_at: string
  name: string
}

export interface Task {
  row_id: string
  name: string | null
  status_id: number | null
  due: string | null
  objective_id: string | null
  notes: string | null
  assigned_to_id_internal: string | null
  done: unknown | null
  priority: string | null
  snooze_date: string | null
  project_id: string | null
  from_meeting_id: string | null
  assigned_to_id_external: string | null
  assignee_group: string | null
  created: string | null
  account_id: string | null
}

export interface TimeLog {
  id: string
  account_id: string | null
  project_id: string | null
  assigned_to_id: string | null
  date: string | null
  hours: number | null
  name: string | null
  created_at: string | null
  status_id: number | null
}

export interface Invoice {
  row_id: string
  created_date: string | null
  sent_date: string | null
  account_id: string | null
  amount: number | null
  rate: number | null
  qb_id: number | null
  quickbooks_id: number | null
  payment_link: string | null
  project_id: string | null
  send_pressed: string | null
  status_id: number | null
}

export interface InvoiceLineItem {
  row_id: string
  name: string | null
  invoice_id: string | null
  account_id: string | null
  amount: number | null
  rate: string | null
  time_log_id: string | null
  date: string | null
  hours: string | null
}

export interface Meeting {
  row_id: string
  name: string | null
  meeting_start: string | null
  meeting_end: string | null
  duration: string | null
  description_agenda: string | null
  meeting_notes: string | null
  gmeet_link: string | null
  meeting_link: string | null
  location: string | null
  status: string | null
  meeting_type: string | null
  account_id: string | null
  raw_attendees: { email: string; displayName?: string }[] | null
  organizer_id: string | null
}

export interface MeetingAttendee {
  row_id: string
  external_attendee_id: string | null
  meeting_id: string | null
  internal_attendee_id: string | null
  attendee_group: string | null
}

export interface Feature {
  id: string
  project_id: string | null
  name: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  status_id: number | null
  precedes_id: string | null
  follows_id: string | null
  created_at: string | null
}
