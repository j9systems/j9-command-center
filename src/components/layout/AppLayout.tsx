import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function AppLayout() {
  return (
    <>
      <div className="min-h-dvh flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black pb-16 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
