import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="grid min-h-screen place-items-center bg-cream px-4 text-center">
          <div className="max-w-md">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-100 text-2xl">!</div>
            <h1 className="mt-5 text-3xl font-black">Something went wrong</h1>
            <p className="mt-3 text-black/55">The page hit an unexpected problem. Your cart is safe, so try loading it again.</p>
            <button className="btn-primary mt-6" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
