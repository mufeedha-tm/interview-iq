import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CursorAura, PageTransition, ScrollProgress } from './components/PremiumEffects'
import AppLayout from './components/AppLayout'
import AuthLayout from './components/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import StartInterviewPage from './pages/StartInterviewPage'
import InterviewSessionPage from './pages/InterviewSessionPage'
import InterviewHistoryPage from './pages/InterviewHistoryPage'
import ResultsPage from './pages/ResultsPage'
import ResumeAnalyzerPage from './pages/ResumeAnalyzerPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminReportsPage from './pages/AdminReportsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminQuestionsPage from './pages/AdminQuestionsPage'
function App() {
  const location = useLocation()

  return (
    <>
      <ScrollProgress />
      <CursorAura />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
            <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
            <Route path="/verify-email" element={<PageTransition><VerifyEmailPage /></PageTransition>} />
            <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
            <Route path="/start-interview" element={<PageTransition><StartInterviewPage /></PageTransition>} />
            <Route path="/interview-session" element={<PageTransition><InterviewSessionPage /></PageTransition>} />
            <Route path="/history" element={<PageTransition><InterviewHistoryPage /></PageTransition>} />
            <Route path="/results" element={<PageTransition><ResultsPage /></PageTransition>} />
            <Route path="/resume-analyzer" element={<PageTransition><ResumeAnalyzerPage /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
            <Route
              path="/admin-users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PageTransition><AdminUsersPage /></PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-reports"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PageTransition><AdminReportsPage /></PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PageTransition><AdminDashboardPage /></PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-questions"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PageTransition><AdminQuestionsPage /></PageTransition>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App
