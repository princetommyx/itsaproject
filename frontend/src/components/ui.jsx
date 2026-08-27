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

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
      <input
        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-upsa-blue ${
          error ? 'border-red-400' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

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

export function Badge({ status }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-700',
    submitted_unassigned: 'bg-amber-100 text-amber-800',
    pending: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    refine: 'bg-red-100 text-red-800',
    open: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-emerald-100 text-emerald-800',
  }

  const labels = {
    draft: 'Draft',
    submitted_unassigned: 'Awaiting Assignment',
    pending: 'Under Review',
    approved: 'Approved',
    refine: 'Needs Refinement',
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  }

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {labels[status] || status}
    </span>
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
