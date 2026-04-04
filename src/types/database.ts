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
  status_id: number | null
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
  rate_override: string | null
  commission_override: string | null
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
  task_id: string | null
  assigned_to_id: string | null
  date: string | null
  hours: number | null
  name: string | null
  created_at: string | null
  status_id: number | null
  start_date_time: string | null
  end_date_time: string | null
}

export interface TimeLogBreak {
  id: string
  time_log_id: string
  break_start: string
  break_end: string | null
  created_at: string
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

export interface Lead {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  unsubscribe: string | null
  partial_submission: string | null
  submission_date: string | null
  current_systems: string | null
  pain_points: string | null
  industry: string | null
  company_size: string | null
  event_url: string | null
  gmeet_link: string | null
  source: string | null
  website: string | null
  contact_id: string | null
  appointment_confirmation_notes: string | null
  cold_call_triage_notes: string | null
  core_business: string | null
  notes: string | null
  pitch_script_notes: string | null
  billing_contact_name: string | null
  billing_email: string | null
  status_justification: string | null
  business_name: string | null
  scheduled_callback_date_time: string | null
  need_to_overwrite_text_content: string | null
  business_annual_revenue: string | null
  text_message_content: string | null
  billing_frequency: string | null
  what_to_improve_first: string | null
  other_industry: string | null
  interest_level: number | null
  booked_sales_call_date_time: string | null
  other_pain_points: string | null
  kill_list: boolean | null
  intro_draft: string | null
  follow_up_on: string | null
  status_id: number | null
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

export interface Payment {
  row_id: string
  customer_qb_id: number | null
  date: string | null
  amount: number | null
  is_retainer: unknown | null
  qb_invoice_id: number | null
  qb_invoice_id_ref: string | null
}

export interface Interaction {
  id: string
  subject: string | null
  inbound_outbound: string | null       // 'Inbound' | 'Outbound'
  opened: string | null
  opened_at: string | null
  from_email: string | null
  body: string | null
  date: string | null                   // timestamptz — primary date field
  to_email: string | null
  contact_id: string | null
  type: string | null                   // legacy text column, kept for reference
  type_id: number | null               // FK → options(id), category = 'interaction_type'
  meeting_id: string | null
  duration: string | null
  meeting_duration: string | null
  notes: string | null
  phone_from: string | null
  phone_to: string | null
  automated: string | null
  from_template_id: string | null
  clicked: string | null
  postman_email_id: string | null
  lead_id: string | null
}

export interface InteractionWithType extends Interaction {
  type_option: Option | null
}

export interface RetainerPayoutQuarter {
  row_id: string
  retainer_payment_id: string | null
  paid_out: boolean | null
  week_id: string | null
  created_date: string | null
}
