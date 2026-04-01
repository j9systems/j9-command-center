import { Home, Building2, Users, UserCog, Target, CreditCard, Wallet, ClipboardList, Timer, BookOpen, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

export const navItems: NavItem[] = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
  { to: '/leads', icon: Target, label: 'Leads' },
  { to: '/meetings', icon: CalendarDays, label: 'Meetings' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/time-logs', icon: Timer, label: 'Time Logs' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/payroll', icon: Wallet, label: 'Payroll' },
  { to: '/sops', icon: BookOpen, label: 'SOPs' },
]

export const MAX_BOTTOM_NAV_ITEMS = 5
