import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import AccountsPage from './pages/AccountsPage'
import ContactsPage from './pages/ContactsPage'
import TeamPage from './pages/TeamPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/team" element={<TeamPage />} />
      </Route>
    </Routes>
  )
}
