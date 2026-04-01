import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, logoutUser as apiLogout } from '../services/authService'
import { clearAuthSession, getStoredToken, getStoredUser, storeAuthSession } from '../lib/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getStoredUser()))
  const [loading, setLoading] = useState(() => Boolean(getStoredUser() || getStoredToken()))

  useEffect(() => {
    const storedUser = getStoredUser()
    const storedToken = getStoredToken()

    if (!storedUser && !storedToken) {
      setLoading(false)
      return
    }

    async function loadUser() {
      try {
        const data = await getCurrentUser()
        if (data.user) {
          setUser(data.user)
          setIsAuthenticated(true)
          storeAuthSession(data)
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

  const loginContext = useCallback((sessionData) => {
    const nextUser = sessionData?.user || sessionData
    setUser(nextUser)
    setIsAuthenticated(true)
    storeAuthSession(sessionData?.user ? sessionData : { user: nextUser })
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
