import DotSpinner from './DotSpinner'

export default function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <DotSpinner size={56} />
      <p className="text-sm font-medium text-slate-400">Loading UPSA FYP System...</p>
    </div>
  )
}
