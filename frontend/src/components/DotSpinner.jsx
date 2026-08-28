const DOTS = Array.from({ length: 8 })

// Alternating blue/violet, matching the brand palette instead of a generic gray spinner.
const COLORS = ['#3b82f6', '#8b5cf6']

export default function DotSpinner({ size = 48, className = '' }) {
  const dotSize = size * 0.22
  const radius = size * 0.37

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} role="status" aria-label="Loading">
      {DOTS.map((_, i) => {
        const angle = (360 / DOTS.length) * i
        const delay = -(i / DOTS.length) * 1.2

        return (
          <span
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{ transform: `rotate(${angle}deg) translate(${radius}px)` }}
          >
            <span
              className="animate-dot-pulse block rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                marginLeft: -dotSize / 2,
                marginTop: -dotSize / 2,
                backgroundColor: COLORS[i % COLORS.length],
                animationDelay: `${delay}s`,
              }}
            />
          </span>
        )
      })}
    </div>
  )
}
