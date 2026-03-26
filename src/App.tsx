import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import ContactsPage from './pages/ContactsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TeamPage from './pages/TeamPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
        <Route path="/accounts/:id/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/team" element={<TeamPage />} />
      </Route>
    </Routes>
  )
}
