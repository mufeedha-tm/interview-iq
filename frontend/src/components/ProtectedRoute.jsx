import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Spinner } from './Spinner'

function ProtectedRoute({ children, requiredRole }) {
  const location = useLocation()
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <Spinner label="Loading session..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
