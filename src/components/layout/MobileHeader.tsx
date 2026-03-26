import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, LogOut, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
            <div className="absolute right-0 top-12 w-48 bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
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
