import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '@/api/wikipedia/errors'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CommandBar } from '@/features/search/CommandBar'
import { TrailsOverlay } from '@/features/trail/TrailsOverlay'
import { useShortcuts } from '@/hooks/useShortcuts'
import { Explore } from '@/routes/Explore/Explore'
import { Landing } from '@/routes/Landing/Landing'
import { useUi } from '@/stores/uiStore'

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, err) => !(err instanceof ApiError && err.kind === 'NotFound') && count < 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

function Shell() {
  const overlay = useUi((s) => s.overlay)
  useShortcuts()
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore/:topic" element={<Explore />} />
      </Routes>
      {overlay === 'command' && <CommandBar />}
      {overlay === 'trails' && <TrailsOverlay />}
    </>
  )
}

export function App() {
  const [client] = useState(makeClient)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
