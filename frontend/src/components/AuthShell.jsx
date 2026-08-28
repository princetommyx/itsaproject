import upsaLogo from '../assets/upsa-logo.png'
import campusBackground from '../assets/upsa-campus.jpg'

export default function AuthShell({ children, cardClassName = 'max-w-sm' }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-200 bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: `url(${campusBackground})` }}
    >
      <div className={`w-full rounded-2xl bg-white p-8 text-center shadow-2xl ${cardClassName}`}>
        <img src={upsaLogo} alt="UPSA" className="mx-auto mb-6 h-14 w-auto" />
        {children}
      </div>
    </div>
  )
}
