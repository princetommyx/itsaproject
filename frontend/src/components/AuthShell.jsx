import upsaLogo from '../assets/upsa-logo.png'

// A stand-in campus hero photo (blue sky, white academic building) — swap
// for UPSA's own campus photography whenever it's available.
const BACKGROUND_URL =
  'https://images.unsplash.com/photo-1770146605163-c33ab65ea9fa?auto=format&fit=crop&w=1600&q=80'

export default function AuthShell({ children, cardClassName = 'max-w-sm' }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-200 bg-cover bg-center px-4 py-12"
      style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
    >
      <div className={`w-full rounded-2xl bg-white p-8 text-center shadow-2xl ${cardClassName}`}>
        <img src={upsaLogo} alt="UPSA" className="mx-auto mb-6 h-14 w-auto" />
        {children}
      </div>
    </div>
  )
}
