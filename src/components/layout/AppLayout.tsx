import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MobileHeader from './MobileHeader'

export default function AppLayout() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
