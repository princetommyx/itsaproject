import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const push = useCallback(
    (message, variant = 'success', duration = 4000) => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, message, variant }])
      timers.current[id] = setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss]
  )

  const toast = {
    success: (message, duration) => push(message, 'success', duration),
    error: (message, duration) => push(message, 'error', duration),
    info: (message, duration) => push(message, 'info', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const VARIANT_STYLES = {
  success: {
    bar: 'bg-emerald-500',
    icon: 'bg-emerald-100 text-emerald-600',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    bar: 'bg-red-500',
    icon: 'bg-red-100 text-red-600',
    path: 'M6 6l12 12M18 6L6 18',
  },
  info: {
    bar: 'bg-blue-500',
    icon: 'bg-blue-100 text-blue-600',
    path: 'M12 8h.01M11 12h1v4h1',
  },
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:top-6 sm:right-6">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const styles = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.success

  return (
    <div
      role="status"
      className="animate-toast-in flex items-start gap-3 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5"
    >
      <span className={`h-full w-1 shrink-0 self-stretch ${styles.bar}`} />
      <span className={`mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={styles.path} />
        </svg>
      </span>
      <p className="flex-1 py-3 pr-2 text-sm font-medium text-slate-700">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="mt-2.5 mr-2 shrink-0 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
