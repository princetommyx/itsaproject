import DotSpinner from './DotSpinner'

export default function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted">
      <DotSpinner size={56} />
      <p className="text-sm font-medium text-muted-foreground">Loading UPSA FYP System...</p>
    </div>
  )
}
