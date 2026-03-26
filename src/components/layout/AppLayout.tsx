import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

function useViewportHeight() {
  useEffect(() => {
    function setHeight() {
      document.documentElement.style.setProperty(
        '--app-height',
        `${window.innerHeight}px`
      )
    }
    setHeight()
    window.addEventListener('resize', setHeight)
    window.visualViewport?.addEventListener('resize', setHeight)
    return () => {
      window.removeEventListener('resize', setHeight)
      window.visualViewport?.removeEventListener('resize', setHeight)
    }
  }, [])
}

export default function AppLayout() {
  useViewportHeight()

  return (
    <div className="flex overflow-hidden" style={{ height: 'var(--app-height, 100vh)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto bg-black">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
