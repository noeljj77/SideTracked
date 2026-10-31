import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '@/api/wikipedia/errors'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Explore } from '@/routes/Explore/Explore'
import { Landing } from '@/routes/Landing/Landing'

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

export function App() {
  const [client] = useState(makeClient)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/explore/:topic" element={<Explore />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
