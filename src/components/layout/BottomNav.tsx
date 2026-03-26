import { NavLink } from 'react-router-dom'
import { Home, Building2, Users, UserCog } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden bg-surface border-t border-border flex-shrink-0 safe-bottom-nav">
      <div className="flex justify-around items-center h-14">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-purple'
                  : 'text-text-secondary'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
