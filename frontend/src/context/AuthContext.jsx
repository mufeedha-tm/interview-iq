import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, logoutUser as apiLogout } from '../services/authService'
import { clearAuthSession, getStoredUser, storeAuthSession } from '../lib/auth'

const AuthContext = createContext()

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

  const loginContext = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    storeAuthSession({ user: userData })
  }

  const logoutContext = async () => {
    try {
      await apiLogout()
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      clearAuthSession()
    }
  }

  const updateUserContext = (userData) => {
    setUser(userData)
    storeAuthSession({ user: userData })
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, loginContext, logoutContext, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
