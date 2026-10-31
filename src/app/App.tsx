import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '@/api/wikipedia/errors'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AccountOverlay } from '@/features/account/AccountOverlay'
import { initAccount } from '@/features/account/account'
import { CommandBar } from '@/features/search/CommandBar'
import { TrailsOverlay } from '@/features/trail/TrailsOverlay'
import { useShortcuts } from '@/hooks/useShortcuts'
import { Collide } from '@/routes/Collide/Collide'
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
  useEffect(initAccount, [])
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore/:topic" element={<Explore />} />
        <Route path="/collide" element={<Collide />} />
      </Routes>
      {overlay === 'command' && <CommandBar />}
      {overlay === 'trails' && <TrailsOverlay />}
      {overlay === 'account' && <AccountOverlay />}
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
