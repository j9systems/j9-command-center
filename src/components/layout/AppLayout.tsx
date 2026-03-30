import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function AppLayout() {
  return (
    <div className="h-dvh flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <MobileHeader />
        <main className="flex-1 overflow-y-scroll overflow-x-hidden bg-black">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
