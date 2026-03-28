import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Building2, Users, UserCog, LogOut, Calendar, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/accounts', icon: Building2, label: 'Accounts' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/team', icon: UserCog, label: 'Team' },
]

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email: string | null
  photo: string | null
}

export default function Sidebar() {
  const navigate = useNavigate()
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const [integrationResult, teamResult] = await Promise.all([
        supabase
          .from('user_integrations')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('provider', 'google_calendar')
          .maybeSingle(),
        supabase
          .from('team')
          .select('first_name, last_name, email, photo')
          .eq('email', session.user.email!)
          .maybeSingle(),
      ])

      setCalendarConnected(!!integrationResult.data)
      setProfile(teamResult.data ?? {
        first_name: null,
        last_name: null,
        email: session.user.email ?? null,
        photo: null,
      })
    }
    loadProfile()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

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

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'User'
    : ''

  const initials = profile
    ? (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '') || (profile.email?.[0]?.toUpperCase() ?? 'U')
    : ''

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
      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto min-h-0">
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

      {/* Profile menu */}
      <div ref={menuRef} className="relative p-3 border-t border-border flex-shrink-0">
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Profile info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {profile?.photo ? (
                  <img src={profile.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-muted text-purple flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                  {profile?.email && (
                    <p className="text-xs text-text-secondary truncate">{profile.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Google Calendar */}
            {calendarConnected !== null && (
              calendarConnected ? (
                <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary">
                  <span className="flex h-5 w-5 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </span>
                  Calendar Connected
                </div>
              ) : (
                <button
                  onClick={connectGoogleCalendar}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors w-full"
                >
                  <Calendar size={18} />
                  Connect Google Calendar
                </button>
              )
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-all duration-200"
        >
          {profile?.photo ? (
            <img src={profile.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-muted text-purple flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          <span className="text-sm font-medium text-text-primary truncate flex-1 text-left">
            {displayName}
          </span>
          <ChevronUp size={16} className={`text-text-secondary transition-transform duration-200 ${menuOpen ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  )
}
