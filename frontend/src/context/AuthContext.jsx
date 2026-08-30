import { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'
import { useTheme } from './ThemeContext'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { resetTheme } = useTheme()
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    return Boolean(token && !savedUser)
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    client
      .get('/me')
      .then((res) => {
        setUser(res.data)
        localStorage.setItem('user', JSON.stringify(res.data))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(identifier, password) {
    const res = await client.post('/login', { identifier, password })
    return res.data
  }

  function commitSession(token, sessionUser) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(sessionUser))
    setUser(sessionUser)
  }

  async function discardSession(token) {
    try {
      await client.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // ignore network errors
    }
  }

  async function logout() {
    const token = localStorage.getItem('token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // A theme is the signed-in person's choice, and this is a website on a
    // possibly shared browser — the next person at the login screen should
    // not inherit it.
    resetTheme()
    setUser(null)
    try {
      await client.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // ignore network errors
    }
  }

  function updateUser(patch) {
    setUser((prev) => {
      const updated = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, commitSession, discardSession, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
