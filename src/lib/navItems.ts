import { Home, Building2, Users, UserCog, Target, CreditCard, Wallet } from 'lucide-react'
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
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/payroll', icon: Wallet, label: 'Payroll' },
]

export const MAX_BOTTOM_NAV_ITEMS = 5
