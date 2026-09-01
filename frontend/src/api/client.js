import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * A token that is no longer good ends the session, here, once.
 *
 * Tokens now expire (seven days), so this is a thing that actually happens to
 * students rather than a theoretical branch. Without it an expired token just
 * makes every request fail: the shell still renders, each panel shows its own
 * error, and the person has no way to understand that the fix is to sign in
 * again.
 *
 * Only 401 — a network drop, a CORS failure or a 500 leaves the session
 * alone. Signing someone out because their train went into a tunnel loses
 * whatever they were typing.
 *
 * /login is excluded: bad credentials there are a form error for the page to
 * render, not a session to end.
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    if (status === 401 && !url.includes('/login')) {
      const hadSession = localStorage.getItem('token')
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // Back to the door they came in by, so a supervisor isn't handed the
      // student form. Guarded so we don't reload a page that is already the
      // sign-in screen, which would loop.
      if (hadSession && !window.location.pathname.endsWith('/change-password')) {
        const section = ['/admin', '/assessor', '/student'].find((s) =>
          window.location.pathname.startsWith(s)
        )
        window.location.replace(section ?? '/student')
      }
    }

    return Promise.reject(error)
  }
)

export default client
