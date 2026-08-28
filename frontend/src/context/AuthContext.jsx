import { createContext, useContext, useEffect, useState } from 'react'
import client from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    client
      .get('/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  // Authenticates but does NOT commit the session to app state — callers
  // that need to validate the response (e.g. reject a wrong-role login)
  // must call commitSession() themselves once they're satisfied. This
  // matters because setting `user` here would make every component
  // watching auth state (like a role-gated route) react and redirect
  // immediately, racing ahead of the caller's own validation.
  async function login(identifier, password) {
    const res = await client.post('/login', { identifier, password })
    return res.data
  }

  function commitSession(token, sessionUser) {
    localStorage.setItem('token', token)
    setUser(sessionUser)
  }

  async function discardSession(token) {
    try {
      await client.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // ignore network errors — the token simply expires unused
    }
  }

  async function logout() {
    const token = localStorage.getItem('token')
    localStorage.removeItem('token')
    setUser(null)
    try {
      await client.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // ignore network errors — the token simply expires unused
    }
  }

  function updateUser(patch) {
    setUser((prev) => ({ ...prev, ...patch }))
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
