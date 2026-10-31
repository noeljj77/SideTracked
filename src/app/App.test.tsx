import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

const json = (body: unknown) => new Response(JSON.stringify(body))

beforeEach(() => {
  window.history.pushState({}, '', '/')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('rest_v1')
        ? json({
            title: 'Octopus',
            extract: 'Eight arms.',
            type: 'standard',
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Octopus' } },
          })
        : json({ query: { search: [{ title: 'Squid' }, { title: 'Cuttlefish' }] } }),
    ),
  )
})

afterEach(() => vi.unstubAllGlobals())

it('search opens a topic with its summary and neighbours, and a neighbour can be followed', async () => {
  render(<App />)
  await userEvent.type(screen.getByLabelText('Topic'), 'Octopus{Enter}')
  expect(await screen.findByText('Eight arms.')).toBeInTheDocument()

  await userEvent.click(await screen.findByRole('link', { name: 'Go to Squid' }))
  expect(window.location.pathname).toBe('/explore/Squid')
})
