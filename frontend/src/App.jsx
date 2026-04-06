import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CursorAura, PageTransition, ScrollProgress } from './components/PremiumEffects'
import ProtectedRoute from './components/ProtectedRoute'
import { Spinner } from './components/Spinner'

const AppLayout = lazy(() => import('./components/AppLayout'))
const AuthLayout = lazy(() => import('./components/AuthLayout'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StartInterviewPage = lazy(() => import('./pages/StartInterviewPage'))
const InterviewSessionPage = lazy(() => import('./pages/InterviewSessionPage'))
const InterviewHistoryPage = lazy(() => import('./pages/InterviewHistoryPage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminQuestionsPage = lazy(() => import('./pages/AdminQuestionsPage'))

function RouteFallback() {
  return (
    <div className="px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-[1440px] items-center justify-center rounded-[24px] border border-ink-100 bg-white/75 p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-ink-900/70">
        <Spinner label="Loading page" />
      </div>
    </div>
  )
}

function App() {
  const location = useLocation()

  return (
    <>
      <ScrollProgress />
      <CursorAura />
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </>
  )
}

export default App
