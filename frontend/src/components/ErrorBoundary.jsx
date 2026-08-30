import { Component } from 'react'

/**
 * Last line of defence against a white screen. A render error anywhere in a
 * page used to unmount the whole tree and leave the user staring at nothing,
 * with no clue that reloading wouldn't help. This catches it and offers a way
 * out instead.
 *
 * Keyed on the route in Layout, so navigating away clears a failed page
 * rather than leaving the error stuck until a manual reload.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Surfaced in the browser console for debugging; there's no error
    // reporting service wired up to send it to.
    console.error('Page crashed:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-base font-bold text-foreground">This page didn&apos;t load properly</p>
        <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-muted-foreground">
          Something went wrong while displaying it. Try again, and if it keeps happening let your
          administrator know.
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Try Again
        </button>
      </div>
    )
  }
}
