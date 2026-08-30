import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'
import { cn } from '../lib/cn'

/**
 * A field on the signed-out screens.
 *
 * Filled and bordered rather than the underline it used to be: an underline
 * gives no indication of where the input begins or how far it extends, which
 * on the old login screen made the password field look like it wasn't there
 * at all until you clicked into it.
 *
 * `action` puts a link on the label row — where "Forgot password?" belongs,
 * beside the thing it is about.
 */
export default function AuthField({ label, action, type = 'text', className = '', ...props }) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block text-left">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {action}
      </span>

      <span className="relative block">
        <input
          type={isPassword && visible ? 'text' : type}
          className={cn(
            'w-full rounded-xl border border-input bg-card px-4 py-3 text-[15px] font-medium text-foreground transition duration-150',
            'placeholder:font-normal placeholder:text-muted-foreground',
            'hover:border-ring/60 focus:border-brand focus:ring-[3px] focus:ring-ring/25 focus:outline-none',
            isPassword && 'pr-11',
            className
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
          >
            {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        )}
      </span>
    </label>
  )
}
