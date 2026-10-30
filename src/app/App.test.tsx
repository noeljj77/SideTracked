import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

it('searching a topic opens its workspace', async () => {
  render(<App />)
  await userEvent.type(screen.getByLabelText('Topic'), 'Octopus{Enter}')
  expect(await screen.findByRole('heading', { name: 'Octopus' })).toBeInTheDocument()
})
