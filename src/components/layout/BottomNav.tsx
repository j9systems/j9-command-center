import { NavLink } from 'react-router-dom'
import { getVisibleNavItems, MAX_BOTTOM_NAV_ITEMS } from '@/lib/navItems'
import { useCurrentRole } from '@/hooks/useCurrentRole'

export default function BottomNav() {
  const role = useCurrentRole()
  const visibleItems = getVisibleNavItems(role).slice(0, MAX_BOTTOM_NAV_ITEMS)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] touch-none">
      <div className="flex items-center justify-around">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] min-w-[56px] text-xs font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-purple font-bold'
                  : 'text-text-secondary'
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
