import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/endpoints'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate session from localStorage on mount
  useEffect(() => {
    const savedUser  = localStorage.getItem('user')
    const accessToken = localStorage.getItem('access_token')

    if (savedUser && accessToken) {
      try { setUser(JSON.parse(savedUser)) }
      catch { localStorage.clear() }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    const { user: userData, access_token, refresh_token } = data.data

    localStorage.setItem('access_token',  access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (email, username, password) => {
    const { data } = await authAPI.register({ email, username, password })
    const { user: userData, access_token, refresh_token } = data.data

    localStorage.setItem('access_token',  access_token)
    localStorage.setItem('refresh_token', refresh_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch { /* silent */ }
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
