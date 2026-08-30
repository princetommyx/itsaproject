import { createContext, useCallback, useContext, useMemo } from 'react'

const ToastContext = createContext(null)

/**
 * Toasts, rendered by ToastMagic.
 *
 * The package is a Blade package — its PHP side flashes a toast into the
 * session for the next Blade render — and this application is a React SPA
 * against a JSON API with no Blade views. So only its browser runtime is used:
 * the stylesheet and the `window.toastMagic` object, both loaded from
 * index.html. See public/vendor/toast-magic/README.md.
 *
 * The call sites don't change. `toast.success(title, { description, actions })`
 * still works everywhere it already did, including the one place that needs an
 * action to run a callback rather than follow a link.
 */

const DEFAULT_TIMEOUT = 5000

// Actions that can undo or retry something are worth reading twice, so a toast
// carrying one waits longer before it disappears.
const ACTION_TIMEOUT = 10000

export function ToastProvider({ children }) {
  const push = useCallback((type, title, options = {}) => {
    const runtime = typeof window !== 'undefined' ? window.toastMagic : null

    if (!runtime) {
      // The runtime is a plain script tag, so an ad blocker or a failed asset
      // load leaves it missing. A toast is never the only feedback in this
      // app — the page state always changes too — so the right response is to
      // carry on rather than throw inside an event handler.
      console.warn('ToastMagic runtime unavailable; skipping toast:', title)
      return
    }

    const { description, actions = [] } = options

    // ToastMagic renders one action, as a link. Ours are usually callbacks, so
    // the href is inert and the behaviour is attached to the rendered element
    // below — show() hands it back for exactly this kind of wiring.
    const action = actions.find((a) => typeof a.onClick === 'function')
    const hasAction = Boolean(action)

    const element = runtime[type]({
      heading: title,
      description: description ?? '',
      showCloseBtn: true,
      timeOut: options.timeOut ?? (hasAction ? ACTION_TIMEOUT : DEFAULT_TIMEOUT),
      ...(hasAction ? { customBtnText: action.label, customBtnLink: '#' } : {}),
    })

    if (hasAction && element) {
      const link = element.querySelector('.toast-custom-btn')
      link?.addEventListener('click', (event) => {
        event.preventDefault()
        action.onClick()
        if (action.dismissOnClick !== false) element.remove()
      })
    }

    return element
  }, [])

  const toast = useMemo(
    () => ({
      success: (title, options) => push('success', title, options),
      error: (title, options) => push('error', title, options),
      info: (title, options) => push('info', title, options),
      warning: (title, options) => push('warning', title, options),
      clear: () => window.toastMagic?.clear(),
    }),
    [push]
  )

  return <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
}

export function useToast() {
  const toast = useContext(ToastContext)

  if (!toast) {
    throw new Error('useToast must be used inside a ToastProvider')
  }

  return toast
}
