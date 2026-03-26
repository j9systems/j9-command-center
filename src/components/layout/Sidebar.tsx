import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Building2, Users, UserCog, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-surface border-r border-border h-full">
      <div className="p-5 border-b border-border flex flex-col items-center gap-2">
        <img
          src="https://res.cloudinary.com/duy32f0q4/image/upload/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png"
          alt="J9 Logo"
          className="w-8 h-8 rounded"
        />
        <h1 className="text-lg font-bold tracking-tight text-text-primary">
          <span className="text-purple">J9</span> Command Center
        </h1>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-purple-muted text-purple'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
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
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </aside>
  )
}
