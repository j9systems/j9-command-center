import { NavLink } from 'react-router-dom'
import { Home, Building2, Users, UserCog, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar border-r border-border h-full">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight text-text-primary leading-tight">
          <span className="text-accent">J9</span> Command Center
        </h1>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-base font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-br from-accent/20 to-accent-deep/12 text-text-primary border border-accent/25 shadow-[inset_0_0_0_1px_rgba(123,97,255,0.15)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-overlay'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-md text-base font-medium text-text-secondary hover:text-text-primary hover:bg-overlay transition-all duration-150 w-full"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
