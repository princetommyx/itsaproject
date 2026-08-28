import upsaLogo from '../assets/upsa-logo.png'

export default function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-upsa-blue" />
        <img src={upsaLogo} alt="" className="h-9 w-9 rounded-sm" />
      </div>
      <p className="text-sm font-medium text-slate-400">Loading UPSA FYP System...</p>
    </div>
  )
}
