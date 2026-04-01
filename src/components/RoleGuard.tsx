import { Navigate } from 'react-router-dom'
import { useCurrentRole } from '@/hooks/useCurrentRole'
import type { AppRole } from '@/hooks/useCurrentRole'

interface RoleGuardProps {
  /** If set, only these roles can access */
  allowedRoles?: AppRole[]
  /** If set, these roles are blocked */
  deniedRoles?: AppRole[]
  children: React.ReactNode
}

export default function RoleGuard({ allowedRoles, deniedRoles, children }: RoleGuardProps) {
  const role = useCurrentRole()

  // While role is loading, render nothing to avoid flash
  if (role === null) return null

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  if (deniedRoles && deniedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
