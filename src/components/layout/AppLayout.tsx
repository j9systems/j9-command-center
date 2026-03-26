import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function AppLayout() {
  return (
    <div className="flex h-[100dvh]">
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
