import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

function useViewportHeight() {
  const [debug, setDebug] = useState('')

  useEffect(() => {
    function setHeight() {
      const ih = window.innerHeight
      const sh = window.screen.height
      const vh = document.documentElement.clientHeight
      const vv = window.visualViewport?.height ?? 0

      document.documentElement.style.setProperty('--app-height', `${ih}px`)

      setDebug(`innerH:${ih} screen:${sh} clientH:${vh} visual:${Math.round(vv)}`)
    }
    setHeight()
    window.addEventListener('resize', setHeight)
    window.visualViewport?.addEventListener('resize', setHeight)
    return () => {
      window.removeEventListener('resize', setHeight)
      window.visualViewport?.removeEventListener('resize', setHeight)
    }
  }, [])

  return debug
}

export default function AppLayout() {
  const debug = useViewportHeight()

  return (
    <div className="flex overflow-hidden" style={{ height: 'var(--app-height, 100vh)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
          {/* Temporary debug - remove after testing */}
          <div className="bg-red-500 text-white text-xs p-2 font-mono md:hidden">
            {debug}
          </div>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
