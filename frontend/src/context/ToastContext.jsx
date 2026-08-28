import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const autoTimers = useRef({})
  const removeTimers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(autoTimers.current[id])
    delete autoTimers.current[id]
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    removeTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      delete removeTimers.current[id]
    }, 180)
  }, [])

  const push = useCallback(
    (variant, title, opts = {}) => {
      const { description, actions, duration } = opts
      const id = nextId++
      setToasts((prev) => [...prev, { id, variant, title, description, actions, leaving: false }])

      // A toast with action buttons stays until the person deals with it —
      // auto-dismissing it out from under a "Retry" click would be worse
      // than leaving it on screen a little long.
      const autoDismissAfter = duration ?? (actions?.length ? null : description ? 6000 : 4000)
      if (autoDismissAfter) {
        autoTimers.current[id] = setTimeout(() => dismiss(id), autoDismissAfter)
      }
      return id
    },
    [dismiss]
  )

  const toast = {
    success: (title, opts) => push('success', title, opts),
    error: (title, opts) => push('error', title, opts),
    info: (title, opts) => push('info', title, opts),
    warning: (title, opts) => push('warning', title, opts),
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
    wash: 'from-emerald-50/80',
    ring: 'ring-emerald-900/5',
    icon: 'bg-emerald-100 text-emerald-600',
    action: 'text-emerald-700 hover:text-emerald-800',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    wash: 'from-red-50/80',
    ring: 'ring-red-900/5',
    icon: 'bg-red-100 text-red-600',
    action: 'text-red-700 hover:text-red-800',
    path: 'M6 6l12 12M18 6L6 18',
  },
  info: {
    wash: 'from-blue-50/80',
    ring: 'ring-blue-900/5',
    icon: 'bg-blue-100 text-blue-600',
    action: 'text-blue-700 hover:text-blue-800',
    path: 'M12 8v.01M12 11v5',
  },
  warning: {
    wash: 'from-amber-50/80',
    ring: 'ring-amber-900/5',
    icon: 'bg-amber-100 text-amber-600',
    action: 'text-amber-700 hover:text-amber-800',
    path: 'M12 8v4.5M12 16v.01',
  },
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-[max(12.5rem,calc(env(safe-area-inset-top)+10.5rem))] right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 md:top-6 md:right-6">
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
      className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-lg shadow-slate-900/10 ring-1 ${styles.ring} ${
        toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.wash} to-transparent`} />

      <div className="relative flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={styles.path} />
          </svg>
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
          {toast.description && <p className="mt-1 text-sm leading-snug text-slate-500">{toast.description}</p>}

          {toast.actions?.length > 0 && (
            <div className="mt-2.5 flex items-center gap-4">
              {toast.actions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    action.onClick?.()
                    if (action.dismissOnClick !== false) onDismiss()
                  }}
                  className={`text-sm font-semibold ${
                    action.variant === 'muted' ? 'text-slate-400 hover:text-slate-500' : styles.action
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="relative shrink-0 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
