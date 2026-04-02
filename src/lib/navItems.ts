import { Home, Building2, Users, UserCog, Target, CreditCard, Wallet, ClipboardList, Timer, BookOpen, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppRole } from '@/hooks/useCurrentRole'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  /** If set, only these roles see this nav item */
  allowedRoles?: AppRole[]
  /** If set, these roles are hidden from this nav item */
  deniedRoles?: AppRole[]
}

export const navItems: NavItem[] = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts', deniedRoles: ['Contractor'] },
  { to: '/team', icon: UserCog, label: 'Team', allowedRoles: ['Admin'] },
  { to: '/leads', icon: Target, label: 'Leads', allowedRoles: ['Admin'] },
  { to: '/meetings', icon: CalendarDays, label: 'Meetings' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/time-logs', icon: Timer, label: 'Time Logs' },
  { to: '/billing', icon: CreditCard, label: 'Billing', allowedRoles: ['Admin'] },
  { to: '/payroll', icon: Wallet, label: 'Payroll', allowedRoles: ['Admin'] },
  { to: '/sops', icon: BookOpen, label: 'SOPs', allowedRoles: ['Admin'] },
]

export const MAX_BOTTOM_NAV_ITEMS = 5

export function getVisibleNavItems(role: AppRole | null): NavItem[] {
  return navItems.filter((item) => {
    if (item.allowedRoles && (!role || !item.allowedRoles.includes(role))) return false
    if (item.deniedRoles && role && item.deniedRoles.includes(role)) return false
    return true
  })
}
