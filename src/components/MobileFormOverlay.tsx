import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Wraps form content in a bottom-sheet style overlay on mobile (<768px).
 * On desktop, renders children inline as-is.
 */
export default function MobileFormOverlay({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative w-full max-h-[85vh] overflow-y-auto bg-surface border-t border-border rounded-t-2xl p-5 pb-8 safe-bottom animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
