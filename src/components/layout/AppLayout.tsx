import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="flex h-full bg-page">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 md:pt-10 md:pl-12 md:pr-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
