import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSavedTrails } from '@/stores/savedTrailsStore'
import { useTrail } from '@/stores/trailStore'
import { useUi } from '@/stores/uiStore'
import { App } from './App'

const json = (body: unknown) => new Response(JSON.stringify(body))

beforeEach(() => {
  window.history.pushState({}, '', '/')
  useTrail.setState({ steps: [] })
  useSavedTrails.setState({ trails: [] })
  useUi.setState({ overlay: null })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('search/title')) {
        return json({ pages: [{ title: 'Squid', description: 'Cephalopod' }] })
      }
      if (url.includes('pageprops')) return json({ query: { pages: {} } })
      if (url.includes('rest_v1')) {
        return json({
          title: 'Octopus',
          extract: 'Eight arms.',
          type: 'standard',
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Octopus' } },
        })
      }
      return json({ query: { search: [{ title: 'Squid' }, { title: 'Cuttlefish' }] } })
    }),
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

it('Ctrl K opens the command bar and Enter jumps to the highlighted topic', async () => {
  render(<App />)
  await userEvent.keyboard('{Control>}k{/Control}')
  await userEvent.type(await screen.findByRole('combobox'), 'squ')
  expect(await screen.findByRole('option', { name: /Squid/ })).toBeInTheDocument()
  await userEvent.keyboard('{Enter}')
  expect(window.location.pathname).toBe('/explore/Squid')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('Escape closes an overlay', async () => {
  render(<App />)
  await userEvent.keyboard('/')
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('starting a new trail from the landing page keeps the old one in Your trails, and it can be reopened', async () => {
  useTrail.setState({ steps: ['Octopus', 'Squid', 'Ink'] })
  render(<App />)
  await userEvent.type(screen.getByLabelText('Topic'), 'Jazz{Enter}')
  expect(useSavedTrails.getState().trails.map((t) => t.steps)).toEqual([['Octopus', 'Squid', 'Ink']])
  expect(useTrail.getState().steps).toEqual(['Jazz'])

  await userEvent.click(await screen.findByRole('button', { name: 'Trails' }))
  await userEvent.click(await screen.findByRole('button', { name: /Octopus → Ink/ }))
  expect(window.location.pathname).toBe('/explore/Ink')
  expect(useTrail.getState().steps).toEqual(['Octopus', 'Squid', 'Ink'])
})
