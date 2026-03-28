import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, X, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email: string | null
  photo: string | null
}

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

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
    <header
      className="md:hidden sticky top-0 z-50 bg-surface border-b border-border safe-top"
    >
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <img
            src="https://res.cloudinary.com/duy32f0q4/image/upload/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png"
            alt="J9 Logo"
            className="w-7 h-7 rounded"
          />
          <span className="text-base font-bold tracking-tight text-text-primary">
            <span className="text-purple">J9</span> Command Center
          </span>
        </div>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-56 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Profile info */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  {profile?.photo ? (
                    <img src={profile.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-muted text-purple flex items-center justify-center text-xs font-semibold">
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
                  <div className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary">
                    <span className="flex h-[18px] w-[18px] items-center justify-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </span>
                    Calendar Connected
                  </div>
                ) : (
                  <button
                    onClick={connectGoogleCalendar}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors w-full"
                  >
                    <Calendar size={18} />
                    Connect Google Calendar
                  </button>
                )
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut size={18} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
