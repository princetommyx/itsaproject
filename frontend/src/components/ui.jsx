import { forwardRef } from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-upsa-blue text-white hover:bg-upsa-blue-dark',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }

  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
      <input
        ref={ref}
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-upsa-blue ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
})

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
      <textarea
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-upsa-blue ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
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
  gold: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  violet: 'bg-violet-100 text-violet-800',
  pink: 'bg-pink-100 text-pink-800',
}

export function Badge({ status }) {
  const variant = STATUS_VARIANTS[status] || 'slate'

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLES[variant]}`}>
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

export function StatCard({ label, value, variant = 'blue' }) {
  return (
    <div className={`rounded-2xl p-5 ${STAT_CARD_STYLES[variant] || STAT_CARD_STYLES.blue}`}>
      <p className="text-xs font-medium tracking-wide uppercase opacity-70">{label}</p>
      <p className="mt-3 text-2xl font-bold break-words">{value}</p>
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
    <div className={`rounded-md border px-3 py-2 text-sm ${variants[variant]}`}>{children}</div>
  )
}
