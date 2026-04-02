import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ActiveTimeLogProvider } from '@/context/ActiveTimeLogContext'
import ActiveTimeLogWidget from '@/components/timelog/ActiveTimeLogWidget'
import RoleGuard from '@/components/RoleGuard'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import ContactsPage from './pages/ContactsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import FeatureDetailPage from './pages/FeatureDetailPage'
import TaskDetailPage from './pages/TaskDetailPage'
import TeamPage from './pages/TeamPage'
import TeamMemberDetailPage from './pages/TeamMemberDetailPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import TimeLogDetailPage from './pages/TimeLogDetailPage'
import MeetingDetailPage from './pages/MeetingDetailPage'
import AccountLeadsPage from './pages/AccountLeadsPage'
import AccountBillingPage from './pages/AccountBillingPage'
import AccountPayrollPage from './pages/AccountPayrollPage'
import LeadsPage from './pages/LeadsPage'
import BillingPage from './pages/BillingPage'
import BillingInvoiceDetailPage from './pages/BillingInvoiceDetailPage'
import PaymentDetailPage from './pages/PaymentDetailPage'
import PayrollPage from './pages/PayrollPage'
import TasksPage from './pages/TasksPage'
import TimeLogsPage from './pages/TimeLogsPage'
import SOPsPage from './pages/SOPsPage'
import MeetingsPage from './pages/MeetingsPage'
import ProjectsPage from './pages/ProjectsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <ActiveTimeLogProvider>
      <ActiveTimeLogWidget />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          <Route path="/accounts/:id/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/accounts/:id/meetings/:meetingId" element={<MeetingDetailPage />} />
          <Route path="/accounts/:id/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/accounts/:id/time-logs/:timeLogId" element={<TimeLogDetailPage />} />
          <Route path="/accounts/:id/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/accounts/:id/projects/:projectId/features/:featureId" element={<FeatureDetailPage />} />
          <Route path="/accounts/:id/leads" element={<RoleGuard deniedRoles={['Contractor']}><AccountLeadsPage /></RoleGuard>} />
          <Route path="/accounts/:id/billing" element={<RoleGuard deniedRoles={['Contractor']}><AccountBillingPage /></RoleGuard>} />
          <Route path="/accounts/:id/payroll" element={<RoleGuard deniedRoles={['Contractor']}><AccountPayrollPage /></RoleGuard>} />
          <Route path="/contacts" element={<RoleGuard deniedRoles={['Contractor']}><ContactsPage /></RoleGuard>} />
          <Route path="/team" element={<RoleGuard allowedRoles={['Admin']}><TeamPage /></RoleGuard>} />
          <Route path="/team/:teamId" element={<RoleGuard allowedRoles={['Admin']}><TeamMemberDetailPage /></RoleGuard>} />
          <Route path="/leads" element={<RoleGuard allowedRoles={['Admin']}><LeadsPage /></RoleGuard>} />
          <Route path="/billing" element={<RoleGuard allowedRoles={['Admin']}><BillingPage /></RoleGuard>} />
          <Route path="/billing/invoices/:invoiceId" element={<RoleGuard allowedRoles={['Admin']}><BillingInvoiceDetailPage /></RoleGuard>} />
          <Route path="/billing/payments/:paymentId" element={<RoleGuard allowedRoles={['Admin']}><PaymentDetailPage /></RoleGuard>} />
          <Route path="/payroll" element={<RoleGuard allowedRoles={['Admin']}><PayrollPage /></RoleGuard>} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/time-logs" element={<TimeLogsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
          <Route path="/sops" element={<RoleGuard allowedRoles={['Admin']}><SOPsPage /></RoleGuard>} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </ActiveTimeLogProvider>
  )
}
