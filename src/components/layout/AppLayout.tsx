import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

function useViewportHeight() {
  useEffect(() => {
    function setHeight() {
      // window.innerHeight excludes the home indicator area on iOS.
      // screen.height gives the full physical screen height in CSS pixels.
      const h = window.screen.height
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
    setHeight()
    window.addEventListener('resize', setHeight)
    return () => window.removeEventListener('resize', setHeight)
  }, [])
}

export default function AppLayout() {
  useViewportHeight()

  return (
    <div
      className="fixed top-0 left-0 right-0 flex overflow-hidden"
      style={{ height: 'var(--app-height, 100vh)' }}
    >
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
