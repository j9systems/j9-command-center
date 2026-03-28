import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Building2, Users, UserCog, LogOut, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkCalendar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase
        .from('user_integrations')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('provider', 'google_calendar')
        .maybeSingle()
      setCalendarConnected(!!data)
    }
    checkCalendar()
  }, [])

  async function connectGoogleCalendar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-connect`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
      access_type: 'offline',
      prompt: 'consent',
      state: session.access_token,
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

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
      <div className="p-3 border-t border-border flex flex-col gap-1">
        {calendarConnected !== null && (
          calendarConnected ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary">
              <span className="relative flex h-5 w-5 items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </span>
              Calendar Connected
            </div>
          ) : (
            <button
              onClick={connectGoogleCalendar}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-200 w-full"
            >
              <Calendar size={20} />
              Connect Google Calendar
            </button>
          )
        )}
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
