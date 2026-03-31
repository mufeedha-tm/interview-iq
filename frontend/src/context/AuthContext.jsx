import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, logoutUser as apiLogout } from '../services/authService'
import { clearAuthSession, getStoredUser, storeAuthSession } from '../lib/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredUser()))
  const [loading, setLoading] = useState(() => Boolean(getStoredUser()))

  useEffect(() => {
    const storedUser = getStoredUser()

    if (!storedUser) {
      setLoading(false)
      return
    }

    async function loadUser() {
      try {
        const data = await getCurrentUser()
        if (data.user) {
          setUser(data.user)
          setIsAuthenticated(true)
          storeAuthSession({ user: data.user })
        }
      } catch {
        setUser(null)
        setIsAuthenticated(false)
        clearAuthSession()
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const loginContext = useCallback((userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    storeAuthSession({ user: userData })
  }, [])

  const logoutContext = useCallback(async () => {
    try {
      await apiLogout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      clearAuthSession()
    }
  }, [])

  const updateUserContext = useCallback((userData) => {
    setUser(userData)
    storeAuthSession({ user: userData })
  }, [])

  const contextValue = useMemo(
    () => ({ user, isAuthenticated, loading, loginContext, logoutContext, updateUserContext }),
    [user, isAuthenticated, loading, loginContext, logoutContext, updateUserContext],
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
