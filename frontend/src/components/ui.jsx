import { forwardRef } from 'react'
import Spinner from './Spinner'

export function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-[15px] font-medium break-words text-slate-900">{value || '—'}</p>
    </div>
  )
}

// Caps the stagger at `maxSteps` items so a long grid still finishes
// animating in quickly instead of trailing off for a huge list.
export function stagger(i, stepMs = 40, maxSteps = 8) {
  return { animationDelay: `${Math.min(i, maxSteps) * stepMs}ms` }
}

export function PageHeading({ children, description, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{children}</h1>
        {description && <p className="mt-1.5 text-[15px] font-medium text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-cyan-100 text-cyan-700',
]

export function Avatar({ name, className = '' }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const palette = AVATAR_PALETTE[hash % AVATAR_PALETTE.length]

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${palette} ${className}`}
    >
      {initials || '?'}
    </span>
  )
}

export function Card({ children, className = '', interactive = false }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-8px_rgba(15,23,42,0.14)] ${
        interactive
          ? 'transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_36px_-10px_rgba(15,23,42,0.2)]'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const variants = {
    primary: 'bg-upsa-blue text-white shadow-sm shadow-upsa-blue/20 hover:bg-upsa-blue-dark',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: 'border-2 border-upsa-blue bg-transparent text-upsa-blue hover:bg-upsa-blue/5',
    danger: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700',
    success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700',
  }
  // Outline and secondary both draw dark text on a light ground, so their
  // spinner needs to be dark too.
  const light = !['secondary', 'outline'].includes(variant)

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" light={light} />}
      {children}
    </button>
  )
}

const FIELD_CLASSES =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-[15px] font-medium text-slate-900 transition duration-150 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-500'

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>}
      <input
        ref={ref}
        className={`${FIELD_CLASSES} ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 hover:border-slate-300 focus:border-upsa-blue focus:ring-upsa-blue/10'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
})

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>}
      <textarea
        className={`${FIELD_CLASSES} ${
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-200 hover:border-slate-300 focus:border-upsa-blue focus:ring-upsa-blue/10'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

// Shared status metadata so the compact Badge and the colorful StatCard
// stay in sync — same status, same color family, everywhere in the app.
export const STATUS_LABELS = {
  draft: 'Draft',
  submitted_unassigned: 'Awaiting Assignment',
  pending: 'Under Review',
  approved: 'Approved',
  refine: 'Needs Refinement',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const STATUS_VARIANTS = {
  draft: 'slate',
  submitted_unassigned: 'gold',
  pending: 'blue',
  approved: 'violet',
  refine: 'pink',
  open: 'gold',
  in_progress: 'blue',
  resolved: 'violet',
}

const BADGE_STYLES = {
  slate: 'bg-slate-100 text-slate-700',
  gold: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  violet: 'bg-violet-100 text-violet-700',
  pink: 'bg-pink-100 text-pink-700',
}

const DOT_STYLES = {
  slate: 'bg-slate-500',
  gold: 'bg-amber-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
}

export function Badge({ status, className = '' }) {
  const variant = STATUS_VARIANTS[status] || 'slate'

  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[variant]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[variant]}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const STAT_CARD_STYLES = {
  pink: 'bg-pink-50 text-pink-800',
  gold: 'bg-amber-50 text-amber-800',
  blue: 'bg-blue-50 text-blue-800',
  violet: 'bg-violet-50 text-violet-800',
  slate: 'bg-slate-100 text-slate-700',
}

export function StatCard({ label, value, variant = 'blue', className = '', style }) {
  return (
    <div
      style={style}
      className={`rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_6px_16px_-8px_rgba(15,23,42,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-2px_rgba(15,23,42,0.14)] sm:p-5 ${STAT_CARD_STYLES[variant] || STAT_CARD_STYLES.blue} ${className}`}
    >
      <p className="text-xs font-bold tracking-wide uppercase opacity-85">{label}</p>
      <p className="mt-3 text-xl font-extrabold break-words sm:text-2xl">{value}</p>
    </div>
  )
}

export function HeroStatCard({ label, value, caption }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-upsa-blue to-upsa-blue-dark p-6 text-white shadow-lg shadow-upsa-blue/20">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-upsa-gold/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex items-end justify-between gap-4">
        <p className="text-lg font-semibold">{label}</p>
        <div className="text-right">
          <p className="text-4xl font-extrabold tracking-tight">{value}</p>
          {caption && <p className="mt-1 text-sm font-medium text-white/80">{caption}</p>}
        </div>
      </div>
    </div>
  )
}

export function Alert({ children, variant = 'error' }) {
  const variants = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <div className={`rounded-xl border px-3.5 py-3 text-sm font-medium ${variants[variant]}`}>{children}</div>
  )
}

export function ErrorState({ title = "Couldn't load this", description, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-500">
        !
      </span>
      <p className="text-base font-bold text-slate-800">{title}</p>
      <p className="max-w-xs text-sm font-medium text-slate-500">
        {description || 'Check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {Icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon />
        </span>
      )}
      <p className="text-base font-bold text-slate-800">{title}</p>
      {description && <p className="max-w-xs text-sm font-medium text-slate-500">{description}</p>}
    </div>
  )
}
