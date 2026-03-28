import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

function useViewportHeight() {
  useEffect(() => {
    function setHeight() {
      // visualViewport shrinks when the on-screen keyboard opens,
      // letting us keep the layout above the keyboard.
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
    setHeight()
    window.visualViewport?.addEventListener('resize', setHeight)
    window.addEventListener('resize', setHeight)
    return () => {
      window.visualViewport?.removeEventListener('resize', setHeight)
      window.removeEventListener('resize', setHeight)
    }
  }, [])
}

export default function AppLayout() {
  useViewportHeight()

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
