import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { ErrorBoundary } from '../features/shell/ErrorBoundary'
import type { AppStore } from './store'

export function Providers({ store, children }: { store: AppStore; children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Provider store={store}>{children}</Provider>
    </ErrorBoundary>
  )
}
