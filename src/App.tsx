import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { ActiveTimeLogProvider } from '@/context/ActiveTimeLogContext'
import ActiveTimeLogWidget from '@/components/timelog/ActiveTimeLogWidget'
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
          <Route path="/accounts/:id/leads" element={<AccountLeadsPage />} />
          <Route path="/accounts/:id/billing" element={<AccountBillingPage />} />
          <Route path="/accounts/:id/payroll" element={<AccountPayrollPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/team/:teamId" element={<TeamMemberDetailPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/invoices/:invoiceId" element={<BillingInvoiceDetailPage />} />
          <Route path="/billing/payments/:paymentId" element={<PaymentDetailPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
        </Route>
      </Routes>
    </ActiveTimeLogProvider>
  )
}
