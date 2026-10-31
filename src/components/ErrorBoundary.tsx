import { Component, type ReactNode } from 'react'

type State = { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main style={{ padding: 24 }}>
        <p>Something went sideways.</p>
        <a href="/" style={{ color: 'var(--tide)' }}>
          Back to the start
        </a>
      </main>
    )
  }
}
