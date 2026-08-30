import { forwardRef } from 'react'
import Spinner from './Spinner'
import { cn } from '../lib/cn'

export function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-[15px] font-medium break-words text-foreground">{value || '—'}</p>
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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{children}</h1>
        {description && <p className="mt-1.5 text-[15px] font-medium text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

// Tints rather than flat pastels, so the same palette works on a light or a
// dark card without a second set of values.
const AVATAR_PALETTE = [
  // The 700 step, not 600: initials are small text, and against a 15% tint the
  // lighter step lands around 3.3:1 — under AA.
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
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
      className={cn(
        // The template's surface: a generous radius and a hairline ring rather
        // than a heavy border, so cards read as raised paper on the muted page.
        'rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-border shadow-sm',
        interactive &&
          'transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/20',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const variants = {
    primary: 'bg-brand text-brand-foreground shadow-sm hover:brightness-110',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
    outline: 'border-2 border-brand-ink bg-transparent text-brand-ink hover:bg-brand/5',
    danger: 'bg-destructive text-destructive-foreground shadow-sm hover:brightness-110',
    success: 'bg-success text-white shadow-sm hover:brightness-110',
  }
  // Outline and secondary both draw dark text on a light ground, so their
  // spinner needs to be dark too.
  const light = !['secondary', 'outline'].includes(variant)

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-150 outline-none active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variants[variant],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5" light={light} />}
      {children}
    </button>
  )
}

const FIELD_CLASSES =
  'w-full rounded-lg border bg-background px-3 py-2.5 text-[15px] font-medium text-foreground transition duration-150 placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>}
      <input
        ref={ref}
        className={`${FIELD_CLASSES} ${
          error
            ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/20'
            : 'border-input hover:border-ring/60 focus:border-brand-ink focus:ring-ring/25'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span>}
    </label>
  )
})

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>}
      <textarea
        className={`${FIELD_CLASSES} ${
          error
            ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/20'
            : 'border-input hover:border-ring/60 focus:border-brand-ink focus:ring-ring/25'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-semibold text-destructive">{error}</span>}
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
  // Version statuses. A version carries its own state independently of the
  // project's: an approved project still has a v1.0 that was sent back.
  submitted: 'Submitted',
  under_review: 'Under Review',
  revision_required: 'Revision Required',
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
  submitted: 'gold',
  under_review: 'blue',
  revision_required: 'pink',
}

const BADGE_STYLES = {
  slate: 'bg-muted text-muted-foreground',
  gold: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  pink: 'bg-pink-500/15 text-pink-600 dark:text-pink-300',
}

const DOT_STYLES = {
  slate: 'bg-muted-foreground',
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
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  gold: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  slate: 'bg-muted text-muted-foreground',
}

export function StatCard({ label, value, variant = 'blue', className = '', style }) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-2xl p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5',
        STAT_CARD_STYLES[variant] || STAT_CARD_STYLES.blue,
        className
      )}
    >
      <p className="text-xs font-bold tracking-wide uppercase opacity-85">{label}</p>
      <p className="mt-3 text-xl font-extrabold break-words sm:text-2xl">{value}</p>
    </div>
  )
}

export function HeroStatCard({ label, value, caption }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-sidebar-gradient p-6 text-white shadow-lg">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gold/25 blur-3xl"
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
    error: 'border-destructive/25 bg-destructive/10 text-destructive',
    success: 'border-success/25 bg-success/10 text-success',
    info: 'border-brand-ink/25 bg-brand/10 text-brand-ink',
  }

  return (
    <div className={`rounded-xl border px-3.5 py-3 text-sm font-medium ${variants[variant]}`}>{children}</div>
  )
}

export function ErrorState({ title = "Couldn't load this", description, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl text-destructive">
        !
      </span>
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="max-w-xs text-sm font-medium text-muted-foreground">
        {description || 'Check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-accent"
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
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon />
        </span>
      )}
      <p className="text-base font-bold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm font-medium text-muted-foreground">{description}</p>}
    </div>
  )
}
