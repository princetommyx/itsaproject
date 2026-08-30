import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names, letting later Tailwind classes win over earlier ones of
 * the same kind. Plain string concatenation can't do that: `px-4` and `px-2`
 * both land in the class list and the winner is whichever CSS rule happens to
 * come later in the stylesheet, not the one the caller passed.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
