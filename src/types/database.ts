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
  billing_billing_type_override: string | null
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
}
