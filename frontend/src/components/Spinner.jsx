export default function Spinner({ className = 'h-4 w-4', light = false }) {
  return (
    <svg
      className={`animate-spin ${className} ${light ? 'text-white' : 'text-current'}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
