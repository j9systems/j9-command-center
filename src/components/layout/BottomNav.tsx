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
    <nav className="bottom-nav md:hidden">
      <div className="flex justify-around items-center h-10">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-px px-3 text-[10px] font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-purple'
                  : 'text-text-secondary'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
