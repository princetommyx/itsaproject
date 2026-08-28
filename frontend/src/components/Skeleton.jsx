export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
}

export function SkeletonStatCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-slate-100 p-5">
          <div className="h-2.5 w-16 rounded bg-slate-200/80" />
          <div className="mt-3 h-6 w-10 rounded bg-slate-200/80" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonHero() {
  return (
    <div className="animate-pulse rounded-2xl bg-slate-200/60 p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="h-4 w-40 rounded bg-slate-300/60" />
        <div className="h-9 w-16 rounded bg-slate-300/60" />
      </div>
    </div>
  )
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60 ${className}`}>
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-100" style={{ width: `${88 - i * 14}%` }} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonCardGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/60">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="h-4 w-2/3 rounded bg-slate-200" />
            <div className="h-5 w-16 shrink-0 rounded-full bg-slate-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ rows = 4 }) {
  return (
    <ul className="animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-200" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
          <div className="h-5 w-16 shrink-0 rounded-full bg-slate-100" />
        </li>
      ))}
    </ul>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-4 border-b border-slate-100 pb-2">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-2.5 flex-1 rounded bg-slate-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 flex-1 rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  )
}
