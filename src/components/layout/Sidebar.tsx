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
    <aside className="hidden md:flex flex-col w-72 bg-sidebar border-r border-border h-full">
      <div className="flex justify-center px-8 py-10 border-b border-border">
        <img
          src="https://res.cloudinary.com/duy32f0q4/image/upload/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png"
          alt="J9 Command Center"
          className="h-14 w-auto"
        />
      </div>
      <nav className="flex-1 px-6 py-8 flex flex-col gap-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-6 py-4 rounded-lg text-md font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent-glow text-accent border border-accent/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-8 border-t border-border">
        <button
          onClick={signOut}
          className="flex items-center gap-4 px-6 py-4 rounded-lg text-md font-medium text-text-secondary hover:text-text-primary hover:bg-elevated transition-all duration-150 w-full"
        >
          <LogOut size={22} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
