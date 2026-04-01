import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AppRole = 'Admin' | 'Account Manager' | 'Contractor' | 'Sales'

export function useCurrentRole(): AppRole | null {
  const [role, setRole] = useState<AppRole | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setRole((session?.user?.app_metadata?.role as AppRole) ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRole((session?.user?.app_metadata?.role as AppRole) ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return role
}
