import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function AppLayout() {
  return (
    <>
      <div className="h-dvh flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <MobileHeader />
          <main className="flex-1 overflow-y-scroll overflow-x-hidden bg-black pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  )
}
